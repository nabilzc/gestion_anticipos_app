"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
    CheckCircle2, 
    Search, 
    Clock, 
    User, 
    Briefcase,
    CreditCard,
    ArrowLeftRight,
    Loader2,
    Calendar,
    Hash
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { formatCurrency, formatDate } from "@/lib/utils/businessLogic";
import { sendDisbursementNotification } from "@/app/actions/sendEmail";

export default function DesembolsosPage() {
    const { user } = useAuth();
    const [anticipos, setAnticipos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedAnticipo, setSelectedAnticipo] = useState<any>(null);
    const [fechaTransferencia, setFechaTransferencia] = useState(new Date().toISOString().split('T')[0]);
    const [numeroComprobante, setNumeroComprobante] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCelebrating, setIsCelebrating] = useState(false);

    const fetchAprobados = async () => {
        setLoading(true);
        try {
            // Fetch only those with status 'Aprobado' as requested
            const { data, error } = await supabase
                .from("anticipos")
                .select(`
                    *,
                    profiles:solicitante_id (full_name, email)
                `)
                .eq("status", "Aprobado")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setAnticipos(data || []);
        } catch (err) {
            console.error("Error fetching aprobados:", err);
            toast.error("Error al cargar las aprobaciones para desembolso");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchAprobados();
        }
    }, [user]);

    const handleOpenPay = (anticipo: any) => {
        setSelectedAnticipo(anticipo);
        setNumeroComprobante("");
        setFechaTransferencia(new Date().toISOString().split('T')[0]);
        setShowPayModal(true);
    };

    const confirmDisbursement = async () => {
        if (!selectedAnticipo || !numeroComprobante) {
            toast.error("Por favor completa todos los campos del pago");
            return;
        }

        setIsProcessing(true);
        const loadingToast = toast.loading("Registrando desembolso...");
        try {
            const { error } = await supabase
                .from("anticipos")
                .update({ 
                    status: "Desembolsado",
                    fecha_pago: fechaTransferencia,
                    comprobante_id: numeroComprobante
                })
                .eq("id", selectedAnticipo.id);

            if (error) throw error;

            // Enviar correo de notificación (Asíncrono)
            if (selectedAnticipo.profiles?.email) {
                sendDisbursementNotification({
                    id: `#ANT-${String(selectedAnticipo.id).padStart(4, '0')}`,
                    solicitante_nombre: selectedAnticipo.profiles.full_name,
                    solicitante_email: selectedAnticipo.profiles.email,
                    comprobante_id: numeroComprobante
                }).catch(err => console.error("Error sending disbursement email:", err));
            }

            toast.success("¡Desembolso registrado con éxito! 💰", { id: loadingToast, icon: '💰' });
            setIsCelebrating(true);
            setTimeout(() => setIsCelebrating(false), 3000);
            setShowPayModal(false);
            fetchAprobados();
        } catch (err) {
            console.error(err);
            toast.error("Error al registrar el desembolso", { id: loadingToast });
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredAnticipos = anticipos.filter(a =>
        (a.motivo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.profiles?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.id || "").toString().includes(searchTerm)
    );

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
            <Toaster position="top-right" />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--foreground)', letterSpacing: '-0.02em', marginBottom: '4px' }}>Módulo de Desembolsos</h1>
                    <p style={{ fontSize: '15px', color: 'var(--muted-foreground)' }}>Gestión de pagos para solicitudes aprobadas</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#eff6ff', padding: '8px 16px', borderRadius: '12px', border: '1px solid #dbeafe' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2563eb' }}></div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af' }}>{anticipos.length} Listos para Pago</span>
                </div>
            </div>

            {/* Main Content Table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por solicitante, proyecto o ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 14px 12px 44px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                fontSize: '14px',
                                outline: 'none',
                                backgroundColor: 'var(--muted)',
                                transition: 'all 0.2s'
                            }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>Solicitud</th>
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>Solicitante</th>
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>Banco / Cuenta</th>
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Monto</th>
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--muted-foreground)' }}>
                                            <Loader2 size={32} className="animate-spin text-primary" />
                                            <span style={{ fontSize: '15px' }}>Buscando pagos pendientes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredAnticipos.length > 0 ? (
                                filteredAnticipos.map((a) => (
                                    <tr key={a.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)', fontSize: '14px', transition: 'background-color 0.2s' }}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '15px' }}>#ANT-{String(a.id).padStart(4, '0')}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> Aprobado el {formatDate(a.created_at)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: 'var(--foreground)' }}>{a.profiles?.full_name || "Usuario"}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{a.proyecto || "General"}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                                                <CreditCard size={14} className="text-muted-foreground" />
                                                <div style={{ fontSize: '13px' }}>
                                                    <div style={{ fontWeight: 600 }}>{a.banco_nombre || "N/A"}</div>
                                                    <div style={{ color: '#64748b', fontSize: '12px' }}>{a.banco_tipo_cuenta} • {a.banco_numero_cuenta}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '16px' }}>
                                                {formatCurrency(a.monto_total || 0)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => handleOpenPay(a)}
                                                    style={{ 
                                                        padding: '10px 16px', 
                                                        borderRadius: '10px', 
                                                        border: 'none', 
                                                        backgroundColor: '#2563eb', 
                                                        color: 'white', 
                                                        cursor: 'pointer', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '8px',
                                                        fontSize: '13px',
                                                        fontWeight: '700',
                                                        transition: 'all 0.2s',
                                                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                                                    }}
                                                >
                                                    <ArrowLeftRight size={16} /> Registrar Pago
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ padding: '80px 40px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '56px', marginBottom: '20px' }}>💵</div>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--foreground)' }}>Sin pagos pendientes</div>
                                        <div style={{ fontSize: '15px', color: 'var(--muted-foreground)', marginTop: '6px' }}>Todas las solicitudes aprobadas han sido desembolsadas.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pay Modal */}
            {showPayModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '32px',
                        borderRadius: '24px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ padding: '10px', backgroundColor: '#eff6ff', borderRadius: '12px', color: '#2563eb' }}>
                                <ArrowLeftRight size={24} />
                            </div>
                            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>Registrar Desembolso</h2>
                        </div>
                        
                        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Monto a Transferir</div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>{formatCurrency(selectedAnticipo?.monto_total || 0)}</div>
                            <div style={{ fontSize: '14px', color: '#1e40af', marginTop: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={14} /> {selectedAnticipo?.profiles?.full_name}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '32px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Calendar size={14} /> Fecha de Transferencia
                                </label>
                                <input
                                    type="date"
                                    value={fechaTransferencia}
                                    onChange={(e) => setFechaTransferencia(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '15px',
                                        outline: 'none',
                                        color: '#1e293b',
                                        fontWeight: '500'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Hash size={14} /> Número de Comprobante / ID Operación
                                </label>
                                <input
                                    type="text"
                                    value={numeroComprobante}
                                    onChange={(e) => setNumeroComprobante(e.target.value)}
                                    placeholder="Ej: 83742910"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '15px',
                                        outline: 'none',
                                        color: '#1e293b',
                                        fontWeight: '500'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowPayModal(false)}
                                style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDisbursement}
                                disabled={isProcessing || !numeroComprobante}
                                style={{ 
                                    padding: '12px 32px', 
                                    borderRadius: '12px', 
                                    border: 'none', 
                                    backgroundColor: '#2563eb', 
                                    color: 'white', 
                                    fontWeight: '700', 
                                    cursor: (isProcessing || !numeroComprobante) ? 'not-allowed' : 'pointer',
                                    opacity: (isProcessing || !numeroComprobante) ? 0.7 : 1,
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                                }}
                            >
                                {isProcessing ? "Procesando..." : "Confirmar Pago"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Celebration Effect Overlay */}
            {isCelebrating && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    fontSize: '100px'
                }}>
                    💰
                </div>
            )}
        </div>
    );
}
