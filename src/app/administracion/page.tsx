"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Clock, Pencil, X, Save, Settings, Plus, Trash2, FolderKanban, Wallet, Network } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function AdministracionPage() {
    const [activeTab, setActiveTab] = useState<'usuarios' | 'maestro'>('usuarios');
    const [profiles, setProfiles] = useState<any[]>([]);
    
    // Maestro Data
    const [programasProyectos, setProgramasProyectos] = useState<any[]>([]);
    const [centrosCostos, setCentrosCostos] = useState<any[]>([]);
    const [conexiones, setConexiones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // User Edit States
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editForm, setEditForm] = useState({ role: '', programa: '', region: '', centro_costos_id: '' });
    const [saving, setSaving] = useState(false);

    // Form States for Maestro
    const [newEstructuraForm, setNewEstructuraForm] = useState({ nombre: '', tipo: 'Programa' });
    const [newCentroForm, setNewCentroForm] = useState({ codigo: '', nombre: '' });
    const [newConexionForm, setNewConexionForm] = useState({ centro_costos_id: '', estructura_id: '' });
    const [addingMaestro, setAddingMaestro] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profilesRes, centrosRes, programasRes, conexionesRes] = await Promise.all([
                supabase.from("profiles").select("*").order("full_name", { ascending: true }),
                supabase.from("centros_costos").select("*").order("nombre", { ascending: true }),
                supabase.from("programas_proyectos_areas").select("*").order("nombre", { ascending: true }),
                supabase.from("conexiones_financieras").select("*")
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (centrosRes.error && centrosRes.error.code !== '42P01') console.error("Error fetching centros:", centrosRes.error);
            if (programasRes.error && programasRes.error.code !== '42P01') console.error("Error fetching programas:", programasRes.error);
            if (conexionesRes.error && conexionesRes.error.code !== '42P01') console.error("Error fetching conexiones:", conexionesRes.error);

            setProfiles(profilesRes.data || []);
            setCentrosCostos(centrosRes.data || []);
            setProgramasProyectos(programasRes.data || []);
            setConexiones(conexionesRes.data || []);
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

    // -------- USER EDIT LOGIC --------
    const handleEditClick = (user: any) => {
        setEditingUser(user);
        setEditForm({
            role: user.role || 'Solicitante',
            programa: user.programa || '',
            region: user.region || '',
            centro_costos_id: user.centro_costos_id || ''
        });
    };

    const handleSaveUser = async () => {
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

            const { error } = await supabase.from('profiles').update(updateData).eq('id', editingUser.id);
            if (error) {
                console.error("Supabase Error [Update Profile]:", error);
                throw error;
            }
            
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

    // -------- MAESTRO LOGIC --------
    const handleAddEstructura = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEstructuraForm.nombre.trim()) return;
        setAddingMaestro(true);
        try {
            const { error } = await supabase.from('programas_proyectos_areas').insert([{ 
                nombre: newEstructuraForm.nombre.trim(),
                tipo: newEstructuraForm.tipo,
                activo: true
            }]);
            if (error) {
                console.error("Supabase Error [Insert programas_proyectos_areas]:", error);
                throw error;
            }
            toast.success('Estructura añadida con éxito');
            setNewEstructuraForm({ nombre: '', tipo: 'Programa' });
            fetchData();
        } catch (error) {
            console.error("Error adding estructura:", error);
            toast.error("Error al añadir la estructura");
        } finally {
            setAddingMaestro(false);
        }
    };

    const handleDeleteEstructura = async (id: string) => {
        if (!window.confirm("¿Está seguro de eliminar esta estructura?")) return;
        try {
            const { error } = await supabase.from('programas_proyectos_areas').delete().eq('id', id);
            if (error) {
                console.error("Supabase Error [Delete programas_proyectos_areas]:", error);
                throw error;
            }
            toast.success('Estructura eliminada');
            fetchData();
        } catch (error) {
            console.error("Error deleting estructura:", error);
            toast.error("Error al eliminar la estructura");
        }
    };

    const handleAddCentroCostos = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCentroForm.nombre.trim() || !newCentroForm.codigo.trim()) return;
        setAddingMaestro(true);
        try {
            const { error } = await supabase.from('centros_costos').insert([{ 
                codigo: newCentroForm.codigo.trim(), 
                nombre: newCentroForm.nombre.trim()
            }]);
            if (error) {
                console.error("Supabase Error [Insert centros_costos]:", error);
                throw error;
            }
            toast.success('Centro de Costos añadido con éxito');
            setNewCentroForm({ codigo: '', nombre: '' });
            fetchData();
        } catch (error) {
            console.error("Error adding centro de costos:", error);
            toast.error("Error al añadir el Centro de Costos");
        } finally {
            setAddingMaestro(false);
        }
    };

    const handleDeleteCentroCostos = async (id: string) => {
        if (!window.confirm("¿Está seguro de eliminar este Centro de Costos?")) return;
        try {
            const { error } = await supabase.from('centros_costos').delete().eq('id', id);
            if (error) {
                console.error("Supabase Error [Delete centros_costos]:", error);
                throw error;
            }
            toast.success('Centro de Costos eliminado');
            fetchData();
        } catch (error) {
            console.error("Error deleting centro de costos:", error);
            toast.error("Error al eliminar el Centro de Costos");
        }
    };

    const handleAddConexion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newConexionForm.centro_costos_id || !newConexionForm.estructura_id) return;
        setAddingMaestro(true);
        try {
            const { error } = await supabase.from('conexiones_financieras').insert([{ 
                centro_costos_id: newConexionForm.centro_costos_id,
                estructura_id: newConexionForm.estructura_id
            }]);
            if (error) {
                console.error("Supabase Error [Insert conexiones_financieras]:", error);
                throw error;
            }
            toast.success('Conexión creada con éxito');
            setNewConexionForm({ centro_costos_id: '', estructura_id: '' });
            fetchData();
        } catch (error) {
            console.error("Error adding conexion:", error);
            toast.error("Error al crear la conexión");
        } finally {
            setAddingMaestro(false);
        }
    };

    const handleDeleteConexion = async (id: string) => {
        if (!window.confirm("¿Está seguro de eliminar esta conexión?")) return;
        try {
            const { error } = await supabase.from('conexiones_financieras').delete().eq('id', id);
            if (error) {
                console.error("Supabase Error [Delete conexiones_financieras]:", error);
                throw error;
            }
            toast.success('Conexión eliminada');
            fetchData();
        } catch (error) {
            console.error("Error deleting conexion:", error);
            toast.error("Error al eliminar la conexión");
        }
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px', paddingTop: '40px' }}>
            <Toaster position="top-right" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={28} color="var(--primary)" /> Administración
                    </h1>
                    <p style={{ fontSize: '15px', color: 'var(--muted-foreground)' }}>Gestión del sistema, usuarios y configuración maestra</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', gap: '16px' }}>
                <button
                    onClick={() => setActiveTab('usuarios')}
                    style={{
                        padding: '12px 24px', fontSize: '15px', fontWeight: '600', backgroundColor: 'transparent', border: 'none',
                        borderBottom: activeTab === 'usuarios' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'usuarios' ? 'var(--primary)' : 'var(--muted-foreground)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease'
                    }}
                >
                    <Users size={18} /> Usuarios
                </button>
                <button
                    onClick={() => setActiveTab('maestro')}
                    style={{
                        padding: '12px 24px', fontSize: '15px', fontWeight: '600', backgroundColor: 'transparent', border: 'none',
                        borderBottom: activeTab === 'maestro' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'maestro' ? 'var(--primary)' : 'var(--muted-foreground)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease'
                    }}
                >
                    <Settings size={18} /> Configuración Maestro
                </button>
            </div>

            {/* TAB: USUARIOS */}
            {activeTab === 'usuarios' && (
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--muted)', fontSize: '12px', fontWeight: '600', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '12px 20px' }}>Nombre</th>
                                    <th style={{ padding: '12px 20px' }}>Email</th>
                                    <th style={{ padding: '12px 20px' }}>Rol</th>
                                    <th style={{ padding: '12px 20px' }}>Centro de Costos</th>
                                    <th style={{ padding: '12px 20px' }}>Programa/Proyecto</th>
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
                                            <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--foreground)' }}>{p.full_name || "Sin nombre"}</td>
                                            <td style={{ padding: '16px 20px', color: 'var(--muted-foreground)' }}>{p.email}</td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: p.role?.includes('Administrador') ? '#fef2f2' : '#f1f5f9', color: p.role?.includes('Administrador') ? '#ef4444' : '#64748b', display: "inline-block" }}>
                                                    {p.role || "Sin rol"}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                {p.centro_costos_id ? (centrosCostos.find(c => String(c.id) === String(p.centro_costos_id))?.nombre || p.centro_costos_id) : "-"}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>{p.programa || "-"}</td>
                                            <td style={{ padding: '16px 20px' }}>{p.region || "-"}</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                <button onClick={() => handleEditClick(p)} title="Editar usuario" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '4px' }}>
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

            {/* TAB: CONFIGURACIÓN MAESTRO */}
            {activeTab === 'maestro' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', alignItems: 'start' }}>
                    
                    {/* Cajón 1: Estructuras Operativas */}
                    <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FolderKanban size={20} className="text-primary" /> Estructuras Operativas
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '20px' }}>
                            Crea Programas, Proyectos o Áreas organizacionales.
                        </p>
                        
                        <form onSubmit={handleAddEstructura} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                            <select 
                                value={newEstructuraForm.tipo}
                                onChange={(e) => setNewEstructuraForm({...newEstructuraForm, tipo: e.target.value})}
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', minWidth: '110px' }}
                            >
                                <option value="Programa">Programa</option>
                                <option value="Proyecto">Proyecto</option>
                                <option value="Área">Área</option>
                            </select>
                            <input 
                                type="text" 
                                value={newEstructuraForm.nombre}
                                onChange={(e) => setNewEstructuraForm({...newEstructuraForm, nombre: e.target.value})}
                                placeholder="Nombre..." 
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            />
                            <button 
                                type="submit"
                                disabled={addingMaestro || !newEstructuraForm.nombre.trim()}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: (addingMaestro || !newEstructuraForm.nombre.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
                            >
                                <Plus size={18} /> Añadir
                            </button>
                        </form>

                        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', flex: 1 }}>
                            {programasProyectos.length > 0 ? (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                    {programasProyectos.map((p, index) => (
                                        <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: index < programasProyectos.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted-foreground)', backgroundColor: 'var(--muted)', padding: '2px 8px', borderRadius: '12px' }}>{p.tipo}</span>
                                                <span style={{ fontWeight: '500' }}>{p.nombre}</span>
                                                {p.activo === false && <span style={{ fontSize: '10px', color: 'red', border: '1px solid red', padding: '1px 4px', borderRadius: '4px' }}>Inactivo</span>}
                                            </div>
                                            <button onClick={() => handleDeleteEstructura(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Eliminar">
                                                <Trash2 size={16} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '14px' }}>
                                    No hay estructuras creadas
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cajón 2: Fuentes de Dinero */}
                    <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Wallet size={20} className="text-primary" /> Fuentes de Dinero
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '20px' }}>
                            Crea los Centros de Costos independientes.
                        </p>

                        <form onSubmit={handleAddCentroCostos} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                            <input 
                                type="text" 
                                value={newCentroForm.codigo}
                                onChange={(e) => setNewCentroForm({...newCentroForm, codigo: e.target.value})}
                                placeholder="Cód..." 
                                style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            />
                            <input 
                                type="text" 
                                value={newCentroForm.nombre}
                                onChange={(e) => setNewCentroForm({...newCentroForm, nombre: e.target.value})}
                                placeholder="Nombre del centro..." 
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            />
                            <button 
                                type="submit"
                                disabled={addingMaestro || !newCentroForm.codigo.trim() || !newCentroForm.nombre.trim()}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: (addingMaestro || !newCentroForm.codigo.trim() || !newCentroForm.nombre.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
                            >
                                <Plus size={18} /> Añadir
                            </button>
                        </form>

                        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', flex: 1 }}>
                            {centrosCostos.length > 0 ? (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                    {centrosCostos.map((cc, index) => (
                                        <li key={cc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: index < centrosCostos.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>{cc.codigo}</span>
                                                <span style={{ fontWeight: '500' }}>{cc.nombre}</span>
                                                {cc.activo === false && <span style={{ fontSize: '10px', color: 'red', border: '1px solid red', padding: '1px 4px', borderRadius: '4px' }}>Inactivo</span>}
                                            </div>
                                            <button onClick={() => handleDeleteCentroCostos(cc.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Eliminar">
                                                <Trash2 size={16} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '14px' }}>
                                    No hay centros de costos creados
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cajón 3: Centro de Conexiones */}
                    <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Network size={20} className="text-primary" /> Centro de Conexiones
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '20px' }}>
                            Une un Centro de Costo con una Estructura Operativa.
                        </p>

                        <form onSubmit={handleAddConexion} style={{ display: 'grid', gap: '8px', marginBottom: '24px' }}>
                            <select 
                                value={newConexionForm.centro_costos_id}
                                onChange={(e) => setNewConexionForm({...newConexionForm, centro_costos_id: e.target.value})}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            >
                                <option value="">Selecciona Centro de Costos...</option>
                                {centrosCostos.map(cc => <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.nombre}</option>)}
                            </select>

                            <select 
                                value={newConexionForm.estructura_id}
                                onChange={(e) => setNewConexionForm({...newConexionForm, estructura_id: e.target.value})}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            >
                                <option value="">Selecciona Estructura (Prog/Proy)...</option>
                                {programasProyectos.map(p => <option key={p.id} value={p.id}>[{p.tipo}] {p.nombre}</option>)}
                            </select>

                            <button 
                                type="submit"
                                disabled={addingMaestro || !newConexionForm.centro_costos_id || !newConexionForm.estructura_id}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: (addingMaestro || !newConexionForm.centro_costos_id || !newConexionForm.estructura_id) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '500', width: '100%' }}
                            >
                                <Plus size={18} /> Crear Conexión
                            </button>
                        </form>

                        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', flex: 1 }}>
                            {conexiones.length > 0 ? (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                    {conexiones.map((cx, index) => {
                                        const cCostos = centrosCostos.find(c => c.id === cx.centro_costos_id);
                                        const cProg = programasProyectos.find(p => p.id === cx.estructura_id);
                                        return (
                                            <li key={cx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: index < conexiones.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '13px' }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: 'var(--foreground)' }}>{cCostos?.nombre || 'CC Desconocido'}</div>
                                                    <div style={{ color: 'var(--muted-foreground)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Network size={12} /> {cProg?.nombre || 'Estructura Desconocida'}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteConexion(cx.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Eliminar Conexión">
                                                    <Trash2 size={16} />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '14px' }}>
                                    No hay conexiones activas
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición de Usuario */}
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

                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}><Wallet size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> Centro de Costos</label>
                            <select 
                                value={editForm.centro_costos_id || ""}
                                onChange={(e) => setEditForm({...editForm, centro_costos_id: e.target.value})}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            >
                                <option value="">- Ninguno -</option>
                                {centrosCostos.map(cc => (
                                    <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.nombre}</option>
                                ))}
                            </select>

                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}><FolderKanban size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> Programa/Proyecto</label>
                            <select 
                                value={editForm.programa}
                                onChange={(e) => setEditForm({...editForm, programa: e.target.value})}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            >
                                <option value="">- Ninguno -</option>
                                {programasProyectos.map(p => (
                                    <option key={p.id} value={p.nombre}>[{p.tipo}] {p.nombre}</option>
                                ))}
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
                                onClick={handleSaveUser}
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
