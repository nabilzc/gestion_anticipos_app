"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
    ArrowLeft, Upload, FileText, Image as ImageIcon, File as FileIcon,
    Download, CheckCircle2, AlertCircle, Trash2, Loader2, Camera, Plus, X, Save, Wallet,
    User, MapPin, CreditCard, Calendar, ClipboardList
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { formatCurrency, formatDate } from "@/lib/utils/businessLogic";
import * as XLSX from 'xlsx';

interface SupportFile {
    file: File;
    preview: string;
    type: string;
    description: string;
    isUploading: boolean;
    url?: string;
}

export default function LegalizacionDirectaDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [anticipo, setAnticipo] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [supports, setSupports] = useState<SupportFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);
    const [selectedTemplate, setSelectedTemplate] = useState("FORMATO_GASTOS_GENERAL");
    const [uploadedExcel, setUploadedExcel] = useState<File | null>(null);
    const [uploadedCuentaCobro, setUploadedCuentaCobro] = useState<File | null>(null);

    useEffect(() => {
        async function fetchData() {
            if (!id || !user) return;
            try {
                const { data, error } = await supabase
                    .from("anticipos")
                    .select("*, profiles:solicitante_id(full_name, email)")
                    .eq("id", id)
                    .single();

                if (error) throw error;
                setAnticipo(data);

                // Cargar items
                const { data: itemsData } = await supabase
                    .from("anticipo_items")
                    .select("*")
                    .eq("anticipo_id", id);
                
                setItems(itemsData || []);
            } catch (err) {
                console.error(err);
                toast.error("Error al cargar la información");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id, user]);

    // File handlers
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newSupports: SupportFile[] = files.map(file => ({
            file, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
            type: file.type, description: '', isUploading: false
        }));
        setSupports([...supports, ...newSupports]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleExcelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv') || file.type.includes('excel') || file.type.includes('spreadsheetml')) {
            setUploadedExcel(file);
            toast.success("Excel cargado correctamente");
        } else {
            toast.error("Por favor sube un archivo Excel o CSV válido");
        }
    };

    const handleCuentaCobroSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadedCuentaCobro(file);
        toast.success("Cuenta de Cobro seleccionada");
    };

    const removeExcel = () => { setUploadedExcel(null); if (excelInputRef.current) excelInputRef.current.value = ''; };
    const removeCuentaCobro = () => { setUploadedCuentaCobro(null); if (pdfInputRef.current) pdfInputRef.current.value = ''; };
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

    const downloadExcelTemplate = () => {
        const fileUrl = `/formatos/${selectedTemplate}.xlsx`;
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = `${selectedTemplate}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Formato Excel descargado");
    };

    const handleAddMoreSupports = async () => {
        if (supports.length === 0 && !uploadedExcel && !uploadedCuentaCobro) {
            toast.error("Selecciona al menos un archivo");
            return;
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading("Cargando documentos adicionales...");

        try {
            const uploadedUrls: any[] = [];
            const existingSoportes = anticipo?.metadata_legalizacion?.soportes || [];

            if (uploadedExcel) {
                const safeName = uploadedExcel.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const fileName = `${Date.now()}_Excel_${safeName}`;
                const filePath = `${id}/${fileName}`;
                const { error } = await supabase.storage.from('legalizaciones').upload(filePath, uploadedExcel, { upsert: false });
                if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from('legalizaciones').getPublicUrl(filePath);
                    uploadedUrls.push({ url: publicUrl, description: 'Excel Relación de Gastos', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                }
            }

            if (uploadedCuentaCobro) {
                const safeName = uploadedCuentaCobro.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const fileName = `${Date.now()}_CuentaCobro_${safeName}`;
                const filePath = `${id}/${fileName}`;
                const { error } = await supabase.storage.from('legalizaciones').upload(filePath, uploadedCuentaCobro, { upsert: false });
                if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from('legalizaciones').getPublicUrl(filePath);
                    uploadedUrls.push({ url: publicUrl, description: 'Cuenta de Cobro Firmada', type: 'application/pdf' });
                }
            }

            for (const s of supports) {
                const safeName = s.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const fileName = `${Date.now()}_${safeName}`;
                const filePath = `${id}/${fileName}`;
                const { error } = await supabase.storage.from('legalizaciones').upload(filePath, s.file);
                if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from('legalizaciones').getPublicUrl(filePath);
                    uploadedUrls.push({ url: publicUrl, description: s.description, type: s.type });
                }
            }

            const allSoportes = [...existingSoportes, ...uploadedUrls];

            await supabase
                .from("anticipos")
                .update({
                    metadata_legalizacion: {
                        ...anticipo?.metadata_legalizacion,
                        fecha_actualizacion: new Date().toISOString(),
                        soportes: allSoportes,
                        tipo: 'legalizacion_directa'
                    }
                })
                .eq("id", id);

            toast.success("Documentos adicionales cargados ✅", { id: loadingToast });
            setSupports([]);
            setUploadedExcel(null);
            setUploadedCuentaCobro(null);

            // Refrescar datos
            const { data: refreshed } = await supabase.from("anticipos").select("*, profiles:solicitante_id(full_name, email)").eq("id", id).single();
            if (refreshed) setAnticipo(refreshed);
        } catch (err: any) {
            toast.error(`Error: ${err?.message || 'Desconocido'}`, { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { bg: string; color: string; label: string }> = {
            'En Revisión': { bg: '#fef3c7', color: '#92400e', label: '⏳ En Revisión' },
            'Aprobado': { bg: '#dcfce7', color: '#166534', label: '✅ Aprobado' },
            'Rechazado': { bg: '#fee2e2', color: '#991b1b', label: '❌ Rechazado' },
            'Reembolsado': { bg: '#dbeafe', color: '#1e40af', label: '💰 Reembolsado' },
            'Legalizado': { bg: '#f0fdf4', color: '#16a34a', label: '✅ Legalizado' },
        };
        return map[status] || { bg: '#f1f5f9', color: '#475569', label: status };
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    if (!anticipo) return (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h2>Legalización no encontrada</h2>
            <button onClick={() => router.push('/legalizaciones')} style={{ marginTop: '16px', padding: '10px 20px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                Volver a Legalizaciones
            </button>
        </div>
    );

    const badge = getStatusBadge(anticipo.status);
    const existingSoportes = anticipo?.metadata_legalizacion?.soportes || [];

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', paddingBottom: '100px' }}>
            <Toaster position="top-right" />

            {/* Hidden inputs */}
            <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" onChange={handleFileSelect} style={{ display: 'none' }} capture="environment" />
            <input ref={pdfInputRef} type="file" accept="application/pdf,application/msword,.doc,.docx" onChange={handleCuentaCobroSelect} style={{ display: 'none' }} />
            <input ref={excelInputRef} type="file" accept=".xlsx,.csv" onChange={handleExcelSelect} style={{ display: 'none' }} />

            {/* Header */}
            <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
                <button onClick={() => router.push('/legalizaciones')} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                    <ArrowLeft size={24} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Legalización Directa</h1>
                    <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', margin: '2px 0 0' }}>
                        #LD-{String(anticipo.id).substring(0, 8)} • {formatCurrency(anticipo.monto_total)}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ padding: '4px 12px', background: '#fef3c7', color: '#92400e', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
                        SIN ANTICIPO
                    </span>
                    <span style={{ padding: '4px 12px', background: badge.bg, color: badge.color, borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
                        {badge.label}
                    </span>
                </div>
            </div>

            {/* Info del Solicitante */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <User size={18} color="#64748b" />
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Información del Solicitante</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                    <div><span style={{ color: '#64748b', fontSize: '12px' }}>Nombre:</span><br/><strong>{anticipo.profiles?.full_name || 'N/A'}</strong></div>
                    <div><span style={{ color: '#64748b', fontSize: '12px' }}>Documento:</span><br/><strong>{anticipo.tipo_documento} {anticipo.numero_documento}</strong></div>
                    <div><span style={{ color: '#64748b', fontSize: '12px' }}>Cargo:</span><br/><strong>{anticipo.cargo || 'N/A'}</strong></div>
                    <div><span style={{ color: '#64748b', fontSize: '12px' }}>Contacto:</span><br/><strong>{anticipo.contacto || 'N/A'}</strong></div>
                    <div><span style={{ color: '#64748b', fontSize: '12px' }}>Proyecto:</span><br/><strong>{anticipo.proyecto || 'N/A'}</strong></div>
                    <div><span style={{ color: '#64748b', fontSize: '12px' }}>Aprobador:</span><br/><strong>{anticipo.aprobador_email || 'N/A'}</strong></div>
                </div>
            </div>

            {/* Info del Gasto */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <ClipboardList size={18} color="#64748b" />
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Detalle del Gasto</h3>
                </div>
                <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Concepto:</span>
                    <p style={{ margin: '4px 0 0', fontWeight: '500' }}>{anticipo.motivo}</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Fecha del gasto:</span>
                    <p style={{ margin: '4px 0 0', fontWeight: '500' }}>{anticipo.fecha_ejecucion ? formatDate(anticipo.fecha_ejecucion) : 'N/A'}</p>
                </div>

                {items.length > 0 && (
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ backgroundColor: 'var(--muted)' }}>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600', color: 'var(--muted-foreground)' }}>Tipo</th>
                                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600', color: 'var(--muted-foreground)' }}>Descripción</th>
                                    <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: '600', color: 'var(--muted-foreground)' }}>Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 14px' }}>{item.tipo_gasto}</td>
                                        <td style={{ padding: '10px 14px' }}>{item.descripcion}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(item.valor)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ marginTop: '16px', padding: '12px', background: '#fffbeb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fde68a' }}>
                    <span style={{ fontWeight: '600', color: '#92400e' }}>Total a reembolsar:</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{formatCurrency(anticipo.monto_total)}</span>
                </div>
            </div>

            {/* Info Bancaria */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <CreditCard size={18} color="#64748b" />
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Información para Reembolso</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '14px' }}>
                    <div><span style={{ color: '#64748b', fontSize: '12px' }}>Entidad:</span><br/><strong>{anticipo.banco_nombre || 'N/A'}</strong></div>
                    <div><span style={{ color: '#64748b', fontSize: '12px' }}>Tipo cuenta:</span><br/><strong>{anticipo.banco_tipo_cuenta || 'N/A'}</strong></div>
                    <div><span style={{ color: '#64748b', fontSize: '12px' }}>Número:</span><br/><strong>{anticipo.banco_numero_cuenta || 'N/A'}</strong></div>
                </div>
            </div>

            {/* Soportes Ya Cargados */}
            {existingSoportes.length > 0 && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <CheckCircle2 size={18} color="#16a34a" />
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Documentos Soporte Cargados ({existingSoportes.length})</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {existingSoportes.map((s: any, idx: number) => (
                            <a 
                                key={idx} 
                                href={s.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                                    background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0',
                                    textDecoration: 'none', color: '#1e293b', transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                                    {s.type?.includes('image') ? <ImageIcon size={20} /> : <FileText size={20} />}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.description || `Soporte ${idx + 1}`}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{s.type || 'Documento'}</div>
                                </div>
                                <Download size={16} color="#64748b" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Cargar más soportes (solo si está en revisión) */}
            {anticipo.status === 'En Revisión' && (
                <>
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                            Agregar Más Documentos
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            {/* Excel */}
                            <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>RELACIÓN DE GASTOS</span>
                                {uploadedExcel ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px', borderRadius: '8px', marginTop: '8px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadedExcel.name}</span>
                                        <button onClick={removeExcel} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => excelInputRef.current?.click()} className="secondary-button" style={{ width: '100%', padding: '8px', fontSize: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <Upload size={14} /> Cargar Excel
                                    </button>
                                )}
                            </div>
                            {/* Cuenta de Cobro */}
                            <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>CUENTA DE COBRO</span>
                                {uploadedCuentaCobro ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px', borderRadius: '8px', marginTop: '8px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadedCuentaCobro.name}</span>
                                        <button onClick={removeCuentaCobro} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => pdfInputRef.current?.click()} className="secondary-button" style={{ width: '100%', padding: '8px', fontSize: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <Upload size={14} /> Cargar PDF/Word
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Multimedia */}
                        <div style={{ background: '#fff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
                            <button onClick={() => fileInputRef.current?.click()} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(37,99,235,0.2)' }}>
                                <Camera size={24} />
                            </button>
                            <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>Cargar Fotos o Recibos</p>
                            <p style={{ fontSize: '12px', color: '#64748b' }}>Haz clic para seleccionar archivos</p>
                        </div>

                        {supports.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                {supports.map((s, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                            {s.preview ? <img src={s.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FileIcon size={18} color="#94a3b8" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>{s.file.name}</div>
                                            <input type="text" placeholder="Concepto..." value={s.description} onChange={(e) => updateDescription(idx, e.target.value)} style={{ width: '100%', marginTop: '4px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none' }} />
                                        </div>
                                        <button onClick={() => removeSupport(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {(supports.length > 0 || uploadedExcel || uploadedCuentaCobro) && (
                            <button
                                onClick={handleAddMoreSupports}
                                disabled={isSubmitting}
                                style={{
                                    width: '100%', padding: '12px', background: '#1e293b', color: '#fff',
                                    border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    opacity: isSubmitting ? 0.7 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Guardar Documentos Adicionales
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Firma */}
            {anticipo.firma_base64 && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Firma del Solicitante</h3>
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'inline-block' }}>
                        <img src={anticipo.firma_base64} alt="Firma" style={{ maxHeight: '80px', objectFit: 'contain' }} />
                    </div>
                </div>
            )}

            {/* Observaciones */}
            {anticipo.observaciones && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Observaciones</h3>
                    <p style={{ fontSize: '14px', color: '#334155' }}>{anticipo.observaciones}</p>
                </div>
            )}

            {/* Fechas */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', padding: '16px', fontSize: '12px', color: '#94a3b8' }}>
                <span>Creado: {formatDate(anticipo.created_at)}</span>
                {anticipo.metadata_legalizacion?.fecha_actualizacion && (
                    <span>Actualizado: {formatDate(anticipo.metadata_legalizacion.fecha_actualizacion)}</span>
                )}
            </div>
        </div>
    );
}
