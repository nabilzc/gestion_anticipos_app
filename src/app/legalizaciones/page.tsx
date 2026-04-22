"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Search,
    ChevronRight,
    Loader2,
    Calendar,
    Receipt
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, isAnticipoVencido } from "@/lib/utils/businessLogic";

export default function LegalizacionesListPage() {
    const { user } = useAuth();
    const [anticipos, setAnticipos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        async function fetchToLegalize() {
            if (!user) return;
            try {
                // Buscamos anticipos en estado Desembolsado o Abierto para legalizar
                const { data, error } = await supabase
                    .from("anticipos")
                    .select("*")
                    .in("status", ["Desembolsado", "Abierto", "Legalizado"])
                    .order("created_at", { ascending: false });

                if (error) throw error;
                setAnticipos(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchToLegalize();
    }, [user]);

    const filtered = anticipos.filter(a => 
        (a.motivo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.id || "").toString().includes(searchTerm)
    );

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', paddingBottom: '60px' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>Legalización de Gastos</h1>
                <p style={{ color: 'var(--muted-foreground)' }}>Reporta tus gastos dentro de los 5 días hábiles permitidos.</p>
            </div>

            {/* Barra de Búsqueda */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                <input 
                    type="text" 
                    placeholder="Buscar anticipo por ID o motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--muted)', outline: 'none' }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></div>
            ) : filtered.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filtered.map(a => {
                        const vencido = isAnticipoVencido(a);
                        return (
                            <Link 
                                key={a.id} 
                                href={`/legalizaciones/${a.id}`}
                                style={{ 
                                    textDecoration: 'none', 
                                    background: '#fff', 
                                    borderRadius: '20px', 
                                    padding: '20px', 
                                    border: '1px solid var(--border)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ 
                                        width: '48px', 
                                        height: '48px', 
                                        borderRadius: '14px', 
                                        background: vencido ? '#fef2f2' : (a.status === 'Legalizado' ? '#f0fdf4' : '#eff6ff'), 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        color: vencido ? '#dc2626' : (a.status === 'Legalizado' ? '#16a34a' : '#2563eb')
                                    }}>
                                        <Receipt size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>#ANT-{String(a.id).padStart(4, '0')}</div>
                                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{a.motivo}</div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: '700' }}>
                                                {formatCurrency(a.monto_total)}
                                            </span>
                                            {vencido && (
                                                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: '700' }}>
                                                    VENCIDO
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={20} color="#94a3b8" />
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>No tienes legalizaciones pendientes</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Tus gastos están al día. ¡Buen trabajo!</p>
                </div>
            )}
        </div>
    );
}
