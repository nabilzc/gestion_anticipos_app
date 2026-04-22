"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Info, Plus, Trash2, Save, Send } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import { numeroALetras } from "@/lib/utils/numeroALetras";
import toast, { Toaster } from "react-hot-toast";
import { sendAnticipoNotification } from "@/app/actions/sendEmail";

type GastoItem = {
    id: string;
    tipoGasto: string;
    codigo: string;
    descripcion: string;
    valor: number;
};

export default function NuevaSolicitudPage() {
    const { user } = useAuth();
    const router = useRouter();

    // Estados del Formulario
    const [fecha, setFecha] = useState("");
    const [tipoDocumento, setTipoDocumento] = useState("CC");
    const [numDocumento, setNumDocumento] = useState("");
    const [cargo, setCargo] = useState("");
    const [proyecto, setProyecto] = useState("");
    const [contacto, setContacto] = useState("");

    const [concepto, setConcepto] = useState("");
    const [gastos, setGastos] = useState<GastoItem[]>([
        { id: "1", tipoGasto: "Viáticos", codigo: "", descripcion: "", valor: 0 }
    ]);

    const [banco, setBanco] = useState("");
    const [tipoCuenta, setTipoCuenta] = useState("Ahorros");
    const [numCuenta, setNumCuenta] = useState("");

    const [fechaEjecucion, setFechaEjecucion] = useState("");
    const [observaciones, setObservaciones] = useState("");

    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [signatureTab, setSignatureTab] = useState<"upload" | "draw">("upload");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Inicialización y carga de sesión
    useEffect(() => {
        // Set current date
        const today = new Date().toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
        setFecha(today);

        // Try to restore from a previously stored local context if needed
        // In the future this could query the last record from Supabase for this user
    }, []);

    const totalAnticipo = gastos.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

    const handleAddGasto = () => {
        setGastos([
            ...gastos,
            {
                id: Date.now().toString(),
                tipoGasto: "Viáticos",
                codigo: "",
                descripcion: "",
                valor: 0
            }
        ]);
    };

    const handleRemoveGasto = (id: string) => {
        if (gastos.length <= 1) return;
        setGastos(gastos.filter(g => g.id !== id));
    };

    const handleGastoChange = (id: string, field: keyof GastoItem, value: any) => {
        setGastos(gastos.map(g => (g.id === id ? { ...g, [field]: value } : g)));
    };

    const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error("La imagen debe ser menor a 2MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                setSignatureData(ev.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFillDummyData = () => {
        setNumDocumento("1020304050");
        setTipoDocumento("CC");
        setCargo("Coordinador de Proyecto");
        setProyecto("Programa Rural Andino");
        setContacto("3001234567");
        setConcepto("Gastos de viaje para capacitación técnica en zona rural");
        setGastos([
            { id: "1", tipoGasto: "Viáticos", codigo: "V-001", descripcion: "Alimentación (5 días)", valor: 150000 },
            { id: "2", tipoGasto: "Transporte", codigo: "T-001", descripcion: "Bus intermunicipal ida/vuelta", valor: 85000 }
        ]);
        setBanco("Bancolombia");
        setTipoCuenta("Ahorros");
        setNumCuenta("123-45678-01");
        setFechaEjecucion(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setObservaciones("Prueba de integración con Supabase. Por favor ignorar.");

        // Firma base64 ficticia (un punto negro pequeño para pasar la validación visual si fuera necesaria)
        setSignatureData("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

        toast.success("Campos llenados con datos de prueba");
    };

    const validateForm = () => {
        if (!numDocumento.trim()) return "Número de documento requerido";
        if (!contacto.trim()) return "Número de contacto requerido";
        if (!proyecto) return "Selecciona un proyecto/programa";
        if (!concepto.trim()) return "Concepto del anticipo requerido";
        if (!banco) return "Selecciona una entidad bancaria";
        if (!numCuenta.trim()) return "Número de cuenta requerido";
        if (!fechaEjecucion) return "Fecha de ejecución requerida";

        const validGastos = gastos.some(g => (Number(g.valor) || 0) > 0);
        if (!validGastos) return "Agrega al menos un ítem de gasto con valor mayor a 0";

        // La firma podría ser opcional en estado Borrador, pero obligatoria para Enviado
        // if (!signatureData) return "La firma del solicitante es requerida";

        return null;
    };
    const handleSubmit = async (estado: "Borrador" | "Enviado") => {

        if (!user) {
            toast.error("Debes iniciar sesión para realizar esta acción");
            return;
        }

        if (estado === "Enviado") {
            const errorStr = validateForm();
            if (errorStr) {
                toast.error(errorStr);
                return;
            }
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading(estado === 'Enviado' ? 'Enviando solicitud...' : 'Guardando borrador...');

        const payload = {
            solicitante_id: user.id,
            status: estado,
            motivo: concepto,
            monto_total: totalAnticipo,
            monto_letras: numeroALetras(totalAnticipo),

            banco_nombre: banco,
            banco_tipo_cuenta: tipoCuenta,
            banco_numero_cuenta: numCuenta,

            fecha_ejecucion: fechaEjecucion,
            observaciones: observaciones,
            firma_base64: signatureData,
            tipo_documento: tipoDocumento,
            numero_documento: numDocumento,
            cargo: cargo,
            proyecto: proyecto,
            contacto: contacto
        };

        console.log("Datos a enviar:", payload);

        try {
            console.log("Insertando anticipo...");
            const { data: anticipoData, error: anticipoError } = await supabase
                .from('anticipos')
                .insert([payload])
                .select()
                .single();

            if (anticipoError) {
                console.error("Error en tabla anticipos:", anticipoError);
                throw new Error(`DB Error (Anticipos): ${anticipoError.message}`);
            }

            const anticipoId = anticipoData.id;
            console.log("Anticipo creado con ID:", anticipoId);

            // 2. Guardar los items en tabla anticipo_items
            if (anticipoId) {
                const itemsPayload = gastos.map(g => ({
                    anticipo_id: anticipoId,
                    tipo_gasto: g.tipoGasto,
                    codigo: g.codigo,
                    descripcion: g.descripcion,
                    valor: Number(g.valor) || 0
                }));

                console.log("Insertando items:", itemsPayload);
                const { error: itemsError } = await supabase
                    .from('anticipo_items')
                    .insert(itemsPayload);

                if (itemsError) {
                    console.error("Error al guardar ítems:", itemsError);
                    // Opcionalmente podemos notificar pero ya tenemos el anticipo padre creado
                }

                // 3. Enviar correo de notificación (Resend)
                if (estado === "Enviado") {
                    try {
                        await sendAnticipoNotification({
                            id: anticipoId,
                            solicitante_nombre: user.user_metadata?.full_name || user.email || "Usuario",
                            solicitante_email: user.email || "",
                            motivo: concepto,
                            monto_total: totalAnticipo,
                            monto_letras: numeroALetras(totalAnticipo),
                            banco_info: {
                                entidad: banco,
                                tipo_cuenta: tipoCuenta,
                                numero_cuenta: numCuenta
                            },
                            items: gastos
                        });
                    } catch (emailErr) {
                        console.error("No se pudo enviar el correo:", emailErr);
                        // No fallamos la operación principal por un error de correo
                    }
                }
            }

            toast.success(estado === "Enviado" ? "Solicitud enviada con éxito" : "Borrador guardado", { id: loadingToast });

            // Redirigir o limpiar formulario
            setTimeout(() => {
                router.push("/mis-anticipos");
            }, 1500);

        } catch (err: any) {
            console.error("Detailed Error catch:", err);
            const errorMessage = err?.message || (typeof err === 'string' ? err : "Error desconocido");
            toast.error(`Error: ${errorMessage}`, { id: loadingToast });

            // Si es un fetch error, dar más contexto
            if (errorMessage.includes("fetch")) {
                toast.error("Verifica tu conexión y los valores de Supabase en .env.local", { duration: 5000 });
            }

            // BACKUP OFFLINE
            saveOfflineBackup(payload, gastos);
        } finally {
            setIsSubmitting(false);
        }
    };

    const saveOfflineBackup = (payload: any, items: any[]) => {
        try {
            const dbStr = localStorage.getItem('anticipos_offline_backup');
            const backupDB = dbStr ? JSON.parse(dbStr) : [];
            backupDB.push({
                id: `local-${Date.now()}`,
                ...payload,
                items
            });
            localStorage.setItem('anticipos_offline_backup', JSON.stringify(backupDB));
            toast.success("Guardado en almacenamiento local (Sin Conexión)");
            setTimeout(() => {
                router.push("/mis-anticipos");
            }, 1500);
        } catch (e) {
            console.error("No se pudo guardar ni offline:", e);
            toast.error("Error crítico: Imposible guardar la solicitud");
        }
    };

    const proyectos = ['Programa Rural Andino', 'Programa Educativo Sur', 'Programa Urbano Norte', 'Administración', 'Proyecto CEBV', 'Proyecto Tutores', 'Otro'];
    const tiposGasto = ['Viáticos', 'Transporte', 'Materiales', 'Alimentación', 'Hospedaje', 'Servicios', 'Comunicaciones', 'Otros'];
    const bancos = ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA', 'Nequi', 'Daviplata', 'Banco Popular', 'Scotiabank Colpatria', 'Banco AV Villas', 'Otro'];

    return (
        <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '40px' }}>
            <Toaster position="top-right" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '4px' }}>Nueva Solicitud</h1>
                    <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Completa el formulario para solicitar un anticipo</p>
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
                        gap: '8px'
                    }}
                >
                    <Plus size={16} /> Llenar datos de prueba
                </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit("Enviado"); }}>

                {/* S1: Fecha */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>1</div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Fecha de la solicitud</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Fecha</label>
                            <input
                                type="text"
                                value={fecha}
                                readOnly
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--muted)', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }}
                            />
                        </div>
                    </div>
                </div>

                {/* S2: Datos del solicitante */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>2</div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Información del solicitante</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Nombre completo <span style={{ color: 'var(--destructive)' }}>*</span></label>
                            <input type="text" value={user?.user_metadata?.full_name || 'Desconocido'} readOnly style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--muted)', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Tipo de documento <span style={{ color: 'var(--destructive)' }}>*</span></label>
                            <select value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }}>
                                <option value="CC">CC – Cédula de Ciudadanía</option>
                                <option value="CE">CE – Cédula de Extranjería</option>
                                <option value="PA">PA – Pasaporte</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Número de documento <span style={{ color: 'var(--destructive)' }}>*</span></label>
                            <input type="text" placeholder="Ej: 1234567890" value={numDocumento} onChange={e => setNumDocumento(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Cargo</label>
                            <input type="text" value={cargo} onChange={e => setCargo(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Proyecto / Programa <span style={{ color: 'var(--destructive)' }}>*</span></label>
                            <select value={proyecto} onChange={e => setProyecto(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }}>
                                <option value="">— Seleccione —</option>
                                {proyectos.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Correo electrónico</label>
                            <input type="email" value={user?.email || ''} readOnly style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--muted)', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Número de contacto <span style={{ color: 'var(--destructive)' }}>*</span></label>
                            <input type="tel" placeholder="Ej: 3001234567" value={contacto} onChange={e => setContacto(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }} />
                        </div>
                    </div>
                </div>

                {/* S3: Información del anticipo */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>3</div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Información del anticipo</h3>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Por concepto de <span style={{ color: 'var(--destructive)' }}>*</span></label>
                        <textarea
                            rows={2}
                            placeholder="Describa el concepto general del anticipo..."
                            value={concepto}
                            onChange={e => setConcepto(e.target.value)}
                            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ overflowX: 'auto', marginBottom: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--muted-foreground)' }}>Tipo de gasto</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--muted-foreground)' }}>Código</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--muted-foreground)' }}>Descripción</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--muted-foreground)' }}>Valor ($)</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {gastos.map((gasto, index) => (
                                    <tr key={gasto.id} style={{ borderBottom: index < gastos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                        <td style={{ padding: '8px 16px' }}>
                                            <select
                                                value={gasto.tipoGasto}
                                                onChange={e => handleGastoChange(gasto.id, 'tipoGasto', e.target.value)}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                                            >
                                                {tiposGasto.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </td>
                                        <td style={{ padding: '8px 16px' }}>
                                            <input
                                                type="text"
                                                placeholder="Ej: V-001"
                                                value={gasto.codigo}
                                                onChange={e => handleGastoChange(gasto.id, 'codigo', e.target.value)}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px 16px' }}>
                                            <input
                                                type="text"
                                                placeholder="Descripción..."
                                                value={gasto.descripcion}
                                                onChange={e => handleGastoChange(gasto.id, 'descripcion', e.target.value)}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px 16px' }}>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1000"
                                                value={gasto.valor || ""}
                                                onChange={e => handleGastoChange(gasto.id, 'valor', parseFloat(e.target.value))}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveGasto(gasto.id)}
                                                disabled={gastos.length <= 1}
                                                style={{ padding: '6px', color: gastos.length > 1 ? 'var(--destructive)' : 'var(--muted-foreground)', opacity: gastos.length > 1 ? 1 : 0.5 }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={handleAddGasto}
                        style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                        <Plus size={16} /> Agregar ítem
                    </button>

                    <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--muted)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>VALOR TOTAL DEL ANTICIPO</div>
                            <div style={{ fontSize: '14px', color: 'var(--foreground)', marginTop: '4px', textTransform: 'capitalize' }}>
                                {numeroALetras(totalAnticipo)}
                            </div>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>
                            $ {totalAnticipo.toLocaleString('es-CO')}
                        </div>
                    </div>
                </div>

                {/* S4: Información bancaria */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>4</div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Información para el pago</h3>
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

                {/* S5: Otras informaciones */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>5</div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Información adicional</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Fecha estimada de ejecución <span style={{ color: 'var(--destructive)' }}>*</span></label>
                            <input
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={fechaEjecucion}
                                onChange={e => setFechaEjecucion(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }}
                            />
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>Observaciones</label>
                            <textarea
                                rows={2}
                                placeholder="Información adicional o aclaraciones..."
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                            />
                        </div>
                    </div>
                </div>

                {/* S6: Firma del solicitante */}
                <div className="card" style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>6</div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Firma del solicitante</h3>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '16px' }}>Proporciona tu firma para el documento oficial. Puedes subir una imagen o dibujarla directamente.</p>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <button
                            type="button"
                            onClick={() => setSignatureTab("upload")}
                            style={{ padding: '8px 16px', borderRadius: '30px', fontSize: '13px', fontWeight: '600', backgroundColor: signatureTab === "upload" ? 'var(--primary)' : 'transparent', color: signatureTab === "upload" ? 'white' : 'var(--muted-foreground)', border: signatureTab === "upload" ? 'none' : '1px solid var(--border)' }}
                        >
                            Subir imagen
                        </button>
                        <button
                            type="button"
                            onClick={() => setSignatureTab("draw")}
                            style={{ padding: '8px 16px', borderRadius: '30px', fontSize: '13px', fontWeight: '600', backgroundColor: signatureTab === "draw" ? 'var(--primary)' : 'transparent', color: signatureTab === "draw" ? 'white' : 'var(--muted-foreground)', border: signatureTab === "draw" ? 'none' : '1px solid var(--border)' }}
                        >
                            Dibujar firma
                        </button>
                    </div>

                    <div style={{ maxWidth: '400px' }}>
                        {signatureTab === 'upload' ? (
                            <div style={{ border: '1.5px dashed var(--border)', borderRadius: '12px', padding: '32px 20px', textAlign: 'center', backgroundColor: 'var(--muted)', cursor: 'pointer', position: 'relative' }}>
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    onChange={handleSignatureUpload}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                />
                                <div style={{ color: 'var(--primary)', marginBottom: '8px' }}>
                                    <Plus size={24} style={{ margin: '0 auto' }} />
                                </div>
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
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleSubmit("Borrador")}
                        disabled={isSubmitting}
                        style={{ padding: '12px 24px' }}
                    >
                        <Save size={18} /> Guardar borrador
                    </button>
                    <button
                        type="submit"
                        className="primary-button"
                        disabled={isSubmitting}
                        style={{ padding: '12px 24px', backgroundColor: 'var(--primary)', color: 'white' }}
                    >
                        <Send size={18} /> {isSubmitting ? 'Procesando...' : 'Enviar solicitud'}
                    </button>
                </div>

            </form>
        </div>
    );
}
