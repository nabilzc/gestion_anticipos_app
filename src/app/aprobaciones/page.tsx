"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
    CheckCircle2, 
    XCircle, 
    Search, 
    Clock, 
    User, 
    FileText,
    AlertCircle,
    Loader2
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { formatCurrency, formatDate } from "@/lib/utils/businessLogic";
import { sendAnticipoStatusUpdate } from "@/app/actions/sendEmail";

export default function AprobacionesPage() {
    const { user } = useAuth();
    const [anticipos, setAnticipos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectId, setRejectId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCelebrating, setIsCelebrating] = useState(false);
    const [isRejectCelebrating, setIsRejectCelebrating] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [approveId, setApproveId] = useState<number | null>(null);

    const fetchPendientes = async () => {
        setLoading(true);
        try {
            // Fetch only those with status 'Enviado' as requested
            const { data, error } = await supabase
                .from("anticipos")
                .select(`
                    *,
                    profiles:solicitante_id (full_name, email)
                `)
                .eq("status", "Enviado")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setAnticipos(data || []);
        } catch (err) {
            console.error("Error fetching pendientes:", err);
            toast.error("Error al cargar las aprobaciones pendientes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchPendientes();
        }
    }, [user]);

    const handleApprove = (id: number) => {
        setApproveId(id);
        setShowApproveModal(true);
    };

    const confirmApprove = async () => {
        if (!approveId) return;

        setIsProcessing(true);
        const loadingToast = toast.loading("Confirmando aprobación...");
        try {
            const { error } = await supabase
                .from("anticipos")
                .update({ status: "Aprobado" })
                .eq("id", approveId);

            if (error) throw error;

            // Enviar correo de notificación (Asíncrono)
            const anticipo = anticipos.find(a => a.id === approveId);
            if (anticipo?.profiles?.email) {
                sendAnticipoStatusUpdate({
                    id: `#ANT-${String(anticipo.id).padStart(4, '0')}`,
                    solicitante_nombre: anticipo.profiles.full_name,
                    solicitante_email: anticipo.profiles.email,
                    status: 'Aprobado'
                }).catch(err => console.error("Error sending approval email:", err));
            }

            toast.success("¡Solicitud aprobada con éxito! 🎉", { id: loadingToast, icon: '🎉' });
            setIsCelebrating(true);
            setTimeout(() => setIsCelebrating(false), 3000);
            setShowApproveModal(false);
            fetchPendientes();
        } catch (err) {
            console.error(err);
            toast.error("Error al aprobar la solicitud", { id: loadingToast });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenReject = (id: number) => {
        setRejectId(id);
        setRejectReason("");
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!rejectId) {
            toast.error("Ocurrió un error inesperado al identificar la solicitud");
            return;
        }

        setIsProcessing(true);
        const loadingToast = toast.loading("Rechazando solicitud...");
        try {
            const { error } = await supabase
                .from("anticipos")
                .update({ 
                    status: "Rechazado",
                    motivo_rechazo: rejectReason 
                })
                .eq("id", rejectId);

            if (error) throw error;

            // Enviar correo de notificación (Asíncrono)
            const anticipo = anticipos.find(a => a.id === rejectId);
            if (anticipo?.profiles?.email) {
                sendAnticipoStatusUpdate({
                    id: `#ANT-${String(anticipo.id).padStart(4, '0')}`,
                    solicitante_nombre: anticipo.profiles.full_name,
                    solicitante_email: anticipo.profiles.email,
                    status: 'Rechazado',
                    motivo_rechazo: rejectReason
                }).catch(err => console.error("Error sending rejection email:", err));
            }

            toast.success("Solicitud rechazada", { id: loadingToast });
            setIsRejectCelebrating(true);
            setTimeout(() => setIsRejectCelebrating(false), 3000);
            setShowRejectModal(false);
            fetchPendientes();
        } catch (err) {
            console.error(err);
            toast.error("Error al rechazar la solicitud", { id: loadingToast });
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredAnticipos = anticipos.filter(a =>
        (a.motivo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.profiles?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.id || "").toString().includes(searchTerm)
    );

    // Filter access by domain (future requirement)
    // const canAccess = user?.email?.endsWith("@fundaec.org");
    const canAccess = true; // Allow current user for now as requested

    if (!canAccess) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
                <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Acceso Restringido</h1>
                <p style={{ color: 'var(--muted-foreground)', maxWidth: '400px', marginTop: '8px' }}>
                    Esta sección solo está disponible para usuarios autorizados con dominio @fundaec.org.
                </p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
            <Toaster position="top-right" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--foreground)', letterSpacing: '-0.02em', marginBottom: '4px' }}>Módulo de Aprobaciones</h1>
                    <p style={{ fontSize: '15px', color: 'var(--muted-foreground)' }}>Revision y aprobación de solicitudes presupuestales enviadas</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f0fdf4', padding: '8px 16px', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>{anticipos.length} Pendientes</span>
                </div>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por solicitante, concepto o ID..."
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
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>Concepto</th>
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Monto</th>
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--muted-foreground)' }}>
                                            <Loader2 size={32} className="animate-spin text-primary" />
                                            <span style={{ fontSize: '15px' }}>Buscando solicitudes enviadas...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredAnticipos.length > 0 ? (
                                filteredAnticipos.map((a) => (
                                    <tr key={a.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)', fontSize: '14px', transition: 'background-color 0.2s' }}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '15px' }}>#ANT-{String(a.id).padStart(4, '0')}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> {formatDate(a.created_at)}
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
                                        <td style={{ padding: '16px 24px', maxWidth: '350px' }}>
                                            <div style={{ fontWeight: '500', color: '#334155', lineHeight: '1.4' }}>
                                                {a.motivo}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '16px' }}>
                                                {formatCurrency(a.monto_total || 0)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                                <button
                                                    onClick={() => handleApprove(a.id)}
                                                    disabled={isProcessing}
                                                    title="Aprobar Solicitud"
                                                    style={{ 
                                                        padding: '8px 12px', 
                                                        borderRadius: '8px', 
                                                        border: '1px solid #bbf7d0', 
                                                        backgroundColor: '#f0fdf4', 
                                                        color: '#16a34a', 
                                                        cursor: 'pointer', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '6px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <CheckCircle2 size={18} /> Aprobar
                                                </button>
                                                <button
                                                    onClick={() => handleOpenReject(a.id)}
                                                    disabled={isProcessing}
                                                    title="Rechazar Solicitud"
                                                    style={{ 
                                                        padding: '8px 12px', 
                                                        borderRadius: '8px', 
                                                        border: '1px solid #fecaca', 
                                                        backgroundColor: '#fef2f2', 
                                                        color: '#dc2626', 
                                                        cursor: 'pointer',
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '6px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <XCircle size={18} /> Rechazar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ padding: '80px 40px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '56px', marginBottom: '20px' }}>✨</div>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--foreground)' }}>¡Todo al día!</div>
                                        <div style={{ fontSize: '15px', color: 'var(--muted-foreground)', marginTop: '6px' }}>No hay solicitudes pendientes de aprobación en este momento.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Celebration Effect Overlay */}
            {isCelebrating && (
                <div className="celebration-overlay">
                    <div className="celebration-emoji">🎉</div>
                    {[...Array(40)].map((_, i) => {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 100 + Math.random() * 200;
                        return (
                            <div 
                                key={i} 
                                className="particle" 
                                style={{ 
                                    '--x': `${Math.cos(angle) * distance}px`, 
                                    '--y': `${Math.sin(angle) * distance}px`,
                                    backgroundColor: ['#2dd4bf', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#a855f7'][Math.floor(Math.random() * 6)],
                                    left: '50%',
                                    top: '50%',
                                    width: `${6 + Math.random() * 8}px`,
                                    height: `${6 + Math.random() * 8}px`,
                                } as any}
                            />
                        );
                    })}
                </div>
            )}

            {/* Reject Celebration Effect Overlay */}
            {isRejectCelebrating && (
                <div className="celebration-overlay">
                    <div className="celebration-emoji" style={{ fontSize: '100px' }}>❌</div>
                    {[...Array(40)].map((_, i) => {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 100 + Math.random() * 200;
                        return (
                            <div 
                                key={i} 
                                className="particle" 
                                style={{ 
                                    '--x': `${Math.cos(angle) * distance}px`, 
                                    '--y': `${Math.sin(angle) * distance}px`,
                                    backgroundColor: ['#ef4444', '#dc2626', '#991b1b', '#f87171'][Math.floor(Math.random() * 4)],
                                    left: '50%',
                                    top: '50%',
                                    width: `${6 + Math.random() * 8}px`,
                                    height: `${6 + Math.random() * 8}px`,
                                } as any}
                            />
                        );
                    })}
                </div>
            )}

            {/* Custom Approve Modal */}
            {showApproveModal && (
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
                        maxWidth: '450px',
                        width: '90%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        textAlign: 'center'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '20px', color: '#16a34a' }}>
                                <CheckCircle2 size={40} />
                            </div>
                        </div>
                        
                        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>Confirmar Aprobación</h2>
                        <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '28px', lineHeight: '1.6' }}>
                            ¿Estás seguro de que deseas aprobar esta solicitud de anticipo? Esta acción notificará al solicitante y continuará el proceso financiero.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowApproveModal(false)}
                                style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmApprove}
                                disabled={isProcessing}
                                style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', backgroundColor: '#16a34a', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 10px rgba(22, 163, 74, 0.2)' }}
                            >
                                {isProcessing ? "Aprobando..." : "Sí, Aprobar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
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
                        maxWidth: '450px',
                        width: '90%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ padding: '10px', backgroundColor: '#fef2f2', borderRadius: '12px', color: '#dc2626' }}>
                                <XCircle size={24} />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Rechazar Solicitud</h2>
                        </div>
                        
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                            Por favor, indica el motivo por el cual estás rechazando esta solicitud. El solicitante podrá ver esta información.
                        </p>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Motivo de rechazo (Opcional)</label>
                            <textarea
                                rows={4}
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Ej: Faltan soportes, el monto excede el presupuesto..."
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '14px',
                                    outline: 'none',
                                    resize: 'none',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isProcessing}
                                style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#dc2626', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                            >
                                {isProcessing ? "Procesando..." : "Confirmar Rechazo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
