"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, Eye, Clock, Search } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { isAnticipoVencido, formatCurrency, formatDate } from "@/lib/utils/businessLogic";

export default function MisAnticiposPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [anticipos, setAnticipos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        async function fetchAnticipos() {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from("anticipos")
                    .select("*")
                    .eq("solicitante_id", user.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;
                setAnticipos(data || []);
            } catch (err) {
                console.error("Error fetching anticipos:", err);
                toast.error("Error al cargar tus anticipos");
            } finally {
                setLoading(false);
            }
        }

        fetchAnticipos();
    }, [user]);

    const filteredAnticipos = anticipos.filter(a =>
        (a.motivo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.id || "").toString().includes(searchTerm)
    );

    const getStatusBadge = (anticipo: any) => {
        const isVencido = isAnticipoVencido(anticipo);
        const status = isVencido ? "Vencido" : anticipo.status;

        const styles: Record<string, any> = {
            "Borrador": { bg: "#f1f5f9", text: "#64748b" },
            "Enviado": { bg: "#eff6ff", text: "#2563eb" },
            "Pendiente": { bg: "#fffbeb", text: "#d97706" },
            "Aprobado": { bg: "#f0fdf4", text: "#16a34a" },
            "Rechazado": { bg: "#fef2f2", text: "#ef4444" },
            "Cerrado": { bg: "#fafafa", text: "#71717a" },
            "Vencido": { bg: "#fef2f2", text: "#ef4444" },
            "Abierto": { bg: "#eff6ff", text: "#2563eb" },
            "Desembolsado": { bg: "#f0fdf4", text: "#16a34a" },
        };

        const style = styles[status] || styles["Borrador"];

        return (
            <span style={{
                padding: "4px 10px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: style.bg,
                color: style.text,
                display: "inline-block"
            }}>
                {status}
            </span>
        );
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
            <Toaster position="top-right" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '4px' }}>Mis Anticipos</h1>
                    <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Gestiona y consulta el estado de tus solicitudes</p>
                </div>
                <button
                    onClick={() => router.push("/solicitudes/nueva")}
                    className="primary-button"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white' }}
                >
                    <Plus size={18} /> Nueva Solicitud
                </button>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por concepto o ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px 10px 40px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                fontSize: '14px',
                                outline: 'none',
                                backgroundColor: 'var(--muted)'
                            }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--muted)', fontSize: '12px', fontWeight: '600', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '12px 20px' }}>ID / Fecha</th>
                                <th style={{ padding: '12px 20px' }}>Concepto</th>
                                <th style={{ padding: '12px 20px' }}>Valor</th>
                                <th style={{ padding: '12px 20px' }}>Estado</th>
                                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--muted-foreground)' }}>
                                            <Clock size={20} className="animate-spin" /> Cargando solicitudes...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredAnticipos.length > 0 ? (
                                filteredAnticipos.map((a) => (
                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ fontWeight: '700', color: 'var(--primary)' }}>#ANT-{String(a.id).slice(-4)}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                                                {formatDate(a.created_at)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px', maxWidth: '300px' }}>
                                            <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.motivo}>
                                                {a.motivo || "Sin descripción"}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>{a.proyecto}</div>
                                        </td>
                                        <td style={{ padding: '16px 20px', fontWeight: '600' }}>
                                            {formatCurrency(a.monto_total || 0)}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            {getStatusBadge(a)}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => router.push(`/mis-anticipos/${a.id}`)}
                                                style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--muted-foreground)', cursor: 'pointer', transition: 'all 0.2s' }}
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--foreground)' }}>No se encontraron solicitudes</div>
                                        <div style={{ fontSize: '14px', color: 'var(--muted-foreground)', marginTop: '4px' }}>Comienza creando una nueva solicitud de anticipo</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
