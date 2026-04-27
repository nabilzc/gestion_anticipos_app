"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
    ArrowLeft, 
    Upload, 
    FileText, 
    Image as ImageIcon, 
    File as FileIcon,
    Download, 
    CheckCircle2, 
    AlertCircle, 
    Trash2, 
    Loader2,
    Camera,
    Plus,
    X,
    Save
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { formatCurrency, formatDate } from "@/lib/utils/businessLogic";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { saveAs } from "file-saver";
import { sendLegalizationFinanceNotification } from "@/app/actions/sendEmail";
import { numeroALetras } from "@/lib/utils/numeroALetras";

interface SupportFile {
    file: File;
    preview: string;
    type: string;
    description: string;
    isUploading: boolean;
    url?: string;
}

export default function LegalizacionPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [anticipo, setAnticipo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [supports, setSupports] = useState<SupportFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);
    const [selectedTemplate, setSelectedTemplate] = useState("FORMATO_GASTOS_GENERAL");
    const [uploadedExcel, setUploadedExcel] = useState<File | null>(null);

    useEffect(() => {
        async function fetchAnticipo() {
            if (!id || !user) return;
            try {
                const { data, error } = await supabase
                    .from("anticipos")
                    .select("*, profiles:solicitante_id(full_name)")
                    .eq("id", id)
                    .single();

                if (error) throw error;
                
                // Solo se puede legalizar si está Desembolsado o Abierto
                if (data.status !== 'Desembolsado' && data.status !== 'Abierto') {
                    toast.error("Este anticipo no puede ser legalizado en su estado actual");
                    router.push("/mis-anticipos");
                    return;
                }

                setAnticipo(data);
            } catch (err) {
                console.error(err);
                toast.error("Error al cargar la información");
            } finally {
                setLoading(false);
            }
        }
        fetchAnticipo();
    }, [id, user, router]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newSupports: SupportFile[] = files.map(file => ({
            file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
            type: file.type,
            description: '',
            isUploading: false
        }));
        setSupports([...supports, ...newSupports]);
    };

    const handleExcelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv') || file.type.includes('excel') || file.type.includes('spreadsheetml')) {
            setUploadedExcel(file);
            
            // Lógica de Carga y Lectura usando xlsx
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws);
                    console.log(`Excel procesado, ${data.length} filas encontradas para ID_Anticipo: ${id}`);
                    toast.success(`Excel cargado y analizado correctamente (${data.length} registros)`);
                } catch (err) {
                    console.error("Error procesando excel:", err);
                    toast.success("Excel cargado correctamente (sin pre-análisis)");
                }
            };
            reader.readAsBinaryString(file);
        } else {
            toast.error("Por favor sube un archivo Excel o CSV válido");
        }
    };

    const handleCuentaCobroSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const newSupport: SupportFile = {
            file,
            preview: '',
            type: file.type,
            description: 'Cuenta de Cobro Firmada',
            isUploading: false
        };
        setSupports([...supports, newSupport]);
        toast.success("Cuenta de Cobro vinculada correctamente");
    };

    const removeSupport = (index: number) => {
        const newSupports = [...supports];
        if (newSupports[index].preview) URL.revokeObjectURL(newSupports[index].preview);
        newSupports.splice(index, 1);
        setSupports(newSupports);
    };

    const updateDescription = (index: number, text: string) => {
        const newSupports = [...supports];
        newSupports[index].description = text;
        setSupports(newSupports);
    };

    const uploadToSupabase = async (support: SupportFile): Promise<string> => {
        const fileName = `${Date.now()}_${support.file.name.replace(/\s/g, '_')}`;
        const filePath = `${id}/${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('legalizaciones')
            .upload(filePath, support.file);

        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
            .from('legalizaciones')
            .getPublicUrl(filePath);
            
        return publicUrl;
    };

    const downloadExcelTemplate = () => {
        const fileUrl = `/formatos/${selectedTemplate}.xlsx`;
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = `${selectedTemplate}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Formato Excel descargado`);
    };



    const handleFinalSubmit = async () => {
        if (supports.length === 0) {
            toast.error("Debes cargar al menos un soporte");
            return;
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading("Finalizando legalización...");

        try {
            // 1. Subir todos los archivos a Storage
            const uploadedUrls = [];
            
            if (uploadedExcel) {
                const fileName = `${Date.now()}_Excel_${uploadedExcel.name.replace(/\s/g, '_')}`;
                const filePath = `${id}/${fileName}`;
                await supabase.storage.from('legalizaciones').upload(filePath, uploadedExcel);
                const { data: { publicUrl } } = supabase.storage.from('legalizaciones').getPublicUrl(filePath);
                uploadedUrls.push({
                    url: publicUrl,
                    description: 'Excel Relación de Gastos',
                    type: uploadedExcel.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
            }

            for (let i = 0; i < supports.length; i++) {
                const url = await uploadToSupabase(supports[i]);
                uploadedUrls.push({
                    url,
                    description: supports[i].description,
                    type: supports[i].type
                });
            }

            // 2. Actualizar estado del anticipo y guardar metadata de soportes
            const { error: updateError } = await supabase
                .from("anticipos")
                .update({ 
                    status: 'En Revisión', // Cambio de 'Legalizado' a 'En Revisión' según solicitud
                    metadata_legalizacion: {
                        fecha_carga: new Date().toISOString(),
                        soportes: uploadedUrls
                    }
                })
                .eq("id", id);

            if (updateError) throw updateError;

            // 3. Notificar a Finanzas
            await sendLegalizationFinanceNotification({
                id: id as string,
                solicitante_nombre: anticipo.profiles?.full_name || "Usuario",
                monto_total: anticipo.monto_total
            });

            toast.success("¡Legalización enviada exitosamente! 🎉", { id: loadingToast });
            router.push("/mis-anticipos");
        } catch (err: any) {
            console.error(err);
            toast.error(`Error: ${err.message}`, { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
            <Toaster position="top-right" />
            
            {/* Header */}
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)' }}>
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: '800' }}>Legalización de Gastos</h1>
                    <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Anticipo #ANT-{id} • {formatCurrency(anticipo.monto_total)}</p>
                </div>
            </div>

            {/* Input oculto para carga de archivos */}
            <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                accept="image/*,application/pdf,.xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                capture="environment"
            />

            {/* Input oculto para Cuenta de Cobro (Solo PDF) */}
            <input 
                ref={pdfInputRef}
                type="file" 
                accept="application/pdf"
                onChange={handleCuentaCobroSelect}
                style={{ display: 'none' }}
            />

            {/* Input oculto para Excel */}
            <input 
                ref={excelInputRef}
                type="file" 
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleExcelSelect}
                style={{ display: 'none' }}
            />

            {/* 1. Gestión de Documentos Especiales */}
            <div style={{ padding: '0 20px', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>1. Gestión de Documentos Especiales</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>RELACIÓN DE GASTOS</span>
                                {uploadedExcel && (
                                    <CheckCircle2 size={14} color="#16a34a" />
                                )}
                            </div>
                        </div>
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#fff' }}
                        >
                            <option value="FORMATO_GASTOS_GENERAL">Gastos Generales</option>
                            <option value="FORMATO_GASTOS_PAS">Gastos PAS</option>
                            <option value="FORMATO_GASTOS_TARJETAS">Gastos Tarjetas</option>
                        </select>
                        <button 
                            onClick={downloadExcelTemplate}
                            className="primary-button"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', fontSize: '12px' }}
                        >
                            <Download size={16} /> Descargar Plantilla
                        </button>
                        <button 
                            onClick={() => excelInputRef.current?.click()}
                            className="secondary-button"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', fontSize: '12px' }}
                        >
                            <Upload size={16} /> {uploadedExcel ? "Cambiar Excel" : "Cargar Excel"}
                        </button>
                        {uploadedExcel && (
                            <div style={{ fontSize: '11px', color: '#16a34a', textAlign: 'center', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {uploadedExcel.name}
                            </div>
                        )}
                    </div>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>CUENTA DE COBRO</span>
                                {supports.some(s => s.description === 'Cuenta de Cobro Firmada') && (
                                    <CheckCircle2 size={14} color="#16a34a" />
                                )}
                            </div>
                            <div style={{ padding: '2px 6px', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>SOLO PDF</div>
                        </div>
                        <a 
                            href="/formatos/MODELO_CUENTA_DE_COBRO.docx"
                            download="MODELO_CUENTA_DE_COBRO.docx"
                            className="primary-button"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', fontSize: '12px', textDecoration: 'none' }}
                        >
                            <FileText size={16} /> Descargar modelo
                        </a>
                        <button 
                            onClick={() => pdfInputRef.current?.click()}
                            className="secondary-button"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', fontSize: '12px' }}
                        >
                            <Upload size={16} /> Cargar PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Carga Multimedia */}
            <div style={{ padding: '0 20px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Panel de Carga Multimedia</h2>
                    <span style={{ fontSize: '11px', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>PLAZO: 5 DÍAS HÁBILES</span>
                </div>
                
                <div style={{ background: '#fff', border: '2px dashed #cbd5e1', borderRadius: '24px', padding: '32px 20px', textAlign: 'center' }}>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        style={{ 
                            width: '80px', 
                            height: '80px', 
                            borderRadius: '50%', 
                            background: 'var(--primary)', 
                            color: '#fff', 
                            border: 'none', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: '0 auto 16px',
                            boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)',
                            cursor: 'pointer'
                        }}
                    >
                        <Camera size={32} />
                    </button>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>Cargar Fotos o Recibos</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Usa la cámara de tu móvil para capturar tus soportes instantáneamente o selecciona archivos PDF.</p>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        style={{ padding: '10px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                    >
                        Seleccionar Archivos
                    </button>
                </div>

                {/* Lista de Soportes Cargados */}
                <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {supports.map((s, idx) => (
                        <div key={idx} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                                    {s.preview ? (
                                        <img src={s.preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <FileIcon size={24} color="#94a3b8" />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.file.name}</div>
                                        <button onClick={() => removeSupport(idx)} style={{ background: 'none', border: 'none', color: '#ef4444' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Concepto del gasto (ej: Almuerzo día 1)"
                                        value={s.description}
                                        onChange={(e) => updateDescription(idx, e.target.value)}
                                        style={{ width: '100%', marginTop: '8px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sticky Action Button */}
            <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '16px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', gap: '12px' }}>
                <button 
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting || supports.length === 0}
                    style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '10px', 
                        background: '#1e293b', 
                        color: '#fff', 
                        border: 'none', 
                        padding: '14px', 
                        borderRadius: '16px', 
                        fontWeight: '700', 
                        fontSize: '15px', 
                        cursor: (isSubmitting || supports.length === 0) ? 'not-allowed' : 'pointer',
                        opacity: (isSubmitting || supports.length === 0) ? 0.7 : 1
                    }}
                >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    Finalizar Legalización
                </button>
            </div>
        </div>
    );
}
