"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Clock, Pencil, X, Save } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function AdministracionPage() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [centrosCostos, setCentrosCostos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editForm, setEditForm] = useState({ role: '', programa: '', region: '', centro_costos_id: '' });
    const [saving, setSaving] = useState(false);

    const fetchProfiles = async () => {
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

            setProfiles(profilesRes.data || []);
            setCentrosCostos(centrosRes.data || []);
        } catch (err) {
            console.error("Error fetching data:", err);
            toast.error("Error al cargar los datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleEditClick = (user: any) => {
        setEditingUser(user);
        setEditForm({
            role: user.role || 'Solicitante',
            programa: user.programa || 'PAS',
            region: user.region || '',
            centro_costos_id: user.centro_costos_id || ''
        });
    };

    const handleCentroCostosChange = (e: any) => {
        const newId = e.target.value;
        const selectedCC = centrosCostos.find(c => String(c.id) === String(newId));
        
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

    const handleSave = async () => {
        if (!editingUser) return;
        setSaving(true);
        try {
            const updateData: any = { 
                role: editForm.role, 
                programa: editForm.programa, 
                centro_costos_id: editForm.centro_costos_id || null
            };
            
            // Validar región para PAS
            if (editForm.programa === 'PAS') {
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
            fetchProfiles();
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Error al actualizar el usuario");
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
                        <Users size={24} color="var(--primary)" /> Panel de Usuarios
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Gestión de roles y asignaciones del programa</p>
                </div>
            </div>

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
                                profiles.map((p) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                                        <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--foreground)' }}>
                                            {p.full_name || "Sin nombre"}
                                        </td>
                                        <td style={{ padding: '16px 20px', color: 'var(--muted-foreground)' }}>
                                            {p.email}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <span style={{
                                                padding: "4px 10px",
                                                borderRadius: "12px",
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                backgroundColor: p.role?.includes('Administrador') ? '#fef2f2' : '#f1f5f9',
                                                color: p.role?.includes('Administrador') ? '#ef4444' : '#64748b',
                                                display: "inline-block"
                                            }}>
                                                {p.role || "Sin rol"}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            {p.centro_costos_id ? (centrosCostos.find(c => String(c.id) === String(p.centro_costos_id))?.nombre || p.centro_costos_id) : "-"}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            {p.programa || "-"}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            {p.region || "-"}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => handleEditClick(p)}
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
                                {centrosCostos.map(cc => (
                                    <option key={cc.id} value={cc.id}>{cc.nombre} {cc.codigo ? `(${cc.codigo})` : ''}</option>
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
        </div>
    );
}
