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
    Receipt,
    Plus,
    Wallet
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, isAnticipoVencido } from "@/lib/utils/businessLogic";

type TabType = "con-anticipo" | "sin-anticipo";

export default function LegalizacionesListPage() {
    const { user } = useAuth();
    const [anticipos, setAnticipos] = useState<any[]>([]);
    const [directas, setDirectas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<TabType>("con-anticipo");

    useEffect(() => {
        async function fetchData() {
            if (!user) return;
            try {
                // Anticipos normales para legalizar
                const { data: anticiposData, error: anticiposError } = await supabase
                    .from("anticipos")
                    .select("*")
                    .in("status", ["Desembolsado", "Abierto", "Legalizado"])
                    .or("tipo.is.null,tipo.neq.legalizacion_directa")
                    .order("created_at", { ascending: false });

                if (anticiposError) throw anticiposError;
                setAnticipos(anticiposData || []);

                // Legalizaciones directas (sin anticipo)
                const { data: directasData, error: directasError } = await supabase
                    .from("anticipos")
                    .select("*, profiles:solicitante_id(full_name)")
                    .eq("tipo", "legalizacion_directa")
                    .order("created_at", { ascending: false });

                if (directasError) throw directasError;
                setDirectas(directasData || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user]);

    const filteredAnticipos = anticipos.filter(a => 
        (a.motivo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.id || "").toString().includes(searchTerm)
    );

    const filteredDirectas = directas.filter(a =>
        (a.motivo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.id || "").toString().includes(searchTerm)
    );

    const getStatusBadge = (status: string) => {
        const map: Record<string, { bg: string; color: string; label: string }> = {
            'En Revisión': { bg: '#fef3c7', color: '#92400e', label: 'En Revisión' },
            'Aprobado': { bg: '#dcfce7', color: '#166534', label: 'Aprobado' },
            'Rechazado': { bg: '#fee2e2', color: '#991b1b', label: 'Rechazado' },
            'Reembolsado': { bg: '#dbeafe', color: '#1e40af', label: 'Reembolsado' },
            'Legalizado': { bg: '#f0fdf4', color: '#16a34a', label: 'Legalizado' },
        };
        return map[status] || { bg: '#f1f5f9', color: '#475569', label: status };
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', paddingBottom: '60px' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>Legalizaciones</h1>
                <p style={{ color: 'var(--muted-foreground)' }}>Gestiona tus legalizaciones de gastos.</p>
            </div>

            {/* Tabs */}
            <div style={{ 
                display: 'flex', 
                gap: '4px', 
                marginBottom: '24px', 
                background: '#f1f5f9', 
                borderRadius: '16px', 
                padding: '4px' 
            }}>
                <button
                    onClick={() => { setActiveTab("con-anticipo"); setSearchTerm(""); }}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'con-anticipo' ? '#fff' : 'transparent',
                        color: activeTab === 'con-anticipo' ? '#1e293b' : '#64748b',
                        fontWeight: activeTab === 'con-anticipo' ? '700' : '500',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'con-anticipo' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <Receipt size={16} />
                    Legalización de Gastos
                    {anticipos.length > 0 && (
                        <span style={{
                            background: activeTab === 'con-anticipo' ? '#2563eb' : '#94a3b8',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            minWidth: '20px',
                            textAlign: 'center'
                        }}>{anticipos.length}</span>
                    )}
                </button>
                <button
                    onClick={() => { setActiveTab("sin-anticipo"); setSearchTerm(""); }}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'sin-anticipo' ? '#fff' : 'transparent',
                        color: activeTab === 'sin-anticipo' ? '#1e293b' : '#64748b',
                        fontWeight: activeTab === 'sin-anticipo' ? '700' : '500',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'sin-anticipo' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <Wallet size={16} />
                    Gastos sin Anticipo
                    {directas.length > 0 && (
                        <span style={{
                            background: activeTab === 'sin-anticipo' ? '#f59e0b' : '#94a3b8',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            minWidth: '20px',
                            textAlign: 'center'
                        }}>{directas.length}</span>
                    )}
                </button>
            </div>

            {/* Barra de Búsqueda */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                <input 
                    type="text" 
                    placeholder={activeTab === 'con-anticipo' ? "Buscar anticipo por ID o motivo..." : "Buscar legalización directa..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--muted)', outline: 'none' }}
                />
            </div>

            {/* TAB: Con Anticipo */}
            {activeTab === 'con-anticipo' && (
                <>
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>Reporta tus gastos dentro de los 5 días hábiles permitidos.</p>
                    </div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></div>
                    ) : filteredAnticipos.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {filteredAnticipos.map(a => {
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
                </>
            )}

            {/* TAB: Sin Anticipo */}
            {activeTab === 'sin-anticipo' && (
                <>
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ color: 'var(--muted-foreground)', fontSize: '13px', margin: 0 }}>
                                Registra gastos realizados sin solicitud de anticipo previa para gestionar tu reembolso.
                            </p>
                        </div>
                        <Link
                            href="/legalizaciones/directa/nueva"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                background: '#1e293b',
                                color: '#fff',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                fontSize: '13px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(30,41,59,0.15)'
                            }}
                        >
                            <Plus size={16} />
                            Nueva Legalización
                        </Link>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></div>
                    ) : filteredDirectas.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {filteredDirectas.map(a => {
                                const badge = getStatusBadge(a.status);
                                return (
                                    <Link 
                                        key={a.id} 
                                        href={`/legalizaciones/directa/${a.id}`}
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
                                                background: '#fef3c7', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                color: '#f59e0b'
                                            }}>
                                                <Wallet size={24} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                                                    #LD-{String(a.id).substring(0, 8)}
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{a.motivo}</div>
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: '700' }}>
                                                        {formatCurrency(a.monto_total)}
                                                    </span>
                                                    <span style={{ 
                                                        fontSize: '11px', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px', 
                                                        background: badge.bg, 
                                                        color: badge.color, 
                                                        fontWeight: '700' 
                                                    }}>
                                                        {badge.label}
                                                    </span>
                                                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: '700' }}>
                                                        SIN ANTICIPO
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} color="#94a3b8" />
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fffbeb', borderRadius: '24px', border: '2px dashed #fde68a' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Sin legalizaciones directas</h3>
                            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', marginBottom: '20px' }}>
                                ¿Realizaste un gasto sin solicitar anticipo? Crea una legalización directa para gestionar tu reembolso.
                            </p>
                            <Link
                                href="/legalizaciones/directa/nueva"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    background: '#1e293b',
                                    color: '#fff',
                                    borderRadius: '14px',
                                    textDecoration: 'none',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    boxShadow: '0 4px 12px rgba(30,41,59,0.15)'
                                }}
                            >
                                <Plus size={18} />
                                Crear Legalización Directa
                            </Link>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
