"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
    ArrowLeft,
    User,
    Building2,
    CreditCard,
    Phone,
    Mail,
    BadgeCheck,
    Save,
    Loader2,
    CheckCircle2
} from "lucide-react";

interface Profile {
    id: string;
    email: string;
    full_name: string;
    cedula: string;
    cargo: string;
    banco: string;
    tipo_cuenta: string;
    numero_cuenta: string;
    telefono: string;
    rol: string;
}

export default function ProfilePage() {
    const router = useRouter();
    const { user: authUser } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadProfile = async () => {
            if (!authUser) {
                router.push("/login");
                return;
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", authUser.id)
                .single();

            if (data) {
                setProfile(data);
            } else {
                // Si no existe perfil, crear uno con datos mínimos
                setProfile({
                    id: authUser.id,
                    email: authUser.email || "",
                    full_name: authUser.user_metadata?.full_name || "",
                    cedula: "",
                    cargo: "",
                    banco: "",
                    tipo_cuenta: "",
                    numero_cuenta: "",
                    telefono: "",
                    rol: "usuario"
                });
            }

            setLoading(false);
        };

        loadProfile();
    }, [router, authUser]);

    const handleChange = (field: keyof Profile, value: string) => {
        if (!profile) return;
        setProfile({ ...profile, [field]: value });
        setSaved(false);
    };

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        setError("");

        const { error: saveError } = await supabase
            .from("profiles")
            .upsert({
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name,
                cedula: profile.cedula,
                cargo: profile.cargo,
                banco: profile.banco,
                tipo_cuenta: profile.tipo_cuenta,
                numero_cuenta: profile.numero_cuenta,
                telefono: profile.telefono,
            });

        if (saveError) {
            setError("Error al guardar: " + saveError.message);
        } else {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }

        setSaving(false);
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={40} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
                <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
            </div>
        );
    }

    if (!profile) return null;

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "0.625rem 0.875rem",
        border: "1px solid var(--border)",
        borderRadius: "calc(var(--radius) - 2px)",
        fontSize: "0.875rem",
        background: "white",
        color: "var(--foreground)",
        outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
    };

    const labelStyle: React.CSSProperties = {
        fontSize: "0.8125rem",
        fontWeight: 600,
        color: "var(--muted-foreground)",
        marginBottom: "0.375rem",
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
    };

    const fieldGroupStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Navbar */}
            <nav style={{
                background: "white",
                borderBottom: "1px solid var(--border)",
                padding: "0.75rem 2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                zIndex: 50
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{
                        width: "32px",
                        height: "32px",
                        background: "var(--primary)",
                        borderRadius: "6px",
                        display: "grid",
                        placeItems: "center",
                        color: "white",
                        fontWeight: "bold"
                    }}>F</div>
                    <span style={{ fontWeight: 600, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>FUNDAEC ERP</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ textAlign: "right", lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{authUser?.user_metadata?.full_name || authUser?.email}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Perfil</div>
                    </div>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#e2e8f0", display: "grid", placeItems: "center", overflow: "hidden" }}>
                        {authUser?.user_metadata?.avatar_url ? (
                            <img src={authUser.user_metadata.avatar_url} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <User size={18} />
                        )}
                    </div>
                </div>
            </nav>

            <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", width: "100%", flex: 1 }}>
                {/* Header */}
                <header style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <button
                        onClick={() => router.push("/")}
                        className="secondary-button"
                        style={{ padding: "0.5rem" }}
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em" }}>Mi Perfil</h1>
                        <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Gestiona tu información personal y datos bancarios</p>
                    </div>
                </header>

                {/* Avatar y Email de Google */}
                <div className="card" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
                    <div style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        background: "#e2e8f0",
                        display: "grid",
                        placeItems: "center",
                        overflow: "hidden",
                        flexShrink: 0
                    }}>
                        {authUser?.user_metadata?.avatar_url ? (
                            <img src={authUser.user_metadata.avatar_url} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <User size={28} />
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: "1.125rem" }}>{profile.full_name || "Sin nombre"}</div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                            <Mail size={14} /> {profile.email}
                        </div>
                        <div style={{ marginTop: "0.25rem" }}>
                            <span style={{
                                background: "#dbeafe",
                                color: "#1e40af",
                                padding: "0.125rem 0.5rem",
                                borderRadius: "9999px",
                                fontSize: "0.6875rem",
                                fontWeight: 600,
                                textTransform: "capitalize"
                            }}>
                                {profile.rol}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Información Personal */}
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <User size={18} style={{ color: "var(--primary)" }} />
                        Información Personal
                    </h2>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div style={fieldGroupStyle}>
                            <label style={labelStyle}>Nombre Completo</label>
                            <input
                                style={inputStyle}
                                value={profile.full_name || ""}
                                onChange={(e) => handleChange("full_name", e.target.value)}
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        <div style={fieldGroupStyle}>
                            <label style={labelStyle}>
                                <BadgeCheck size={14} /> Cédula
                            </label>
                            <input
                                style={inputStyle}
                                value={profile.cedula || ""}
                                onChange={(e) => handleChange("cedula", e.target.value)}
                                placeholder="Ej: 1234567890"
                            />
                        </div>

                        <div style={fieldGroupStyle}>
                            <label style={labelStyle}>
                                <Building2 size={14} /> Cargo
                            </label>
                            <input
                                style={inputStyle}
                                value={profile.cargo || ""}
                                onChange={(e) => handleChange("cargo", e.target.value)}
                                placeholder="Ej: Analista Financiero"
                            />
                        </div>

                        <div style={fieldGroupStyle}>
                            <label style={labelStyle}>
                                <Phone size={14} /> Teléfono
                            </label>
                            <input
                                style={inputStyle}
                                value={profile.telefono || ""}
                                onChange={(e) => handleChange("telefono", e.target.value)}
                                placeholder="Ej: +57 300 123 4567"
                            />
                        </div>
                    </div>
                </div>

                {/* Información Bancaria */}
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <CreditCard size={18} style={{ color: "var(--primary)" }} />
                        Información Bancaria
                    </h2>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div style={fieldGroupStyle}>
                            <label style={labelStyle}>Banco</label>
                            <select
                                style={{ ...inputStyle, cursor: "pointer" }}
                                value={profile.banco || ""}
                                onChange={(e) => handleChange("banco", e.target.value)}
                            >
                                <option value="">Seleccionar banco...</option>
                                <option value="Bancolombia">Bancolombia</option>
                                <option value="Davivienda">Davivienda</option>
                                <option value="BBVA">BBVA</option>
                                <option value="Banco de Bogotá">Banco de Bogotá</option>
                                <option value="Banco de Occidente">Banco de Occidente</option>
                                <option value="Banco Popular">Banco Popular</option>
                                <option value="Banco AV Villas">Banco AV Villas</option>
                                <option value="Scotiabank Colpatria">Scotiabank Colpatria</option>
                                <option value="Nequi">Nequi</option>
                                <option value="Daviplata">Daviplata</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>

                        <div style={fieldGroupStyle}>
                            <label style={labelStyle}>Tipo de Cuenta</label>
                            <select
                                style={{ ...inputStyle, cursor: "pointer" }}
                                value={profile.tipo_cuenta || ""}
                                onChange={(e) => handleChange("tipo_cuenta", e.target.value)}
                            >
                                <option value="">Seleccionar tipo...</option>
                                <option value="Ahorros">Ahorros</option>
                                <option value="Corriente">Corriente</option>
                            </select>
                        </div>

                        <div style={{ ...fieldGroupStyle, gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Número de Cuenta</label>
                            <input
                                style={inputStyle}
                                value={profile.numero_cuenta || ""}
                                onChange={(e) => handleChange("numero_cuenta", e.target.value)}
                                placeholder="Ej: 123-456789-00"
                            />
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        background: "#fef2f2",
                        border: "1px solid #fee2e2",
                        borderRadius: "var(--radius)",
                        padding: "0.75rem 1rem",
                        marginBottom: "1rem",
                        color: "#dc2626",
                        fontSize: "0.875rem"
                    }}>
                        {error}
                    </div>
                )}

                {/* Botón Guardar */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                    <button
                        onClick={() => router.push("/")}
                        className="secondary-button"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="primary-button"
                        style={{ padding: "0.625rem 1.5rem" }}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                Guardando...
                            </>
                        ) : saved ? (
                            <>
                                <CheckCircle2 size={16} />
                                ¡Guardado!
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </main>

            <footer style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--muted-foreground)",
                fontSize: "0.875rem",
                borderTop: "1px solid var(--border)",
                background: "white"
            }}>
                © 2024 FUNDAEC - Sistema de Gestión de Anticipos. Todos los derechos reservados.
            </footer>
        </div>
    );
}
