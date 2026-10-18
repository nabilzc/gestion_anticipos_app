"use client";

import React, { useState } from "react";
import { X, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency, formatDate } from "@/lib/utils/businessLogic";
import { etiquetaAnticipo } from "@/lib/legalizacion";

interface Props {
    anticipo: any;
    titulo: string;
    aprobarLabel?: string;
    readOnly?: boolean;
    onAprobar?: () => Promise<void>;
    onDevolver?: (motivo: string) => Promise<void>;
    onClose: () => void;
}

export default function RevisionLegalizacionModal({ anticipo, titulo, aprobarLabel, readOnly, onAprobar, onDevolver, onClose }: Props) {
    const [motivo, setMotivo] = useState("");
    const [procesando, setProcesando] = useState(false);
    const [imagen, setImagen] = useState<string | null>(null);

    const meta = anticipo.metadata_legalizacion || {};
    const soportes: any[] = meta.soportes || [];
    const imagenes = soportes.filter(s => (s.type || '').startsWith('image/'));
    const documentos = soportes.filter(s => !(s.type || '').startsWith('image/'));
    const esDirecta = anticipo.tipo === 'legalizacion_directa';
    const totalLegalizado: number | null = meta.total_legalizado ?? null;
    const diferencia = totalLegalizado != null ? anticipo.monto_total - totalLegalizado : null;
    const tieneReintegro = soportes.some(s => s.categoria === 'reintegro');

    const ejecutar = async (accion: () => Promise<void>, exito: string) => {
        setProcesando(true);
        const t = toast.loading("Procesando...");
        try {
            await accion();
            toast.success(exito, { id: t });
            onClose();
        } catch (err: any) {
            toast.error(err?.message || "Error al procesar", { id: t });
        } finally {
            setProcesando(false);
        }
    };

    const devolver = () => {
        if (!motivo.trim()) {
            toast.error("Escribe el motivo del rechazo para que el trabajador sepa qué corregir");
            return;
        }
        ejecutar(() => onDevolver!(motivo.trim()), "Legalización devuelta al trabajador");
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '720px', backgroundColor: 'var(--background)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{titulo}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ overflowY: 'auto', paddingRight: '4px', marginBottom: '20px', flex: 1 }}>
                    <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                            {etiquetaAnticipo(anticipo)} {esDirecta && '· Gasto sin anticipo'} · Estado: <strong>{anticipo.status}</strong>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{anticipo.profiles?.full_name || 'Trabajador'}</div>
                        <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>{anticipo.motivo}</div>
                        {meta.fecha_carga && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Cargada el {formatDate(meta.fecha_carga)}</div>}
                        {meta.revision_aprobador && (
                            <div style={{ fontSize: '12px', color: '#0d9488', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={14} /> Revisada y aprobada por {meta.revision_aprobador.email} el {formatDate(meta.revision_aprobador.fecha)}
                            </div>
                        )}
                    </div>

                    {/* Conciliación */}
                    <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                            <span style={{ color: '#64748b' }}>{esDirecta ? 'Monto del gasto' : 'Anticipo desembolsado'}</span>
                            <strong>{formatCurrency(anticipo.monto_total)}</strong>
                        </div>
                        {!esDirecta && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                                <span style={{ color: '#64748b' }}>Total legalizado</span>
                                <strong>{totalLegalizado != null ? formatCurrency(totalLegalizado) : 'No informado'}</strong>
                            </div>
                        )}
                        {diferencia != null && !esDirecta && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                                <span style={{ fontWeight: '700' }}>
                                    {diferencia > 0 ? 'Reintegro a FUNDAEC' : diferencia < 0 ? 'Saldo a favor del trabajador' : 'Legalización exacta'}
                                </span>
                                <strong style={{ color: diferencia > 0 ? '#ea580c' : diferencia < 0 ? '#2563eb' : '#16a34a' }}>{formatCurrency(Math.abs(diferencia))}</strong>
                            </div>
                        )}
                        {diferencia != null && diferencia > 0 && !esDirecta && (
                            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '700', color: tieneReintegro ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {tieneReintegro ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                {tieneReintegro ? 'Comprobante de reintegro adjunto' : 'Falta el comprobante de reintegro'}
                            </div>
                        )}
                    </div>

                    {meta.devolucion && (
                        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '13px', color: '#991b1b' }}>
                            <strong>Devuelta anteriormente por {meta.devolucion.por}:</strong> {meta.devolucion.motivo}
                        </div>
                    )}

                    <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#1e293b' }}>Documentos</h4>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                        {documentos.map((s, i) => (
                            <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: s.categoria === 'reintegro' ? '#fff7ed' : '#eff6ff', border: `1px solid ${s.categoria === 'reintegro' ? '#fed7aa' : '#bfdbfe'}`, borderRadius: '12px', textDecoration: 'none', color: s.categoria === 'reintegro' ? '#c2410c' : '#1d4ed8', fontWeight: '600', fontSize: '13px' }}>
                                <FileText size={18} />
                                {s.description || 'Documento'}
                            </a>
                        ))}
                        {documentos.length === 0 && <span style={{ fontSize: '13px', color: '#64748b' }}>No hay documentos.</span>}
                    </div>

                    <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#1e293b' }}>Facturas y recibos</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                        {imagenes.map((s, i) => (
                            <div key={i} onClick={() => setImagen(s.url)} title={s.description} style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${s.categoria === 'reintegro' ? '#fdba74' : '#e2e8f0'}`, aspectRatio: '1', backgroundColor: '#f8fafc' }}>
                                <img src={s.url} alt={s.description} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ))}
                        {imagenes.length === 0 && <span style={{ fontSize: '13px', color: '#64748b', gridColumn: '1 / -1' }}>No hay imágenes cargadas.</span>}
                    </div>

                    {!readOnly && (
                        <>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Motivo del rechazo (obligatorio solo si rechazas)</label>
                            <textarea
                                rows={3}
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Ej: falta la factura del almuerzo del día 2..."
                                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', resize: 'none' }}
                            />
                        </>
                    )}
                </div>

                {!readOnly && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0, borderTop: '1px solid #e2e8f0', paddingTop: '20px', flexWrap: 'wrap' }}>
                        <button onClick={devolver} disabled={procesando} style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: '600', cursor: procesando ? 'not-allowed' : 'pointer', opacity: procesando ? 0.7 : 1 }}>
                            Rechazar y devolver
                        </button>
                        <button onClick={() => ejecutar(onAprobar!, "Registrado correctamente")} disabled={procesando} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#16a34a', color: 'white', fontWeight: '700', cursor: procesando ? 'not-allowed' : 'pointer', opacity: procesando ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {procesando && <Loader2 size={16} className="animate-spin" />}
                            {aprobarLabel}
                        </button>
                    </div>
                )}
            </div>

            {imagen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }} onClick={() => setImagen(null)}>
                    <img src={imagen} alt="Soporte" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
                    <button onClick={() => setImagen(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X size={32} />
                    </button>
                </div>
            )}
        </div>
    );
}
