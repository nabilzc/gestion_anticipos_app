"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, Info, Plus, Trash2, Save, Send, AlertCircle, Loader2, UserCheck, 
    Upload, Download, FileText, Camera, X, CheckCircle2, Image as ImageIcon, File as FileIcon
} from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import { numeroALetras } from "@/lib/utils/numeroALetras";
import { formatCurrency } from "@/lib/utils/businessLogic";
import toast, { Toaster } from "react-hot-toast";
import { sendDirectLegalizationNotification } from "@/app/actions/sendEmail";
import * as XLSX from 'xlsx';

type GastoItem = {
    id: string;
    tipoGasto: string;
    codigo: string;
    descripcion: string;
    valor: number;
};

interface SupportFile {
    file: File;
    preview: string;
    type: string;
    description: string;
    isUploading: boolean;
    url?: string;
}

export default function NuevaLegalizacionDirectaPage() {
    const { user } = useAuth();
    const router = useRouter();

    // Datos del solicitante
    const [fecha, setFecha] = useState("");
    const [tipoDocumento, setTipoDocumento] = useState("CC");
    const [numDocumento, setNumDocumento] = useState("");
    const [cargo, setCargo] = useState("");
    const [proyecto, setProyecto] = useState("");
    const [solicitanteProyecto, setSolicitanteProyecto] = useState("");
    const [contacto, setContacto] = useState("");

    // Datos del gasto
    const [concepto, setConcepto] = useState("");
    const [fechaGasto, setFechaGasto] = useState("");
    const [gastos, setGastos] = useState<GastoItem[]>([
        { id: "1", tipoGasto: "Viáticos", codigo: "", descripcion: "", valor: 0 }
    ]);
    const [observaciones, setObservaciones] = useState("");

    // Información bancaria
    const [banco, setBanco] = useState("");
    const [tipoCuenta, setTipoCuenta] = useState("Ahorros");
    const [numCuenta, setNumCuenta] = useState("");

    // Firmas
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [signatureTab, setSignatureTab] = useState<"upload" | "draw">("upload");

    // Soportes documentales
    const [supports, setSupports] = useState<SupportFile[]>([]);
    const [uploadedExcel, setUploadedExcel] = useState<File | null>(null);
    const [uploadedCuentaCobro, setUploadedCuentaCobro] = useState<File | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState("FORMATO_GASTOS_GENERAL");
    const [totalLegalizado, setTotalLegalizado] = useState<number | null>(null);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);

    // Aprobadores
    const [aprobadorPrincipal, setAprobadorPrincipal] = useState<string>("");
    const [aprobadorSuplente, setAprobadorSuplente] = useState<string>("");
    const [aprobadorSeleccionado, setAprobadorSeleccionado] = useState<string>("");

    // Maestros
    const [proyectosList, setProyectosList] = useState<any[]>([]);
    const [solicitantesList, setSolicitantesList] = useState<any[]>([]);
    const [simulatedUser, setSimulatedUser] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSolicitante, setIsSolicitante] = useState(true);

    // Paso actual del formulario
    const [currentStep, setCurrentStep] = useState(1);

    // Solicitante activo
    const solicitanteActivoProfile = simulatedUser || user?.profile;
    const solicitanteActivoEmail = simulatedUser ? simulatedUser.email : user?.email;
    const solicitanteActivoNombre = simulatedUser ? simulatedUser.full_name : (user?.user_metadata?.full_name || user?.email || "Usuario");
    const solicitanteActivoId = simulatedUser ? simulatedUser.id : user?.id;

    // Inicialización
    useEffect(() => {
        if (user && user.profile) {
            setIsSolicitante(user.profile.es_solicitante === true || user.email === 'nzapata@fundaec.org');
        }
    }, [user]);

    useEffect(() => {
        const today = new Date().toLocaleDateString("es-CO", {
            day: "2-digit", month: "2-digit", year: "numeric"
        });
        setFecha(today);
    }, []);

    // Cargar maestros
    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            const { data, error } = await supabase.from('programas_proyectos_areas').select('*').eq('activo', true);
            if (error) console.error("Error:", error);
            if (data) setProyectosList(data);
        };
        fetchData();
    }, [user]);

    // Cargar solicitantes para simulación
    useEffect(() => {
        if (!user) return;
        const fetchSolicitantes = async () => {
            const { data: authData, error: authError } = await supabase
                .from('perfiles_autorizados')
                .select('*')
                .eq('es_solicitante', true);

            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*');

            if (authError) console.error("Error:", authError);
            if (profilesError) console.error("Error:", profilesError);

            if (authData) {
                const combinedList = authData.map(auth => {
                    const realProfile = profilesData?.find(p => p.email?.toLowerCase() === auth.email?.toLowerCase());
                    return {
                        id: realProfile?.id || `auth-${auth.email}`,
                        email: auth.email,
                        full_name: auth.nombre_completo || realProfile?.full_name || auth.email,
                        cargo: realProfile?.cargo || "",
                        cedula: realProfile?.cedula || "",
                        telefono: realProfile?.telefono || "",
                        banco: realProfile?.banco || "",
                        tipo_cuenta: realProfile?.tipo_cuenta || "Ahorros",
                        numero_cuenta: realProfile?.numero_cuenta || "",
                        id_programa_area: auth.id_programa_area || null,
                        ids_programa_area: auth.ids_programa_area || []
                    };
                }).sort((a, b) => a.full_name.localeCompare(b.full_name));
                setSolicitantesList(combinedList);
            }
        };
        fetchSolicitantes();
    }, [user]);

    // Auto-cargar datos del perfil
    useEffect(() => {
        if (solicitanteActivoProfile) {
            setNumDocumento(solicitanteActivoProfile.cedula || "");
            setContacto(solicitanteActivoProfile.telefono || "");
            setBanco(solicitanteActivoProfile.banco || "");
            setTipoCuenta(solicitanteActivoProfile.tipo_cuenta || "Ahorros");
            setNumCuenta(solicitanteActivoProfile.numero_cuenta || "");

            const targetProjId = solicitanteActivoProfile.id_programa_area || 
                (solicitanteActivoProfile.ids_programa_area && solicitanteActivoProfile.ids_programa_area.length > 0 
                    ? solicitanteActivoProfile.ids_programa_area[0] 
                    : null);
            if (targetProjId) {
                setProyecto(targetProjId);
                setSolicitanteProyecto(targetProjId);
            } else {
                setProyecto("");
                setSolicitanteProyecto("");
            }

            let cargoFinal = solicitanteActivoProfile.cargo || "";
            if (!cargoFinal && targetProjId && proyectosList.length > 0) {
                const matchedProj = proyectosList.find(p => p.id === targetProjId);
                if (matchedProj && matchedProj.nombre) {
                    const parts = matchedProj.nombre.split(" > ");
                    cargoFinal = parts[parts.length - 1];
                }
            }
            setCargo(cargoFinal);
        } else {
            setCargo(""); setNumDocumento(""); setContacto("");
            setBanco(""); setTipoCuenta("Ahorros"); setNumCuenta("");
            setProyecto(""); setSolicitanteProyecto("");
        }
    }, [solicitanteActivoProfile, proyectosList]);

    // Auto-carga de aprobadores
    useEffect(() => {
        if (!solicitanteActivoEmail || !proyecto) {
            setAprobadorPrincipal(""); setAprobadorSuplente("");
            setAprobadorSeleccionado("");
            return;
        }
        const fetchAprobadores = async () => {
            const { data } = await supabase
                .from('perfiles_autorizados')
                .select('aprobador_email, aprobador_suplente_email')
                .eq('email', solicitanteActivoEmail)
                .single();
            const principal = data?.aprobador_email || "";
            const suplente = data?.aprobador_suplente_email || "";
            setAprobadorPrincipal(principal);
            setAprobadorSuplente(suplente);
            setAprobadorSeleccionado(principal);
        };
        fetchAprobadores();
    }, [proyecto, solicitanteActivoEmail]);

    const totalAnticipo = gastos.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
    const tiposGasto = ['Viáticos', 'Transporte', 'Materiales', 'Alimentación', 'Hospedaje', 'Servicios', 'Comunicaciones', 'Otros'];
    const bancos = ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA', 'Nequi', 'Daviplata', 'Banco Popular', 'Scotiabank Colpatria', 'Banco AV Villas', 'Otro'];

    // Handlers de gastos
    const handleAddGasto = () => {
        setGastos([...gastos, { id: Date.now().toString(), tipoGasto: "Viáticos", codigo: "", descripcion: "", valor: 0 }]);
    };
    const handleRemoveGasto = (id: string) => {
        if (gastos.length <= 1) return;
        setGastos(gastos.filter(g => g.id !== id));
    };
    const handleGastoChange = (id: string, field: keyof GastoItem, value: any) => {
        setGastos(gastos.map(g => (g.id === id ? { ...g, [field]: value } : g)));
    };

    // Handlers de archivos
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
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data: any[] = XLSX.utils.sheet_to_json(ws);
                    let extractedTotal = 0;
                    const keys = data.length > 0 ? Object.keys(data[0]) : [];
                    const amountKey = keys.find(k => k.toLowerCase().includes('valor') || k.toLowerCase().includes('monto') || k.toLowerCase().includes('total'));
                    if (amountKey) {
                        extractedTotal = data.reduce((sum, row) => sum + (Number(row[amountKey]) || 0), 0);
                    }
                    if (extractedTotal > 0) {
                        setTotalLegalizado(extractedTotal);
                        toast.success(`Excel analizado: ${data.length} registros. Total: ${formatCurrency(extractedTotal)}`);
                    } else {
                        toast.success(`Excel cargado (${data.length} registros)`);
                    }
                } catch (err) {
                    toast.success("Excel cargado correctamente");
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
        setUploadedCuentaCobro(file);
        toast.success("Cuenta de Cobro seleccionada");
    };

    const removeExcel = () => { setUploadedExcel(null); setTotalLegalizado(null); if (excelInputRef.current) excelInputRef.current.value = ''; };
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

    const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error("La imagen debe ser menor a 2MB"); return; }
        const reader = new FileReader();
        reader.onload = (ev) => { if (ev.target?.result) setSignatureData(ev.target.result as string); };
        reader.readAsDataURL(file);
    };

    const handleFillDummyData = () => {
        setNumDocumento("1020304050");
        setTipoDocumento("CC");
        if (!cargo) {
            if (user?.email === 'nzapata@fundaec.org') {
                setCargo("Director Administrativo y Financiero");
            } else {
                setCargo("Coordinador de Proyecto");
            }
        }
        
        if (!proyecto) {
            const primerValido = proyectosList.find(p => ["Programas", "Proyectos", "Área", "Dirección"].includes(p.tipo));
            if (primerValido) {
                setProyecto(primerValido.id);
                setSolicitanteProyecto(primerValido.id);
            }
        }
        setContacto("3001234567");
        setConcepto("Reembolso por gastos de alimentación y transporte para visitas de campo");
        setFechaGasto(new Date().toISOString().split('T')[0]);
        setGastos([
            { id: "1", tipoGasto: "Alimentación", codigo: "", descripcion: "Almuerzo de trabajo equipo técnico", valor: 65000 },
            { id: "2", tipoGasto: "Transporte", codigo: "", descripcion: "Taxis para desplazamientos urbanos", valor: 45000 }
        ]);
        setBanco("Bancolombia");
        setTipoCuenta("Ahorros");
        setNumCuenta("123-45678-01");
        setObservaciones("Prueba de legalización directa (sin anticipo). Favor ignorar.");
        setSignatureData("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
        toast.success("Campos de prueba completados");
    };

    // Validación
    const validateStep1 = () => {
        if (!numDocumento.trim()) return "Número de documento requerido";
        if (!contacto.trim()) return "Número de contacto requerido";
        if (!proyecto) return "Selecciona un programa, proyecto, área o dirección";
        if (!concepto.trim()) return "Concepto del gasto requerido";
        if (!fechaGasto) return "Fecha de los gastos requerida";
        const validGastos = gastos.some(g => (Number(g.valor) || 0) > 0);
        if (!validGastos) return "Agrega al menos un ítem de gasto con valor mayor a 0";
        return null;
    };

    const validateFull = () => {
        const step1Error = validateStep1();
        if (step1Error) return step1Error;
        if (!banco) return "Selecciona una entidad bancaria";
        if (!numCuenta.trim()) return "Número de cuenta requerido";
        if (supports.length === 0 && !uploadedExcel && !uploadedCuentaCobro) return "Debes cargar al menos un documento soporte";
        return null;
    };

    // Submit
    const handleSubmit = async () => {
        if (!user) { toast.error("Debes iniciar sesión"); return; }
        const errorStr = validateFull();
        if (errorStr) { toast.error(errorStr); return; }

        setIsSubmitting(true);
        const loadingToast = toast.loading("Enviando legalización directa...");

        try {
            // 1. Crear registro en anticipos con tipo legalizacion_directa
            const payload = {
                solicitante_id: (solicitanteActivoId && String(solicitanteActivoId).startsWith('auth-')) ? null : (solicitanteActivoId || null),
                status: 'En Revisión',
                tipo: 'legalizacion_directa',
                motivo: concepto,
                monto_total: totalAnticipo,
                monto_letras: numeroALetras(totalAnticipo),
                banco_nombre: banco,
                banco_tipo_cuenta: tipoCuenta,
                banco_numero_cuenta: numCuenta,
                fecha_ejecucion: fechaGasto,
                observaciones: observaciones,
                firma_base64: signatureData,
                tipo_documento: tipoDocumento,
                numero_documento: numDocumento,
                cargo: cargo,
                proyecto: proyectosList.find(p => p.id === proyecto)?.nombre || proyecto,
                contacto: contacto,
                aprobador_email: aprobadorSeleccionado || null
            };

            const { data: anticipoData, error: anticipoError } = await supabase
                .from('anticipos')
                .insert([payload])
                .select()
                .single();

            if (anticipoError) throw new Error(`Error: ${anticipoError.message}`);
            const anticipoId = anticipoData.id;

            // 2. Guardar items de gasto
            const itemsPayload = gastos.map(g => ({
                anticipo_id: anticipoId,
                tipo_gasto: g.tipoGasto,
                codigo: g.codigo,
                descripcion: g.descripcion,
                valor: Number(g.valor) || 0
            }));
            const { error: itemsError } = await supabase.from('anticipo_items').insert(itemsPayload);
            if (itemsError) console.error("Error items:", itemsError);

            // 3. Subir archivos a Storage
            const uploadedUrls: any[] = [];

            if (uploadedExcel) {
                const safeName = uploadedExcel.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const fileName = `${Date.now()}_Excel_${safeName}`;
                const filePath = `${anticipoId}/${fileName}`;
                const { error: excelErr } = await supabase.storage.from('legalizaciones').upload(filePath, uploadedExcel, { upsert: false });
                if (!excelErr) {
                    const { data: { publicUrl } } = supabase.storage.from('legalizaciones').getPublicUrl(filePath);
                    uploadedUrls.push({ url: publicUrl, description: 'Excel Relación de Gastos', type: uploadedExcel.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                }
            }

            if (uploadedCuentaCobro) {
                const safeName = uploadedCuentaCobro.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const fileName = `${Date.now()}_CuentaCobro_${safeName}`;
                const filePath = `${anticipoId}/${fileName}`;
                const { error: ccErr } = await supabase.storage.from('legalizaciones').upload(filePath, uploadedCuentaCobro, { upsert: false });
                if (!ccErr) {
                    const { data: { publicUrl } } = supabase.storage.from('legalizaciones').getPublicUrl(filePath);
                    uploadedUrls.push({ url: publicUrl, description: 'Cuenta de Cobro Firmada', type: uploadedCuentaCobro.type || 'application/pdf' });
                }
            }

            for (let i = 0; i < supports.length; i++) {
                const s = supports[i];
                const safeName = s.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const fileName = `${Date.now()}_${safeName}`;
                const filePath = `${anticipoId}/${fileName}`;
                const { error: supErr } = await supabase.storage.from('legalizaciones').upload(filePath, s.file);
                if (!supErr) {
                    const { data: { publicUrl } } = supabase.storage.from('legalizaciones').getPublicUrl(filePath);
                    uploadedUrls.push({ url: publicUrl, description: s.description, type: s.type });
                }
            }

            // 4. Actualizar metadata de legalización
            if (uploadedUrls.length > 0) {
                await supabase
                    .from("anticipos")
                    .update({
                        metadata_legalizacion: {
                            fecha_carga: new Date().toISOString(),
                            soportes: uploadedUrls,
                            tipo: 'legalizacion_directa'
                        }
                    })
                    .eq("id", anticipoId);
            }

            // 5. Notificar a Finanzas
            await sendDirectLegalizationNotification({
                id: anticipoId,
                solicitante_nombre: solicitanteActivoNombre,
                solicitante_email: solicitanteActivoEmail || "",
                motivo: concepto,
                monto_total: totalAnticipo
            });

            toast.success("¡Legalización directa enviada exitosamente! 🎉", { id: loadingToast });
            setTimeout(() => router.push("/legalizaciones"), 1500);
        } catch (err: any) {
            console.error("Error:", err);
            toast.error(`Error: ${err?.message || 'Desconocido'}`, { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderProyectoSelect = (value: any, onChange: (v: any) => void) => (
        <select 
            className="form-input" 
            value={value !== null && value !== undefined ? String(value) : ""} 
            onChange={e => onChange(e.target.value)} 
            style={{ width: '100%' }}
        >
            <option value="">— Seleccione —</option>
            {proyectosList.filter(p => p.tipo === "Dirección").length > 0 && (
                <optgroup label="Direcciones">
                    {[...proyectosList].filter(p => p.tipo === "Dirección").sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
                </optgroup>
            )}
            {proyectosList.filter(p => p.tipo === "Programas").length > 0 && (
                <optgroup label="Programas">
                    {[...proyectosList].filter(p => p.tipo === "Programas").sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
                </optgroup>
            )}
            {proyectosList.filter(p => p.tipo === "Proyectos").length > 0 && (
                <optgroup label="Proyectos">
                    {[...proyectosList].filter(p => p.tipo === "Proyectos").sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
                </optgroup>
            )}
            {proyectosList.filter(p => p.tipo === "Área").length > 0 && (
                <optgroup label="Áreas">
                    {[...proyectosList].filter(p => p.tipo === "Área").sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
                </optgroup>
            )}
        </select>
    );

    const steps = [
        { num: 1, label: "Información" },
        { num: 2, label: "Soportes" },
        { num: 3, label: "Pago y Firmas" }
    ];

    if (!isSolicitante) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
                <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Acceso Restringido</h1>
                <p style={{ color: 'var(--muted-foreground)', maxWidth: '400px', marginTop: '8px' }}>
                    No tienes permisos de "Solicitante" en tu perfil. Contacta al Administrador.
                </p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '100px' }}>
            <Toaster position="top-right" />

            {/* Hidden file inputs */}
            <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" onChange={handleFileSelect} style={{ display: 'none' }} capture="environment" />
            <input ref={pdfInputRef} type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx" onChange={handleCuentaCobroSelect} style={{ display: 'none' }} />
            <input ref={excelInputRef} type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleExcelSelect} style={{ display: 'none' }} />

            {/* Header */}
            <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
                <button onClick={() => router.push('/legalizaciones')} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                    <ArrowLeft size={24} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>Legalización Directa</h1>
                    <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', margin: '4px 0 0' }}>
                        Registra un gasto realizado sin solicitud de anticipo previa
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleFillDummyData}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginRight: '8px'
                    }}
                >
                    <Plus size={16} /> Llenar datos de prueba
                </button>
                <div style={{ 
                    padding: '4px 12px', 
                    background: '#fef3c7', 
                    color: '#92400e', 
                    borderRadius: '8px', 
                    fontSize: '11px', 
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <AlertCircle size={12} />
                    SIN ANTICIPO
                </div>
            </div>

            {/* Step Indicator */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', padding: '0 4px' }}>
                {steps.map((step, idx) => (
                    <button
                        key={step.num}
                        onClick={() => setCurrentStep(step.num)}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: currentStep === step.num ? '2px solid #2563eb' : '1px solid #e2e8f0',
                            background: currentStep === step.num ? '#eff6ff' : (currentStep > step.num ? '#f0fdf4' : '#fff'),
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: currentStep === step.num ? '#2563eb' : (currentStep > step.num ? '#16a34a' : '#e2e8f0'),
                            color: currentStep >= step.num ? '#fff' : '#94a3b8',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: '700'
                        }}>
                            {currentStep > step.num ? '✓' : step.num}
                        </div>
                        <span style={{
                            fontSize: '13px',
                            fontWeight: currentStep === step.num ? '700' : '500',
                            color: currentStep === step.num ? '#1e293b' : '#64748b'
                        }}>{step.label}</span>
                    </button>
                ))}
            </div>

            {/* PASO 1: Información del Solicitante y del Gasto */}
            {currentStep === 1 && (
                <>
                    {/* Datos del Solicitante */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="form-section-header">
                            <div className="form-section-number">1</div>
                            <h3 className="form-section-title">Información del solicitante</h3>
                        </div>

                        {/* Selector de Simulación */}
                        <div style={{ padding: '16px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '16px' }}>🧪</span>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Modo de Pruebas: Simular Solicitante</span>
                            </div>
                            <select className="form-input" value={simulatedUser ? simulatedUser.id : ""} onChange={(e) => {
                                const selectedId = e.target.value;
                                if (!selectedId) { setSimulatedUser(null); toast.success("Restaurado a tu perfil real"); }
                                else { const selected = solicitantesList.find(p => p.id === selectedId); if (selected) { setSimulatedUser(selected); toast.success(`Simulando a: ${selected.full_name}`); } }
                            }} style={{ maxWidth: '400px', backgroundColor: 'white' }}>
                                <option value="">— Usar mi usuario autenticado ({user?.user_metadata?.full_name || user?.email}) —</option>
                                {solicitantesList.map(profile => (<option key={profile.id} value={profile.id}>{profile.full_name} ({profile.email})</option>))}
                            </select>
                        </div>

                        <div className="form-grid-auto">
                            <div>
                                <label className="form-label">Nombre completo <span style={{ color: 'var(--destructive)' }}>*</span></label>
                                <input type="text" className="form-input" value={solicitanteActivoNombre} readOnly />
                            </div>
                            <div>
                                <label className="form-label">Tipo de documento <span style={{ color: 'var(--destructive)' }}>*</span></label>
                                <select className="form-input" value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)}>
                                    <option value="CC">CC – Cédula de Ciudadanía</option>
                                    <option value="CE">CE – Cédula de Extranjería</option>
                                    <option value="PA">PA – Pasaporte</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Número de documento <span style={{ color: 'var(--destructive)' }}>*</span></label>
                                <input type="text" className="form-input" placeholder="Ej: 1234567890" value={numDocumento} onChange={e => setNumDocumento(e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Cargo</label>
                                <input type="text" className="form-input" value={cargo} onChange={e => setCargo(e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Programa / Proyecto / Área <span style={{ color: 'var(--destructive)' }}>*</span></label>
                                {renderProyectoSelect(solicitanteProyecto, setSolicitanteProyecto)}
                            </div>

                            {/* Aprobador */}
                            {(aprobadorPrincipal || aprobadorSuplente) ? (
                                <div>
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <UserCheck size={14} color="var(--primary)" /> Aprobador del Reintegro <span style={{ color: 'var(--destructive)' }}>*</span>
                                    </label>
                                    <select className="form-input" value={aprobadorSeleccionado} onChange={e => setAprobadorSeleccionado(e.target.value)} required>
                                        {aprobadorPrincipal && <option value={aprobadorPrincipal}>{aprobadorPrincipal} (Principal)</option>}
                                        {aprobadorSuplente && <option value={aprobadorSuplente}>{aprobadorSuplente} (Suplente)</option>}
                                    </select>
                                </div>
                            ) : proyecto ? (
                                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '13px' }}>
                                    <span>⚠️ No tienes aprobadores asignados. Contacta al administrador.</span>
                                </div>
                            ) : null}

                            <div>
                                <label className="form-label">Correo electrónico</label>
                                <input type="email" className="form-input" value={solicitanteActivoEmail || ''} readOnly />
                            </div>
                            <div>
                                <label className="form-label">Número de contacto <span style={{ color: 'var(--destructive)' }}>*</span></label>
                                <input type="tel" className="form-input" placeholder="Ej: 3001234567" value={contacto} onChange={e => setContacto(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Información del Gasto */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>2</div>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Información del gasto realizado</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label className="form-label">Fecha en que se realizaron los gastos <span style={{ color: 'var(--destructive)' }}>*</span></label>
                                <input type="date" className="form-input" value={fechaGasto} onChange={e => setFechaGasto(e.target.value)} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label className="form-label">Programa / Proyecto al que se carga <span style={{ color: 'var(--destructive)' }}>*</span></label>
                                {renderProyectoSelect(proyecto, setProyecto)}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Concepto de los gastos <span style={{ color: 'var(--destructive)' }}>*</span></label>
                            <textarea rows={2} placeholder="Describa el concepto general de los gastos realizados..." value={concepto} onChange={e => setConcepto(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none', resize: 'vertical' }} />
                        </div>

                        {/* Tabla de gastos */}
                        <div style={{ overflowX: 'auto', marginBottom: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--muted-foreground)' }}>Tipo de gasto</th>
                                        <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--muted-foreground)' }}>Descripción</th>
                                        <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--muted-foreground)' }}>Valor ($)</th>
                                        <th style={{ width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gastos.map((gasto, index) => (
                                        <tr key={gasto.id} style={{ borderBottom: index < gastos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                            <td style={{ padding: '8px 16px' }}>
                                                <select value={gasto.tipoGasto} onChange={e => handleGastoChange(gasto.id, 'tipoGasto', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}>
                                                    {tiposGasto.map(t => <option key={t}>{t}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <input type="text" placeholder="Descripción..." value={gasto.descripcion} onChange={e => handleGastoChange(gasto.id, 'descripcion', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }} />
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <input type="number" min="0" step="1000" value={gasto.valor || ""} onChange={e => handleGastoChange(gasto.id, 'valor', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }} />
                                            </td>
                                            <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                                                <button type="button" onClick={() => handleRemoveGasto(gasto.id)} disabled={gastos.length <= 1} style={{ padding: '6px', color: gastos.length > 1 ? 'var(--destructive)' : 'var(--muted-foreground)', opacity: gastos.length > 1 ? 1 : 0.5, background: 'none', border: 'none', cursor: gastos.length > 1 ? 'pointer' : 'not-allowed' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button type="button" className="secondary-button" onClick={handleAddGasto} style={{ fontSize: '13px', padding: '6px 12px' }}>
                            <Plus size={16} /> Agregar ítem
                        </button>

                        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fffbeb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fde68a' }}>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', letterSpacing: '0.05em' }}>VALOR TOTAL A REEMBOLSAR</div>
                                <div style={{ fontSize: '14px', color: 'var(--foreground)', marginTop: '4px', textTransform: 'capitalize' }}>
                                    {numeroALetras(totalAnticipo)}
                                </div>
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b' }}>
                                $ {totalAnticipo.toLocaleString('es-CO')}
                            </div>
                        </div>

                        <div style={{ marginTop: '20px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Observaciones</label>
                            <textarea rows={2} placeholder="Información adicional o aclaraciones..." value={observaciones} onChange={e => setObservaciones(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none', resize: 'vertical' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => { const err = validateStep1(); if (err) { toast.error(err); } else { setCurrentStep(2); } }} className="primary-button" style={{ padding: '12px 32px', backgroundColor: 'var(--primary)', color: 'white' }}>
                            Continuar →
                        </button>
                    </div>
                </>
            )}

            {/* PASO 2: Documentos Soporte */}
            {currentStep === 2 && (
                <>
                    {/* Gestión de Documentos Especiales */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>1. Gestión de Documentos Especiales</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {/* Relación de Gastos */}
                            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>RELACIÓN DE GASTOS</span>
                                        {uploadedExcel && <CheckCircle2 size={14} color="#16a34a" />}
                                    </div>
                                </div>
                                <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#fff' }}>
                                    <option value="FORMATO_GASTOS_GENERAL">Gastos Generales</option>
                                    <option value="FORMATO_GASTOS_PAS">Gastos PAS</option>
                                    <option value="FORMATO_GASTOS_TARJETAS">Gastos Tarjetas</option>
                                </select>
                                <button onClick={downloadExcelTemplate} className="primary-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', fontSize: '12px' }}>
                                    <Download size={16} /> Descargar Plantilla
                                </button>
                                {uploadedExcel ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{uploadedExcel.name}</div>
                                            <div style={{ fontSize: '10px', color: '#64748b' }}>{(uploadedExcel.size / 1024 / 1024).toFixed(2)} MB</div>
                                        </div>
                                        <button onClick={removeExcel} style={{ background: 'none', border: 'none', color: '#ef4444', padding: '4px', cursor: 'pointer' }}><X size={14} /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => excelInputRef.current?.click()} className="secondary-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', fontSize: '12px', marginTop: '4px' }}>
                                        <Upload size={16} /> Cargar Excel
                                    </button>
                                )}
                            </div>

                            {/* Cuenta de Cobro */}
                            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>CUENTA DE COBRO</span>
                                        {uploadedCuentaCobro && <CheckCircle2 size={14} color="#16a34a" />}
                                    </div>
                                    <div style={{ padding: '2px 6px', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>PDF / WORD</div>
                                </div>
                                <a href="/formatos/MODELO_CUENTA_DE_COBRO.docx" download="MODELO_CUENTA_DE_COBRO.docx" className="primary-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', fontSize: '12px', textDecoration: 'none' }}>
                                    <FileText size={16} /> Descargar modelo
                                </a>
                                {uploadedCuentaCobro ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{uploadedCuentaCobro.name}</div>
                                            <div style={{ fontSize: '10px', color: '#64748b' }}>{(uploadedCuentaCobro.size / 1024 / 1024).toFixed(2)} MB</div>
                                        </div>
                                        <button onClick={removeCuentaCobro} style={{ background: 'none', border: 'none', color: '#ef4444', padding: '4px', cursor: 'pointer' }}><X size={14} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={() => pdfInputRef.current?.click()} className="secondary-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', fontSize: '12px', marginTop: '4px' }}>
                                            <Upload size={16} /> Cargar Archivo
                                        </button>
                                        <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', marginTop: '4px', display: 'block' }}>
                                            Sube tu cuenta de cobro (Formatos aceptados: PDF, Word)
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Carga Multimedia */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Panel de Carga Multimedia</h2>
                        </div>
                        
                        <div style={{ background: '#fff', border: '2px dashed #cbd5e1', borderRadius: '24px', padding: '32px 20px', textAlign: 'center' }}>
                            <button onClick={() => fileInputRef.current?.click()} style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)', cursor: 'pointer' }}>
                                <Camera size={32} />
                            </button>
                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>Cargar Fotos o Recibos</h3>
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Usa la cámara de tu móvil para capturar tus soportes o selecciona archivos PDF.</p>
                            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                                Seleccionar Archivos
                            </button>
                        </div>

                        {/* Lista de Soportes */}
                        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {supports.map((s, idx) => (
                                <div key={idx} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                                            {s.preview ? <img src={s.preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FileIcon size={24} color="#94a3b8" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.file.name}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{(s.file.size / 1024 / 1024).toFixed(2)} MB</div>
                                                </div>
                                                <button onClick={() => removeSupport(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', padding: '4px', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                            </div>
                                            <input type="text" placeholder="Concepto del gasto (ej: Almuerzo día 1)" value={s.description} onChange={(e) => updateDescription(idx, e.target.value)} style={{ width: '100%', marginTop: '8px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button type="button" onClick={() => setCurrentStep(1)} className="secondary-button" style={{ padding: '12px 32px' }}>
                            ← Volver
                        </button>
                        <button type="button" onClick={() => setCurrentStep(3)} className="primary-button" style={{ padding: '12px 32px', backgroundColor: 'var(--primary)', color: 'white' }}>
                            Continuar →
                        </button>
                    </div>
                </>
            )}

            {/* PASO 3: Información Bancaria y Firmas */}
            {currentStep === 3 && (
                <>
                    {/* Información Bancaria */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>$</div>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Información para el reembolso</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Entidad bancaria <span style={{ color: 'var(--destructive)' }}>*</span></label>
                                <select value={banco} onChange={e => setBanco(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }}>
                                    <option value="">— Seleccione —</option>
                                    {bancos.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Tipo de cuenta <span style={{ color: 'var(--destructive)' }}>*</span></label>
                                <select value={tipoCuenta} onChange={e => setTipoCuenta(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }}>
                                    <option value="Ahorros">Cuenta de Ahorros</option>
                                    <option value="Corriente">Cuenta Corriente</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Número de cuenta <span style={{ color: 'var(--destructive)' }}>*</span></label>
                                <input type="text" placeholder="Ej: 12345678901" value={numCuenta} onChange={e => setNumCuenta(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }} />
                            </div>
                        </div>
                    </div>

                    {/* Resumen */}
                    <div className="card" style={{ marginBottom: '24px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#92400e', marginBottom: '12px' }}>📋 RESUMEN DE LA LEGALIZACIÓN</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                            <div><span style={{ color: '#92400e' }}>Solicitante:</span> <strong>{solicitanteActivoNombre}</strong></div>
                            <div><span style={{ color: '#92400e' }}>Documento:</span> <strong>{tipoDocumento} {numDocumento}</strong></div>
                            <div><span style={{ color: '#92400e' }}>Concepto:</span> <strong>{concepto || '—'}</strong></div>
                            <div><span style={{ color: '#92400e' }}>Fecha del gasto:</span> <strong>{fechaGasto || '—'}</strong></div>
                            <div><span style={{ color: '#92400e' }}>Banco:</span> <strong>{banco || '—'} ({tipoCuenta})</strong></div>
                            <div><span style={{ color: '#92400e' }}>Cuenta:</span> <strong>{numCuenta || '—'}</strong></div>
                            <div><span style={{ color: '#92400e' }}>Documentos:</span> <strong>{(uploadedExcel ? 1 : 0) + (uploadedCuentaCobro ? 1 : 0) + supports.length} archivos</strong></div>
                            <div><span style={{ color: '#92400e' }}>Aprobador:</span> <strong>{aprobadorSeleccionado || '—'}</strong></div>
                        </div>
                        <div style={{ marginTop: '16px', padding: '12px', background: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600', color: '#92400e' }}>Total a reembolsar:</span>
                            <span style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b' }}>{formatCurrency(totalAnticipo)}</span>
                        </div>
                    </div>

                    {/* Firma */}
                    <div className="card" style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>✍</div>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Firma del solicitante</h3>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '16px' }}>Proporciona tu firma para el documento oficial.</p>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <button type="button" onClick={() => setSignatureTab("upload")} style={{ padding: '8px 16px', borderRadius: '30px', fontSize: '13px', fontWeight: '600', backgroundColor: signatureTab === "upload" ? 'var(--primary)' : 'transparent', color: signatureTab === "upload" ? 'white' : 'var(--muted-foreground)', border: signatureTab === "upload" ? 'none' : '1px solid var(--border)' }}>
                                Subir imagen
                            </button>
                            <button type="button" onClick={() => setSignatureTab("draw")} style={{ padding: '8px 16px', borderRadius: '30px', fontSize: '13px', fontWeight: '600', backgroundColor: signatureTab === "draw" ? 'var(--primary)' : 'transparent', color: signatureTab === "draw" ? 'white' : 'var(--muted-foreground)', border: signatureTab === "draw" ? 'none' : '1px solid var(--border)' }}>
                                Dibujar firma
                            </button>
                        </div>

                        <div style={{ maxWidth: '400px' }}>
                            {signatureTab === 'upload' ? (
                                <div style={{ border: '1.5px dashed var(--border)', borderRadius: '12px', padding: '32px 20px', textAlign: 'center', backgroundColor: 'var(--muted)', cursor: 'pointer', position: 'relative' }}>
                                    <input type="file" accept="image/png, image/jpeg" onChange={handleSignatureUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                    <div style={{ color: 'var(--primary)', marginBottom: '8px' }}><Plus size={24} style={{ margin: '0 auto' }} /></div>
                                    <div style={{ fontSize: '14px', color: 'var(--foreground)' }}><strong>Haz clic</strong> o arrastra una imagen</div>
                                    <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>PNG, JPG – máx. 2MB</div>
                                </div>
                            ) : (
                                <SignaturePad onSignatureChange={setSignatureData} />
                            )}
                            {signatureData && (
                                <div style={{ marginTop: '16px', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', backgroundColor: 'white' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Vista previa de la firma:</p>
                                    <img src={signatureData} alt="Firma" style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button type="button" onClick={() => setCurrentStep(2)} className="secondary-button" style={{ padding: '12px 24px' }}>
                            ← Volver
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="primary-button"
                            style={{
                                padding: '14px 32px',
                                backgroundColor: '#1e293b',
                                color: 'white',
                                fontSize: '15px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} />}
                            {isSubmitting ? 'Procesando...' : 'Enviar Legalización Directa'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
