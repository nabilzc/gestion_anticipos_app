"use client";

import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState, Suspense } from "react";
import { LogIn, AlertCircle } from "lucide-react";

function LoginContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
            padding: "1rem"
        }}>
            <div style={{
                background: "white",
                padding: "2.5rem",
                borderRadius: "24px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                width: "100%",
                maxWidth: "400px",
                textAlign: "center"
            }}>
                <div style={{
                    width: "64px",
                    height: "64px",
                    background: "var(--primary, #3b82f6)",
                    borderRadius: "16px",
                    display: "grid",
                    placeItems: "center",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "2rem",
                    margin: "0 auto 1.5rem"
                }}>F</div>

                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>
                    Bienvenido de nuevo
                </h1>
                <p style={{ color: "#64748b", marginBottom: "2rem" }}>
                    Ingresa al Sistema de Gestión de Anticipos
                </p>

                {error === "unauthorized" && (
                    <div style={{
                        background: "#fef2f2",
                        border: "1px solid #fee2e2",
                        borderRadius: "12px",
                        padding: "1rem",
                        marginBottom: "1.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        color: "#dc2626",
                        fontSize: "0.875rem",
                        textAlign: "left"
                    }}>
                        <AlertCircle size={20} style={{ flexShrink: 0 }} />
                        <span>Acceso denegado: Tu correo electrónico no está en la lista de usuarios autorizados.</span>
                    </div>
                )}

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.75rem",
                        padding: "0.75rem 1.5rem",
                        background: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "#1e293b",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "white")}
                >
                    {loading ? (
                        "Cargando..."
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Continuar con Google
                        </>
                    )}
                </button>

                <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#94a3b8" }}>
                    © 2024 FUNDAEC ERP
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginContent />
        </Suspense>
    );
}
