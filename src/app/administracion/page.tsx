"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Clock, Pencil, X, Save, Building2, Plus } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: string | null;
    programa: string | null;
    region: string | null;
    centro_costos_id: string | null;
}

interface CentroCosto {
    id: string;
    codigo: string;
    nombre: string;
    programa: string;
}

interface UserEditForm {
    role: string;
    programa: string;
    region: string;
    centro_costos_id: string;
}

interface CentroCostoForm {
    codigo: string;
    nombre: string;
    programa: string;
}

export default function AdministracionPage() {
    const [activeTab, setActiveTab] = useState<"usuarios" | "centros">("usuarios");
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [centrosCostos, setCentrosCostos] = useState<CentroCosto[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [editForm, setEditForm] = useState<UserEditForm>({ role: "", programa: "", region: "", centro_costos_id: "" });
    const [showCentroModal, setShowCentroModal] = useState(false);
    const [editingCentro, setEditingCentro] = useState<CentroCosto | null>(null);
    const [centroForm, setCentroForm] = useState<CentroCostoForm>({ codigo: "", nombre: "", programa: "PAS" });
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profilesRes, centrosRes] = await Promise.all([
                supabase.from("profiles").select("*").order("full_name", { ascending: true }),
                supabase.from("centros_costos").select("*").order("nombre", { ascending: true })
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (centrosRes.error && centrosRes.error.code !== '42P01') {
                console.error("Error fetching centros:", centrosRes.error);
            }

            setProfiles((profilesRes.data as UserProfile[]) || []);
            setCentrosCostos((centrosRes.data as CentroCosto[]) || []);
        } catch (err) {
            console.error("Error fetching data:", err);
            toast.error("Error al cargar los datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEditClick = (user: UserProfile) => {
        setEditingUser(user);
        setEditForm({
            role: user.role || "Solicitante",
            programa: user.programa || "PAS",
            region: user.region || "",
            centro_costos_id: user.centro_costos_id || ""
        });
    };

    const handleCentroCostosChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        const selectedCC = centrosCostos.find((centro) => String(centro.id) === String(newId));
        
        let newPrograma = editForm.programa;
        if (selectedCC && selectedCC.programa) {
            newPrograma = selectedCC.programa;
        }

        setEditForm({
            ...editForm,
            centro_costos_id: newId,
            programa: newPrograma
        });
    };

    const openCreateCentroModal = () => {
        setEditingCentro(null);
        setCentroForm({ codigo: "", nombre: "", programa: "PAS" });
        setShowCentroModal(true);
    };

    const openEditCentroModal = (centro: CentroCosto) => {
        setEditingCentro(centro);
        setCentroForm({
            codigo: centro.codigo || "",
            nombre: centro.nombre || "",
            programa: centro.programa || "PAS"
        });
        setShowCentroModal(true);
    };

    const closeCentroModal = () => {
        setShowCentroModal(false);
        setEditingCentro(null);
        setCentroForm({ codigo: "", nombre: "", programa: "PAS" });
    };

    const handleSave = async () => {
        if (!editingUser) return;
        setSaving(true);
        try {
            const updateData: {
                role: string;
                programa: string;
                centro_costos_id: string | null;
                region?: string | null;
            } = {
                role: editForm.role, 
                programa: editForm.programa, 
                centro_costos_id: editForm.centro_costos_id || null
            };
            
            // Validar región para PAS
            if (editForm.programa === "PAS") {
                if (!editForm.region) {
                    toast.error("La región es obligatoria para el programa PAS");
                    setSaving(false);
                    return;
                }
                updateData.region = editForm.region;
            } else {
                updateData.region = editForm.region || null;
            }

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', editingUser.id);

            if (error) throw error;
            
            toast.success('Usuario actualizado con éxito');
            setEditingUser(null);
            fetchData();
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Error al actualizar el usuario");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCentroCosto = async () => {
        if (!centroForm.codigo.trim() || !centroForm.nombre.trim() || !centroForm.programa.trim()) {
            toast.error("Código, nombre y programa son obligatorios");
            return;
        }

        setSaving(true);
        try {
            if (editingCentro) {
                const { error } = await supabase
                    .from("centros_costos")
                    .update({
                        codigo: centroForm.codigo.trim(),
                        nombre: centroForm.nombre.trim(),
                        programa: centroForm.programa.trim(),
                    })
                    .eq("id", editingCentro.id);

                if (error) throw error;
                toast.success("Centro de costos actualizado con éxito");
            } else {
                const { error } = await supabase
                    .from("centros_costos")
                    .insert({
                        codigo: centroForm.codigo.trim(),
                        nombre: centroForm.nombre.trim(),
                        programa: centroForm.programa.trim(),
                    });

                if (error) throw error;
                toast.success("Centro de costos creado con éxito");
            }

            closeCentroModal();
            fetchData();
        } catch (error: unknown) {
            console.error("Error saving centro de costos:", error);
            const message = error instanceof Error ? error.message : "No se pudo guardar el centro de costos";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px', paddingTop: '40px' }}>
            <Toaster position="top-right" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {activeTab === "usuarios" ? <Users size={24} color="var(--primary)" /> : <Building2 size={24} color="var(--primary)" />}
                        {activeTab === "usuarios" ? "Panel de Usuarios" : "Centros de Costos"}
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>
                        {activeTab === "usuarios"
                            ? "Gestión de roles y asignaciones del programa"
                            : "Administra códigos, nombres y programas de centros de costos"}
                    </p>
                </div>

                {activeTab === "centros" && (
                    <button
                        onClick={openCreateCentroModal}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 16px",
                            borderRadius: "10px",
                            border: "none",
                            background: "var(--primary)",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: 600
                        }}
                    >
                        <Plus size={16} /> Nuevo centro
                    </button>
                )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <button
                    onClick={() => setActiveTab("usuarios")}
                    style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: activeTab === "usuarios" ? "1px solid transparent" : "1px solid var(--border)",
                        background: activeTab === "usuarios" ? "var(--primary)" : "transparent",
                        color: activeTab === "usuarios" ? "white" : "var(--foreground)",
                        cursor: "pointer",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}
                >
                    <Users size={16} /> Usuarios
                </button>
                <button
                    onClick={() => setActiveTab("centros")}
                    style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: activeTab === "centros" ? "1px solid transparent" : "1px solid var(--border)",
                        background: activeTab === "centros" ? "var(--primary)" : "transparent",
                        color: activeTab === "centros" ? "white" : "var(--foreground)",
                        cursor: "pointer",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}
                >
                    <Building2 size={16} /> Centros de Costos
                </button>
            </div>

            {activeTab === "usuarios" && (
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--muted)', fontSize: '12px', fontWeight: '600', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '12px 20px' }}>Nombre</th>
                                    <th style={{ padding: '12px 20px' }}>Email</th>
                                    <th style={{ padding: '12px 20px' }}>Rol</th>
                                    <th style={{ padding: '12px 20px' }}>Centro de Costos</th>
                                    <th style={{ padding: '12px 20px' }}>Programa</th>
                                    <th style={{ padding: '12px 20px' }}>Región</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--muted-foreground)' }}>
                                                <Clock size={20} className="animate-spin" /> Cargando usuarios...
                                            </div>
                                        </td>
                                    </tr>
                                ) : profiles.length > 0 ? (
                                    profiles.map((profile) => (
                                        <tr key={profile.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                                            <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--foreground)' }}>
                                                {profile.full_name || "Sin nombre"}
                                            </td>
                                            <td style={{ padding: '16px 20px', color: 'var(--muted-foreground)' }}>
                                                {profile.email}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{
                                                    padding: "4px 10px",
                                                    borderRadius: "12px",
                                                    fontSize: "12px",
                                                    fontWeight: 600,
                                                    backgroundColor: profile.role?.includes('Administrador') ? '#fef2f2' : '#f1f5f9',
                                                    color: profile.role?.includes('Administrador') ? '#ef4444' : '#64748b',
                                                    display: "inline-block"
                                                }}>
                                                    {profile.role || "Sin rol"}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                {profile.centro_costos_id ? (centrosCostos.find((centro) => String(centro.id) === String(profile.centro_costos_id))?.nombre || profile.centro_costos_id) : "-"}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                {profile.programa || "-"}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                {profile.region || "-"}
                                            </td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleEditClick(profile)}
                                                    title="Editar usuario"
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '4px' }}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '60px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                                            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--foreground)' }}>No se encontraron usuarios</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "centros" && (
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--muted)', fontSize: '12px', fontWeight: '600', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '12px 20px' }}>Código</th>
                                    <th style={{ padding: '12px 20px' }}>Nombre</th>
                                    <th style={{ padding: '12px 20px' }}>Programa</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '40px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--muted-foreground)' }}>
                                                <Clock size={20} className="animate-spin" /> Cargando centros de costos...
                                            </div>
                                        </td>
                                    </tr>
                                ) : centrosCostos.length > 0 ? (
                                    centrosCostos.map((centro) => (
                                        <tr key={centro.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                                            <td style={{ padding: '16px 20px', fontWeight: 600 }}>{centro.codigo}</td>
                                            <td style={{ padding: '16px 20px' }}>{centro.nombre}</td>
                                            <td style={{ padding: '16px 20px' }}>{centro.programa}</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => openEditCentroModal(centro)}
                                                    title="Editar centro de costos"
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '4px' }}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '60px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏷️</div>
                                            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--foreground)' }}>No hay centros de costos registrados</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {editingUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--background)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Editar Usuario</h3>
                            <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--muted-foreground)' }}>
                                Editando a: <strong>{editingUser.full_name || editingUser.email}</strong>
                            </p>
                            
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Rol</label>
                            <select 
                                value={editForm.role}
                                onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            >
                                <option value="Administrador Global">Administrador Global</option>
                                <option value="Administrador">Administrador</option>
                                <option value="Revisor">Revisor</option>
                                <option value="Aprobador">Aprobador</option>
                                <option value="Solicitante">Solicitante</option>
                            </select>

                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Centro de Costos</label>
                            <select 
                                value={editForm.centro_costos_id || ""}
                                onChange={handleCentroCostosChange}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            >
                                <option value="">- Ninguno -</option>
                                {centrosCostos.map((centro) => (
                                    <option key={centro.id} value={centro.id}>{centro.nombre} {centro.codigo ? `(${centro.codigo})` : ''}</option>
                                ))}
                            </select>

                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Programa</label>
                            <select 
                                value={editForm.programa}
                                onChange={(e) => setEditForm({...editForm, programa: e.target.value})}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            >
                                <option value="PAS">PAS</option>
                                <option value="Administrativo">Administrativo</option>
                                <option value="Otro">Otro</option>
                            </select>

                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                Región {editForm.programa === 'PAS' && <span style={{color: 'red'}}>*</span>}
                            </label>
                            <input 
                                type="text"
                                value={editForm.region}
                                onChange={(e) => setEditForm({...editForm, region: e.target.value})}
                                placeholder="Ej: Bogotá, Antioquia..."
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px', backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: (editForm.programa === 'PAS' && !editForm.region) ? 'red' : 'var(--border)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => setEditingUser(null)}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: '500', color: 'var(--foreground)' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', opacity: saving ? 0.7 : 1 }}
                            >
                                {saving ? <Clock size={18} className="animate-spin" /> : <Save size={18} />}
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCentroModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--background)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                                {editingCentro ? "Editar Centro de Costos" : "Nuevo Centro de Costos"}
                            </h3>
                            <button onClick={closeCentroModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Código</label>
                        <input
                            type="text"
                            value={centroForm.codigo}
                            onChange={(e) => setCentroForm({ ...centroForm, codigo: e.target.value })}
                            placeholder="Ej: CC-001"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                        />

                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Nombre</label>
                        <input
                            type="text"
                            value={centroForm.nombre}
                            onChange={(e) => setCentroForm({ ...centroForm, nombre: e.target.value })}
                            placeholder="Ej: Centro Administrativo Bogotá"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                        />

                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Programa</label>
                        <select
                            value={centroForm.programa}
                            onChange={(e) => setCentroForm({ ...centroForm, programa: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                        >
                            <option value="PAS">PAS</option>
                            <option value="Administrativo">Administrativo</option>
                            <option value="Otro">Otro</option>
                        </select>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={closeCentroModal}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: '500', color: 'var(--foreground)' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveCentroCosto}
                                disabled={saving}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', opacity: saving ? 0.7 : 1 }}
                            >
                                {saving ? <Clock size={18} className="animate-spin" /> : <Save size={18} />}
                                {saving ? 'Guardando...' : editingCentro ? 'Actualizar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
