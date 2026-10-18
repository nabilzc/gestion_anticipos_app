"use client";

import React, { useEffect, useState } from "react";
import { Loader2, User, FileSearch } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { ESTADO, formatCurrency, formatDate } from "@/lib/utils/businessLogic";
import { aprobarComoAprobador, cerrarLegalizacion, devolverLegalizacion, etiquetaAnticipo } from "@/lib/legalizacion";
import RevisionLegalizacionModal from "@/components/RevisionLegalizacionModal";

interface Props {
    modo: 'aprobador' | 'finanzas';
    revisorEmail: string;
    // null = ver todas (Administrador Global)
    filtroAprobadorEmail: string | null;
    onCount?: (n: number) => void;
}

export default function LegalizacionesPorRevisar({ modo, revisorEmail, filtroAprobadorEmail, onCount }: Props) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [seleccionado, setSeleccionado] = useState<any>(null);

    const estado = modo === 'aprobador' ? ESTADO.REVISION_APROBADOR : ESTADO.REVISION_FINANZAS;

    const cargar = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("anticipos")
                .select("*, profiles:solicitante_id (full_name, email)")
                .eq("status", estado);
            if (filtroAprobadorEmail) {
                query = query.eq("aprobador_email", filtroAprobadorEmail.toLowerCase());
            }
            const { data, error } = await query.order("created_at", { ascending: true });
            if (error) throw error;
            setItems(data || []);
            onCount?.(data?.length || 0);
        } catch (err: any) {
            console.error(err);
            toast.error(`Error al cargar legalizaciones: ${err?.message || 'desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estado, filtroAprobadorEmail]);

    if (loading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} />
            </div>
        );
    }

    return (
        <>
            {items.length === 0 ? (
                <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '56px', marginBottom: '20px' }}>📂</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--foreground)' }}>Sin legalizaciones pendientes</div>
                    <div style={{ fontSize: '15px', color: 'var(--muted-foreground)', marginTop: '6px' }}>
                        {modo === 'aprobador' ? 'No hay legalizaciones esperando tu revisión.' : 'No hay legalizaciones esperando cierre.'}
                    </div>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>Legalización</th>
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>Trabajador</th>
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Monto</th>
                                <th style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(a => (
                                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontWeight: '800', color: 'var(--primary)' }}>{etiquetaAnticipo(a)}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                                            {a.tipo === 'legalizacion_directa' ? 'Sin anticipo · ' : ''}
                                            Cargada el {formatDate(a.metadata_legalizacion?.fecha_carga || a.created_at)}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <User size={16} color="#64748b" />
                                            <div>
                                                <div style={{ fontWeight: '600' }}>{a.profiles?.full_name || 'Trabajador'}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{a.motivo}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(a.monto_total)}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setSeleccionado(a)}
                                            style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', backgroundColor: modo === 'aprobador' ? '#0d9488' : '#d97706', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700' }}
                                        >
                                            <FileSearch size={16} /> Revisar soportes
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {seleccionado && (
                <RevisionLegalizacionModal
                    anticipo={seleccionado}
                    titulo={modo === 'aprobador' ? 'Revisión del aprobador' : 'Cierre de legalización'}
                    aprobarLabel={modo === 'aprobador' ? 'Revisado y aprobado' : 'Legalización finalizada y cerrada'}
                    onAprobar={() => modo === 'aprobador'
                        ? aprobarComoAprobador(seleccionado, revisorEmail)
                        : cerrarLegalizacion(seleccionado, revisorEmail)}
                    onDevolver={(motivo) => devolverLegalizacion(
                        seleccionado,
                        revisorEmail,
                        modo === 'aprobador' ? 'Aprobador' : 'Contabilidad y Finanzas',
                        motivo,
                    )}
                    onClose={() => { setSeleccionado(null); cargar(); }}
                />
            )}
        </>
    );
}
