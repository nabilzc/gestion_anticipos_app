"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Clock, Pencil, X, Save, Settings, Plus, Trash2, FolderKanban, Wallet, Network, ShieldCheck, Send, Receipt, FileText, Eye, ChevronDown, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import toast, { Toaster } from "react-hot-toast";

export default function AdministracionPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'usuarios' | 'maestro' | 'aprobadores' | 'anticipos'>('usuarios');
    const [profiles, setProfiles] = useState<any[]>([]);
    
    // Maestro Data
    const [programasProyectos, setProgramasProyectos] = useState<any[]>([]);
    const [centrosCostos, setCentrosCostos] = useState<any[]>([]);
    const [conexiones, setConexiones] = useState<any[]>([]);
    const [responsables, setResponsables] = useState<any[]>([]);
    const [allAnticipos, setAllAnticipos] = useState<any[]>([]);
    const [perfilesAutorizados, setPerfilesAutorizados] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // User Edit States
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editForm, setEditForm] = useState({ 
        role: '', 
        programa: '', 
        region: '', 
        centro_costos_id: '',
        telefono: '',
        es_solicitante: false,
        es_aprobador: false,
        responsabilidades: [] as string[]
    });
    const [saving, setSaving] = useState(false);

    // Form States for Maestro
    const [newEstructuraForm, setNewEstructuraForm] = useState({ nombre: '', tipo: 'Programa' });
    const [editingEstructuraId, setEditingEstructuraId] = useState<string | null>(null);
    const [newCentroForm, setNewCentroForm] = useState({ codigo: '', nombre: '' });
    const [newConexionForm, setNewConexionForm] = useState({ centro_costos_id: '', estructura_id: '' });
    const [newPerfilForm, setNewPerfilForm] = useState<{email: string, nombre_completo: string, es_solicitante: boolean, es_aprobador: boolean, es_administrador: boolean, ids_programa_area: string[]}>({ email: '', nombre_completo: '', es_solicitante: false, es_aprobador: false, es_administrador: false, ids_programa_area: [] });
    const [editingPerfil, setEditingPerfil] = useState(false);
    const [showEstructuraDropdown, setShowEstructuraDropdown] = useState(false);
    const [addingMaestro, setAddingMaestro] = useState(false);
    const [savingAprobador, setSavingAprobador] = useState<string | null>(null);
    // Key: email solicitante, Value: boolean (open/closed)
    const [openAprobadorDropdown, setOpenAprobadorDropdown] = useState<Record<string, boolean>>({});
    // Key: email solicitante, Value: [principalEmail, suplenteEmail]
    const [aprobadoresSeleccionados, setAprobadoresSeleccionados] = useState<Record<string, string[]>>({}); 

    // Audit Modal States
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditAnticipo, setAuditAnticipo] = useState<any>(null);
    const [auditObservation, setAuditObservation] = useState('');
    const [isProcessingAudit, setIsProcessingAudit] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profilesRes, centrosRes, programasRes, anticiposRes, perfilesAuthRes] = await Promise.all([
                supabase.from("profiles").select("*").order("full_name", { ascending: true }),
                supabase.from("centros_costos").select("*").order("nombre", { ascending: true }),
                supabase.from("programas_proyectos_areas").select("*").order("nombre", { ascending: true }),
                supabase.from("anticipos").select("*, profiles:solicitante_id(full_name, email)").order("created_at", { ascending: false }),
                supabase.from("perfiles_autorizados").select("*")
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (centrosRes.error && centrosRes.error.code !== '42P01') console.error("Error fetching centros:", centrosRes.error);
            if (programasRes.error && programasRes.error.code !== '42P01') console.error("Error fetching programas:", programasRes.error);
            if (anticiposRes.error && anticiposRes.error.code !== '42P01') console.error("Error fetching anticipos:", anticiposRes.error);
            if (perfilesAuthRes.error && perfilesAuthRes.error.code !== '42P01') console.error("Error fetching perfiles_auth:", perfilesAuthRes.error);

            setProfiles(profilesRes.data || []);
            setCentrosCostos(centrosRes.data || []);
            setProgramasProyectos(programasRes.data || []);
            setAllAnticipos(anticiposRes.data || []);
            setPerfilesAutorizados(perfilesAuthRes.data || []);
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
        
        const userResponsabilidades = responsables
            .filter(r => String(r.usuario_id) === String(user.id))
            .map(r => String(r.estructura_id));

        setEditForm({
            role: user.role || 'Solicitante',
            programa: user.programa || '',
            region: user.region || '',
            centro_costos_id: user.centro_costos_id || '',
            telefono: user.telefono || '',
            es_solicitante: user.es_solicitante || false,
            es_aprobador: user.es_aprobador || false,
            responsabilidades: userResponsabilidades
        });
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        setSaving(true);
        try {
            const updateData: any = { 
                role: editForm.role, 
                programa: editForm.programa, 
                centro_costos_id: editForm.centro_costos_id || null,
                telefono: editForm.telefono,
                es_solicitante: editForm.es_solicitante,
                es_aprobador: editForm.es_aprobador
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
            
            // Sincronizar Responsabilidades
            const { error: delError } = await supabase.from('responsables_programas').delete().eq('usuario_id', editingUser.id);
            if (delError && delError.code !== '42P01') {
                console.error("Error borrando responsabilidades:", delError);
            }
            
            if (editForm.responsabilidades.length > 0 && editForm.es_aprobador) {
                const newResponsables = editForm.responsabilidades.map(eid => ({
                    usuario_id: editingUser.id,
                    estructura_id: eid
                }));
                const { error: insError } = await supabase.from('responsables_programas').insert(newResponsables);
                if (insError && insError.code !== '42P01') {
                    console.error("Supabase Error [Insert Responsables]:", insError);
                }
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
    const handleSaveEstructura = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEstructuraForm.nombre.trim()) return;
        setAddingMaestro(true);
        try {
            const payload = {
                nombre: newEstructuraForm.nombre.trim(),
                tipo: newEstructuraForm.tipo,
                activo: true
            };

            if (editingEstructuraId) {
                const { error } = await supabase.from('programas_proyectos_areas').update(payload).eq('id', editingEstructuraId);
                if (error) {
                    console.error("Supabase Error [Update programas_proyectos_areas]:", error);
                    throw error;
                }
                toast.success('Estructura actualizada con éxito');
                setEditingEstructuraId(null);
            } else {
                const { error } = await supabase.from('programas_proyectos_areas').insert([payload]);
                if (error) {
                    console.error("Supabase Error [Insert programas_proyectos_areas]:", error);
                    throw error;
                }
                toast.success('Estructura añadida con éxito');
            }
            setNewEstructuraForm({ nombre: '', tipo: 'Programa' });
            fetchData();
        } catch (error) {
            console.error("Error saving estructura:", error);
            toast.error("Error al guardar la estructura");
        } finally {
            setAddingMaestro(false);
        }
    };

    const handleEditEstructuraClick = (p: any) => {
        setNewEstructuraForm({ nombre: p.nombre, tipo: p.tipo });
        setEditingEstructuraId(p.id);
    };

    const handleCancelEditEstructura = () => {
        setNewEstructuraForm({ nombre: '', tipo: 'Programa' });
        setEditingEstructuraId(null);
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

    const handleSavePerfilAutorizado = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPerfilForm.email || newPerfilForm.ids_programa_area.length === 0) return;
        setAddingMaestro(true);
        try {
            const payload = {
                email: newPerfilForm.email.toLowerCase().trim(),
                nombre_completo: newPerfilForm.nombre_completo.trim(),
                es_solicitante: newPerfilForm.es_solicitante,
                es_aprobador: newPerfilForm.es_aprobador,
                es_administrador: newPerfilForm.es_administrador,
                ids_programa_area: newPerfilForm.ids_programa_area
            };
            if (editingPerfil) {
                const { error } = await supabase.from('perfiles_autorizados').update(payload).eq('email', payload.email);
                if (error) throw error;
                toast.success("Perfil autorizado actualizado");
            } else {
                const { error } = await supabase.from('perfiles_autorizados').insert([payload]);
                if (error) throw error;
                toast.success("Perfil autorizado añadido");
            }
            setNewPerfilForm({ email: '', nombre_completo: '', es_solicitante: false, es_aprobador: false, es_administrador: false, ids_programa_area: [] });
            setEditingPerfil(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message || "Error al guardar perfil autorizado");
        } finally {
            setAddingMaestro(false);
        }
    };

    const handleEditPerfilClick = (p: any) => {
        setNewPerfilForm({
            email: p.email,
            nombre_completo: p.nombre_completo || '',
            es_solicitante: p.es_solicitante || false,
            es_aprobador: p.es_aprobador || false,
            es_administrador: p.es_administrador || false,
            ids_programa_area: p.ids_programa_area || []
        });
        setEditingPerfil(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEditPerfil = () => {
        setNewPerfilForm({ email: '', nombre_completo: '', es_solicitante: false, es_aprobador: false, es_administrador: false, ids_programa_area: [] });
        setEditingPerfil(false);
    };

    const handleDeletePerfilAutorizado = async (email: string) => {
        if (!window.confirm("¿Está seguro de eliminar este perfil autorizado?")) return;
        try {
            const { error } = await supabase.from('perfiles_autorizados').delete().eq('email', email);
            if (error) throw error;
            toast.success("Perfil autorizado eliminado");
            fetchData();
        } catch (err: any) {
            toast.error(err.message || "Error al eliminar perfil autorizado");
        }
    };

    const handleOpenAudit = (anticipo: any) => {
        setAuditAnticipo(anticipo);
        setAuditObservation('');
        setShowAuditModal(true);
    };

    const handleAprobarAudit = async () => {
        if (!auditAnticipo) return;
        setIsProcessingAudit(true);
        const loadingToast = toast.loading("Finalizando legalización...");
        try {
            const { error } = await supabase.from('anticipos').update({ status: 'Finalizado' }).eq('id', auditAnticipo.id);
            if (error) throw error;
            toast.success("Legalización aprobada y finalizada", { id: loadingToast });
            setShowAuditModal(false);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Error al aprobar", { id: loadingToast });
        } finally {
            setIsProcessingAudit(false);
        }
    };

    const handleRechazarAudit = async () => {
        if (!auditAnticipo || !auditObservation.trim()) {
            toast.error("Las observaciones son requeridas para rechazar");
            return;
        }
        setIsProcessingAudit(true);
        const loadingToast = toast.loading("Rechazando legalización...");
        try {
            const { error } = await supabase.from('anticipos').update({ 
                status: 'Rechazado',
                motivo_rechazo: auditObservation
            }).eq('id', auditAnticipo.id);
            if (error) throw error;
            toast.success("Legalización rechazada", { id: loadingToast });
            setShowAuditModal(false);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Error al rechazar", { id: loadingToast });
        } finally {
            setIsProcessingAudit(false);
        }
    };

    const isGlobalAdmin = user?.profile?.role === 'Administrador Global' || user?.email === 'nzapata@fundaec.org';

    useEffect(() => {
        if (!authLoading && !isGlobalAdmin) {
            router.push('/');
        }
    }, [isGlobalAdmin, authLoading, router]);

    if (authLoading || !isGlobalAdmin) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={40} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px', paddingTop: '40px' }}>
            <Toaster position="top-right" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={28} color="var(--primary)" /> Administración
                    </h1>
                    <p style={{ fontSize: '15px', color: 'var(--muted-foreground)' }}>Consola de Gestión de Talento y Configuración Maestra</p>
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
                    <Users size={18} /> Talento y Permisos
                </button>
                <button
                    onClick={() => setActiveTab('aprobadores')}
                    style={{
                        padding: '12px 24px', fontSize: '15px', fontWeight: '600', backgroundColor: 'transparent', border: 'none',
                        borderBottom: activeTab === 'aprobadores' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'aprobadores' ? 'var(--primary)' : 'var(--muted-foreground)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease'
                    }}
                >
                    <UserCheck size={18} /> Asignación de Aprobadores
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
                <button
                    onClick={() => setActiveTab('anticipos')}
                    style={{
                        padding: '12px 24px', fontSize: '15px', fontWeight: '600', backgroundColor: 'transparent', border: 'none',
                        borderBottom: activeTab === 'anticipos' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'anticipos' ? 'var(--primary)' : 'var(--muted-foreground)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease'
                    }}
                >
                    <Receipt size={18} /> Gestión de Anticipos
                </button>
            </div>

            {/* TAB: USUARIOS */}
            {activeTab === 'usuarios' && (
                <div style={{ display: 'grid', gap: '24px' }}>
                    {/* Formulario para nuevo perfil */}
                    <div className="card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                {editingPerfil ? <Pencil size={20} className="text-primary" /> : <Plus size={20} className="text-primary" />} 
                                {editingPerfil ? 'Editar Usuario Autorizado' : 'Añadir Usuario Autorizado (Pre-registro)'}
                            </h2>
                            {editingPerfil && (
                                <button onClick={handleCancelEditPerfil} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: '13px', fontWeight: '500', textDecoration: 'underline' }}>
                                    Cancelar Edición
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleSavePerfilAutorizado} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)' }}>Correo @fundaec.org <span style={{color: 'red'}}>*</span></label>
                                    <input 
                                        type="email" 
                                        required
                                        disabled={editingPerfil}
                                        value={newPerfilForm.email}
                                        onChange={(e) => setNewPerfilForm({...newPerfilForm, email: e.target.value})}
                                        placeholder="Ej: jperez@fundaec.org"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: editingPerfil ? 'var(--muted)' : 'var(--background)', color: 'var(--foreground)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)' }}>Nombre Completo</label>
                                    <input 
                                        type="text" 
                                        value={newPerfilForm.nombre_completo}
                                        onChange={(e) => setNewPerfilForm({...newPerfilForm, nombre_completo: e.target.value})}
                                        placeholder="Ej: Juan Perez"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)' }}>Estructuras Vinculadas (Selecciona una o más) <span style={{color: 'red'}}>*</span></label>
                                    
                                    {/* Botón / Header del Dropdown */}
                                    <div 
                                        onClick={() => setShowEstructuraDropdown(!showEstructuraDropdown)}
                                        style={{ 
                                            width: '100%', 
                                            minHeight: '42px',
                                            padding: '8px 12px', 
                                            borderRadius: '8px', 
                                            border: '1px solid var(--border)', 
                                            backgroundColor: 'var(--background)', 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            {newPerfilForm.ids_programa_area.length === 0 ? (
                                                <span style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>Seleccionar estructuras...</span>
                                            ) : (
                                                newPerfilForm.ids_programa_area.map(id => {
                                                    const est = programasProyectos.find(p => p.id === id);
                                                    return est ? (
                                                        <span key={id} style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {est.nombre}
                                                        </span>
                                                    ) : null;
                                                })
                                            )}
                                        </div>
                                        <ChevronDown size={18} style={{ color: 'var(--muted-foreground)', transform: showEstructuraDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </div>

                                    {/* Menú Desplegable */}
                                    {showEstructuraDropdown && (
                                        <>
                                            <div 
                                                onClick={() => setShowEstructuraDropdown(false)} 
                                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                                            />
                                            <div style={{ 
                                                position: 'absolute', 
                                                top: '100%', 
                                                left: 0, 
                                                right: 0, 
                                                zIndex: 11, 
                                                marginTop: '4px',
                                                backgroundColor: 'var(--background)', 
                                                border: '1px solid var(--border)', 
                                                borderRadius: '8px',
                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                                maxHeight: '250px',
                                                overflowY: 'auto',
                                                padding: '8px'
                                            }}>
                                                {programasProyectos.map(p => (
                                                    <label 
                                                        key={p.id} 
                                                        style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '10px', 
                                                            padding: '8px 12px', 
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            transition: 'background-color 0.2s',
                                                            backgroundColor: newPerfilForm.ids_programa_area.includes(p.id) ? 'var(--muted)' : 'transparent'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = newPerfilForm.ids_programa_area.includes(p.id) ? 'var(--muted)' : 'transparent'}
                                                    >
                                                        <input 
                                                            type="checkbox"
                                                            checked={newPerfilForm.ids_programa_area.includes(p.id)}
                                                            onChange={(e) => {
                                                                const current = [...newPerfilForm.ids_programa_area];
                                                                if (e.target.checked) current.push(p.id);
                                                                else {
                                                                    const idx = current.indexOf(p.id);
                                                                    if (idx > -1) current.splice(idx, 1);
                                                                }
                                                                setNewPerfilForm({...newPerfilForm, ids_programa_area: current});
                                                            }}
                                                            style={{ width: '16px', height: '16px' }}
                                                        />
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{p.nombre}</span>
                                                            <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{p.tipo}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)' }}>Roles de Acceso (Selecciona uno o más)</label>
                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', padding: '16px', backgroundColor: 'var(--muted)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>
                                        <input 
                                            type="checkbox"
                                            checked={newPerfilForm.es_solicitante}
                                            onChange={(e) => setNewPerfilForm({...newPerfilForm, es_solicitante: e.target.checked})}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <Send size={16} color="var(--primary)" /> Solicitante
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>
                                        <input 
                                            type="checkbox"
                                            checked={newPerfilForm.es_aprobador}
                                            onChange={(e) => setNewPerfilForm({...newPerfilForm, es_aprobador: e.target.checked})}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <ShieldCheck size={16} color="#10b981" /> Aprobador
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>
                                        <input 
                                            type="checkbox"
                                            checked={newPerfilForm.es_administrador}
                                            onChange={(e) => setNewPerfilForm({...newPerfilForm, es_administrador: e.target.checked})}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <ShieldCheck size={16} color="#ef4444" /> Administrador
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button 
                                    type="submit"
                                    disabled={addingMaestro || !newPerfilForm.email || newPerfilForm.ids_programa_area.length === 0}
                                    style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: (addingMaestro || !newPerfilForm.email || newPerfilForm.ids_programa_area.length === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
                                >
                                    <Save size={18} /> {editingPerfil ? 'Actualizar Perfil' : 'Guardar Perfil'}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--muted)', fontSize: '12px', fontWeight: '600', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '12px 20px' }}>Email</th>
                                        <th style={{ padding: '12px 20px' }}>Nombre</th>
                                        <th style={{ padding: '12px 20px' }}>Roles de Acceso</th>
                                        <th style={{ padding: '12px 20px' }}>Estructura Vinculada</th>
                                        <th style={{ padding: '12px 20px', textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--muted-foreground)' }}>
                                                    <Clock size={20} className="animate-spin" /> Cargando perfiles...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : perfilesAutorizados.length > 0 ? (
                                        perfilesAutorizados.map((p) => {
                                            const estructuras = p.ids_programa_area && p.ids_programa_area.length > 0 
                                                ? p.ids_programa_area.map((id: string) => programasProyectos.find(ep => ep.id === id)).filter(Boolean)
                                                : [];
                                            return (
                                                <tr key={p.email} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                                                    <td style={{ padding: '16px 20px', fontWeight: '500', color: 'var(--foreground)' }}>
                                                        {p.email}
                                                        {p.email === 'nzapata@fundaec.org' && <span style={{ marginLeft: '8px', padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 800, backgroundColor: '#000', color: '#fff', textTransform: 'uppercase' }}>Global</span>}
                                                    </td>
                                                    <td style={{ padding: '16px 20px', color: 'var(--muted-foreground)' }}>{p.nombre_completo || "-"}</td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            {p.es_solicitante && <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, backgroundColor: '#eff6ff', color: '#2563eb' }}>Solicitante</span>}
                                                            {p.es_aprobador && <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, backgroundColor: '#ecfdf5', color: '#10b981' }}>Aprobador</span>}
                                                            {p.es_administrador && <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, backgroundColor: '#fef2f2', color: '#ef4444' }}>Administrador</span>}
                                                            {!p.es_solicitante && !p.es_aprobador && !p.es_administrador && <span style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}>Sin rol</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {estructuras.length > 0 ? estructuras.map((est: any, idx: number) => (
                                                                <span key={idx} style={{ fontSize: '12px', color: 'var(--foreground)' }}>
                                                                    <span style={{ fontWeight: '600', color: 'var(--muted-foreground)' }}>[{est.tipo}]</span> {est.nombre}
                                                                </span>
                                                            )) : <span style={{ color: 'var(--muted-foreground)' }}>-</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                            <button onClick={() => handleEditPerfilClick(p)} title="Editar Perfil" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '4px' }}>
                                                                <Pencil size={18} />
                                                            </button>
                                                            <button onClick={() => handleDeletePerfilAutorizado(p.email)} title="Eliminar Perfil" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                                                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--foreground)' }}>No hay perfiles autorizados registrados</div>
                                                <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '8px' }}>Agrega un usuario para darle acceso al sistema.</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
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
                        
                        <form onSubmit={handleSaveEstructura} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                            <select 
                                value={newEstructuraForm.tipo}
                                onChange={(e) => setNewEstructuraForm({...newEstructuraForm, tipo: e.target.value})}
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', minWidth: '110px' }}
                            >
                                <option value="Programa">Programa</option>
                                <option value="Proyecto">Proyecto</option>
                                <option value="Area">Area</option>
                            </select>
                            <input 
                                type="text" 
                                value={newEstructuraForm.nombre}
                                onChange={(e) => setNewEstructuraForm({...newEstructuraForm, nombre: e.target.value})}
                                placeholder="Nombre..." 
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            />
                            {editingEstructuraId && (
                                <button 
                                    type="button"
                                    onClick={handleCancelEditEstructura}
                                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: 'pointer', fontWeight: '500' }}
                                >
                                    Cancelar
                                </button>
                            )}
                            <button 
                                type="submit"
                                disabled={addingMaestro || !newEstructuraForm.nombre.trim()}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: (addingMaestro || !newEstructuraForm.nombre.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
                            >
                                {editingEstructuraId ? <Save size={18} /> : <Plus size={18} />}
                                {editingEstructuraId ? 'Guardar' : 'Añadir'}
                            </button>
                        </form>

                        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', flex: 1 }}>
                            {programasProyectos.length > 0 ? (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                    {programasProyectos.map((p, index) => (
                                        <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: index < programasProyectos.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '14px', backgroundColor: editingEstructuraId === p.id ? 'var(--muted)' : 'transparent' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted-foreground)', backgroundColor: 'var(--background)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border)' }}>{p.tipo}</span>
                                                <span style={{ fontWeight: '500' }}>{p.nombre}</span>
                                                {p.activo === false && <span style={{ fontSize: '10px', color: 'red', border: '1px solid red', padding: '1px 4px', borderRadius: '4px' }}>Inactivo</span>}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => handleEditEstructuraClick(p)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '4px' }} title="Editar">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteEstructura(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Eliminar">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
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


                </div>
            )}

            {/* TAB: ASIGNACIÓN DE APROBADORES */}
            {activeTab === 'aprobadores' && (
                <div style={{ display: 'grid', gap: '24px' }}>
                    <div className="card" style={{ padding: '24px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 6px 0' }}>
                                <UserCheck size={20} color="var(--primary)" /> Asignación Jerárquica de Aprobadores
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', margin: 0 }}>
                                Asigna hasta <strong>2 aprobadores</strong> por solicitante (Principal y Suplente). Solo aparecen personas con rol Aprobador que comparten estructura operativa.
                            </p>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--muted)', fontSize: '12px', fontWeight: '600', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '12px 20px' }}>Solicitante</th>
                                        <th style={{ padding: '12px 20px' }}>Estructuras Vinculadas</th>
                                        <th style={{ padding: '12px 20px', minWidth: '320px' }}>Aprobadores (Principal / Suplente)</th>
                                        <th style={{ padding: '12px 20px', textAlign: 'right' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center' }}><Clock size={20} className="animate-spin" style={{ display: 'inline' }} /></td></tr>
                                    ) : perfilesAutorizados.filter(p => p.es_solicitante).length === 0 ? (
                                        <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '14px' }}>No hay solicitantes registrados aún.</td></tr>
                                    ) : (
                                        perfilesAutorizados.filter(p => p.es_solicitante).map(solicitante => {
                                            const solEmail = solicitante.email;
                                            const solEstructurasIds: string[] = solicitante.ids_programa_area || [];

                                            const aprobadoresCompatibles = perfilesAutorizados.filter(p =>
                                                p.es_aprobador &&
                                                p.email !== solEmail &&
                                                (p.ids_programa_area || []).some((id: string) => solEstructurasIds.includes(id))
                                            );

                                            const estructurasNombres = solEstructurasIds
                                                .map(id => programasProyectos.find(ep => ep.id === id))
                                                .filter(Boolean);

                                            // Inicializar seleccionados desde DB si aun no están en estado local
                                            const seleccionados: string[] = aprobadoresSeleccionados[solEmail] !== undefined
                                                ? aprobadoresSeleccionados[solEmail]
                                                : [
                                                    solicitante.aprobador_email || '',
                                                    solicitante.aprobador_suplente_email || ''
                                                  ].filter(Boolean);

                                            const isOpen = openAprobadorDropdown[solEmail] || false;

                                            const toggleAprobador = (apEmail: string) => {
                                                const current = aprobadoresSeleccionados[solEmail] !== undefined
                                                    ? [...aprobadoresSeleccionados[solEmail]]
                                                    : [
                                                        solicitante.aprobador_email || '',
                                                        solicitante.aprobador_suplente_email || ''
                                                      ].filter(Boolean);

                                                const idx = current.indexOf(apEmail);
                                                if (idx > -1) {
                                                    current.splice(idx, 1);
                                                } else if (current.length < 2) {
                                                    current.push(apEmail);
                                                } else {
                                                    toast.error('Máximo 2 aprobadores por solicitante.');
                                                    return;
                                                }
                                                setAprobadoresSeleccionados(prev => ({ ...prev, [solEmail]: current }));
                                            };

                                            return (
                                                <tr key={solEmail} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px', verticalAlign: 'top' }}>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ fontWeight: '600', color: 'var(--foreground)' }}>{solicitante.nombre_completo || solEmail}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{solEmail}</div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                            {estructurasNombres.length > 0 ? estructurasNombres.map((est: any, i: number) => (
                                                                <span key={i} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', display: 'inline-block', width: 'fit-content' }}>
                                                                    [{est.tipo}] {est.nombre}
                                                                </span>
                                                            )) : <span style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}>Sin estructuras</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        {aprobadoresCompatibles.length === 0 ? (
                                                            <span style={{ fontSize: '12px', color: '#ef4444', fontStyle: 'italic' }}>No hay aprobadores en la misma estructura</span>
                                                        ) : (
                                                            <div style={{ position: 'relative' }}>
                                                                {/* Header del Dropdown */}
                                                                <div
                                                                    onClick={() => setOpenAprobadorDropdown(prev => ({ ...prev, [solEmail]: !isOpen }))}
                                                                    style={{ minHeight: '42px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}
                                                                >
                                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
                                                                        {seleccionados.length === 0 ? (
                                                                            <span style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>Seleccionar aprobadores...</span>
                                                                        ) : (
                                                                            seleccionados.map((email, idx) => {
                                                                                const ap = aprobadoresCompatibles.find((a: any) => a.email === email);
                                                                                const label = idx === 0 ? 'Principal' : 'Suplente';
                                                                                const color = idx === 0 ? '#16a34a' : '#2563eb';
                                                                                const bg = idx === 0 ? '#dcfce7' : '#dbeafe';
                                                                                return (
                                                                                    <span key={email} style={{ backgroundColor: bg, color, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                                        <span style={{ opacity: 0.7, fontSize: '10px' }}>[{label}]</span>
                                                                                        {ap?.nombre_completo || email}
                                                                                    </span>
                                                                                );
                                                                            })
                                                                        )}
                                                                    </div>
                                                                    <ChevronDown size={16} style={{ color: 'var(--muted-foreground)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                                                                </div>

                                                                {/* Menú Desplegable */}
                                                                {isOpen && (
                                                                    <>
                                                                        <div
                                                                            onClick={() => setOpenAprobadorDropdown(prev => ({ ...prev, [solEmail]: false }))}
                                                                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }}
                                                                        />
                                                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 21, marginTop: '4px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)', padding: '6px' }}>
                                                                            <div style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: '600', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>Selecciona máximo 2 (1º = Principal, 2º = Suplente)</div>
                                                                            {aprobadoresCompatibles.map((ap: any) => {
                                                                                const isSelected = seleccionados.includes(ap.email);
                                                                                const posIdx = seleccionados.indexOf(ap.email);
                                                                                const posLabel = posIdx === 0 ? 'Principal' : posIdx === 1 ? 'Suplente' : null;
                                                                                const posColor = posIdx === 0 ? '#16a34a' : '#2563eb';
                                                                                return (
                                                                                    <label
                                                                                        key={ap.email}
                                                                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', backgroundColor: isSelected ? 'var(--muted)' : 'transparent' }}
                                                                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                                                                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = isSelected ? 'var(--muted)' : 'transparent')}
                                                                                    >
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={isSelected}
                                                                                            onChange={() => toggleAprobador(ap.email)}
                                                                                            style={{ width: '15px', height: '15px' }}
                                                                                        />
                                                                                        <div style={{ flex: 1 }}>
                                                                                            <div style={{ fontSize: '13px', fontWeight: '500' }}>{ap.nombre_completo || ap.email}</div>
                                                                                            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{ap.email}</div>
                                                                                        </div>
                                                                                        {posLabel && (
                                                                                            <span style={{ fontSize: '10px', fontWeight: '700', color: posColor, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${posColor}` }}>{posLabel}</span>
                                                                                        )}
                                                                                    </label>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '16px 20px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                        {aprobadoresCompatibles.length > 0 && (
                                                            <button
                                                                disabled={savingAprobador === solEmail}
                                                                onClick={async () => {
                                                                    const sel = aprobadoresSeleccionados[solEmail] !== undefined
                                                                        ? aprobadoresSeleccionados[solEmail]
                                                                        : [solicitante.aprobador_email || '', solicitante.aprobador_suplente_email || ''].filter(Boolean);
                                                                    setSavingAprobador(solEmail);
                                                                    try {
                                                                        const { error } = await supabase.from('perfiles_autorizados')
                                                                            .update({
                                                                                aprobador_email: sel[0] || null,
                                                                                aprobador_suplente_email: sel[1] || null
                                                                            })
                                                                            .eq('email', solEmail);
                                                                        if (error) throw error;
                                                                        toast.success(`Aprobadores guardados para ${solicitante.nombre_completo || solEmail}`);
                                                                        fetchData();
                                                                    } catch (err: any) {
                                                                        toast.error(err.message || 'Error al guardar');
                                                                    } finally {
                                                                        setSavingAprobador(null);
                                                                    }
                                                                }}
                                                                style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: savingAprobador === solEmail ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', opacity: savingAprobador === solEmail ? 0.7 : 1, whiteSpace: 'nowrap' }}
                                                            >
                                                                {savingAprobador === solEmail ? <Clock size={14} className="animate-spin" /> : <Save size={14} />}
                                                                Guardar
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: GESTIÓN DE ANTICIPOS (AUDITORÍA) */}
            {activeTab === 'anticipos' && (
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--muted)', fontSize: '12px', fontWeight: '600', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '12px 20px' }}>ID / Fecha</th>
                                    <th style={{ padding: '12px 20px' }}>Solicitante</th>
                                    <th style={{ padding: '12px 20px' }}>Concepto</th>
                                    <th style={{ padding: '12px 20px' }}>Estado</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--muted-foreground)' }}>
                                                <Clock size={20} className="animate-spin" /> Cargando anticipos...
                                            </div>
                                        </td>
                                    </tr>
                                ) : allAnticipos.length > 0 ? (
                                    allAnticipos.map((a) => (
                                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ fontWeight: '700', color: 'var(--primary)' }}>#ANT-{String(a.id).slice(-4)}</div>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>{a.profiles?.full_name || 'Usuario'}</td>
                                            <td style={{ padding: '16px 20px' }}>{a.motivo}</td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: '#f1f5f9', color: '#64748b', display: "inline-block" }}>
                                                    {a.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                {(a.status === 'Legalizado' || a.status === 'En Revisión') && (
                                                    <button onClick={() => handleOpenAudit(a)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--primary)', backgroundColor: 'white', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                                        Ver Soportes
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                                            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--foreground)' }}>No hay anticipos registrados</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Edición de Usuario */}
            {editingUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--background)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Gestión de Talento</h3>
                            <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ overflowY: 'auto', paddingRight: '4px', marginBottom: '16px', flex: 1 }}>
                            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--muted-foreground)' }}>
                                Editando a: <strong>{editingUser.full_name || editingUser.email}</strong>
                            </p>

                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Teléfono</label>
                            <input 
                                type="text"
                                value={editForm.telefono}
                                onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                                placeholder="Ej: +57 300 000 0000"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '12px', backgroundColor: 'var(--muted)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>
                                    <input 
                                        type="checkbox"
                                        checked={editForm.es_solicitante}
                                        onChange={(e) => setEditForm({...editForm, es_solicitante: e.target.checked})}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    <Send size={16} color="var(--primary)" /> Permiso para Solicitar
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>
                                    <input 
                                        type="checkbox"
                                        checked={editForm.es_aprobador}
                                        onChange={(e) => setEditForm({...editForm, es_aprobador: e.target.checked})}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    <ShieldCheck size={16} color="#10b981" /> Permiso para Aprobar
                                </label>
                            </div>

                            {editForm.es_aprobador && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Responsabilidades (Aprobador de:)</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                        {programasProyectos.map(p => {
                                            const isChecked = editForm.responsabilidades.includes(String(p.id));
                                            return (
                                                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                                                    <input 
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setEditForm({...editForm, responsabilidades: [...editForm.responsabilidades, String(p.id)]});
                                                            } else {
                                                                setEditForm({...editForm, responsabilidades: editForm.responsabilidades.filter(id => id !== String(p.id))});
                                                            }
                                                        }}
                                                    />
                                                    <span style={{ fontWeight: 600, color: 'var(--muted-foreground)' }}>[{p.tipo}]</span> {p.nombre}
                                                </label>
                                            )
                                        })}
                                        {programasProyectos.length === 0 && (
                                            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No hay estructuras creadas en el Maestro.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', marginTop: '16px' }}>Rol del Sistema</label>
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

                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}><Wallet size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> Centro de Costos por Defecto</label>
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

                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}><FolderKanban size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> Programa/Proyecto Principal</label>
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
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '8px', backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: (editForm.programa === 'PAS' && !editForm.region) ? 'red' : 'var(--border)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0 }}>
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
            {/* Modal de Auditoría de Soportes */}
            {showAuditModal && auditAnticipo && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '700px', backgroundColor: 'var(--background)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Auditoría de Soportes</h3>
                            <button onClick={() => setShowAuditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div style={{ overflowY: 'auto', paddingRight: '4px', marginBottom: '20px', flex: 1 }}>
                            <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Anticipo #ANT-{String(auditAnticipo.id).slice(-4)}</div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{auditAnticipo.profiles?.full_name}</div>
                                <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>{auditAnticipo.motivo}</div>
                            </div>

                            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#1e293b' }}>Documentos</h4>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                                {auditAnticipo.metadata_legalizacion?.soportes?.filter((s: any) => s.type.includes('excel') || s.type.includes('spreadsheet') || s.description === 'Cuenta de Cobro Firmada' || s.type.includes('pdf') || s.type.includes('word') || s.type.includes('document')).map((s: any, i: number) => (
                                    <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', textDecoration: 'none', color: '#1d4ed8', fontWeight: '600', fontSize: '13px' }}>
                                        <FileText size={18} />
                                        {s.description || 'Documento'}
                                    </a>
                                ))}
                                {(!auditAnticipo.metadata_legalizacion?.soportes || auditAnticipo.metadata_legalizacion?.soportes.filter((s: any) => s.type.includes('excel') || s.type.includes('spreadsheet') || s.description === 'Cuenta de Cobro Firmada' || s.type.includes('pdf') || s.type.includes('word') || s.type.includes('document')).length === 0) && (
                                    <span style={{ fontSize: '13px', color: '#64748b' }}>No hay documentos.</span>
                                )}
                            </div>

                            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#1e293b' }}>Galería de Facturas</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                                {auditAnticipo.metadata_legalizacion?.soportes?.filter((s: any) => s.type.startsWith('image/')).map((s: any, i: number) => (
                                    <div key={i} onClick={() => setSelectedImage(s.url)} style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={s.url} alt={s.description} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ))}
                                {(!auditAnticipo.metadata_legalizacion?.soportes || auditAnticipo.metadata_legalizacion?.soportes.filter((s: any) => s.type.startsWith('image/')).length === 0) && (
                                    <span style={{ fontSize: '13px', color: '#64748b', gridColumn: '1 / -1' }}>No hay imágenes cargadas.</span>
                                )}
                            </div>

                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Observaciones (Obligatorio para rechazo)</label>
                            <textarea
                                rows={3}
                                value={auditObservation}
                                onChange={(e) => setAuditObservation(e.target.value)}
                                placeholder="Indica aquí si falta algún soporte o hay alguna inconsistencia..."
                                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', resize: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0, borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                            <button onClick={handleRechazarAudit} disabled={isProcessingAudit} style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: '600', cursor: isProcessingAudit ? 'not-allowed' : 'pointer', opacity: isProcessingAudit ? 0.7 : 1 }}>
                                Rechazar
                            </button>
                            <button onClick={handleAprobarAudit} disabled={isProcessingAudit} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#16a34a', color: 'white', fontWeight: '700', cursor: isProcessingAudit ? 'not-allowed' : 'pointer', opacity: isProcessingAudit ? 0.7 : 1 }}>
                                Aprobar Legalización
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para ver imagen grande */}
            {selectedImage && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }} onClick={() => setSelectedImage(null)}>
                    <img src={selectedImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
                    <button onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X size={32} />
                    </button>
                </div>
            )}

        </div>
    );
}
