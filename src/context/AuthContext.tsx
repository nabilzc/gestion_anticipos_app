"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ALLOWED_EMAILS } from "@/lib/constants";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

interface AuthContextType {
    user: any;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let mounted = true;
        let initialized = false;

        const loadSession = async (session: any) => {
            if (!mounted) return;
            
            if (session) {
                // Sincronización de Cookies manual para el Middleware
                document.cookie = `sb-auth-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax; secure`;

                // Excepción prioritaria: pase VIP
                const isNabil = session.user.email === 'nzapata@fundaec.org';
                
                if (isNabil) {
                    setUser({
                        ...session.user,
                        profile: { role: 'Administrador Global', es_solicitante: true, es_aprobador: true }
                    });
                    setLoading(false);
                    return;
                }
                
                if (session.user.email) {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                    if (!mounted) return;
                    
                    if (profile) {
                        // Sincronizar permisos desde perfiles_autorizados en cada inicio de sesión
                        const { data: authProfile } = await supabase.from('perfiles_autorizados')
                            .select('*, programas_proyectos_areas(nombre)')
                            .eq('email', session.user.email).single();

                        let finalProfile = { ...profile };

                        if (authProfile) {
                            let calculatedRole = profile.role;
                            // Respetar la jerarquía de Administrador Global
                            if (profile.role !== 'Administrador Global') {
                                if (authProfile.es_administrador) calculatedRole = 'Administrador';
                                else if (authProfile.es_aprobador) calculatedRole = 'Aprobador';
                                else if (authProfile.es_solicitante) calculatedRole = 'Solicitante';
                                else calculatedRole = 'Sin rol';
                            }

                            finalProfile = {
                                ...profile,
                                role: calculatedRole,
                                programa: authProfile.programas_proyectos_areas?.nombre || profile.programa,
                                es_solicitante: authProfile.es_solicitante || false,
                                es_aprobador: authProfile.es_aprobador || false
                            };

                            // Actualizar la tabla profiles con los nuevos permisos si hubo cambios
                            if (profile.role !== finalProfile.role || profile.es_solicitante !== finalProfile.es_solicitante || profile.es_aprobador !== finalProfile.es_aprobador || profile.programa !== finalProfile.programa) {
                                await supabase.from('profiles').update({
                                    role: finalProfile.role,
                                    programa: finalProfile.programa,
                                    es_solicitante: finalProfile.es_solicitante,
                                    es_aprobador: finalProfile.es_aprobador
                                }).eq('id', profile.id);
                            }
                        }
                        
                        setUser({ ...session.user, profile: finalProfile });
                        setLoading(false);
                    } else {
                        // Verificar perfiles autorizados si no tiene perfil (Nuevo usuario)
                        const { data: authProfile } = await supabase.from('perfiles_autorizados')
                            .select('*, programas_proyectos_areas(nombre)')
                            .eq('email', session.user.email).single();

                        if (authProfile) {
                            let calculatedRole = 'Sin rol';
                            if (authProfile.es_administrador) calculatedRole = 'Administrador';
                            else if (authProfile.es_aprobador) calculatedRole = 'Aprobador';
                            else if (authProfile.es_solicitante) calculatedRole = 'Solicitante';

                            // Excepción: Si por email le corresponde ser Global
                            if (session.user.email === 'nzapata@fundaec.org') {
                                calculatedRole = 'Administrador Global';
                            }

                            const newProfile = {
                                id: session.user.id,
                                email: session.user.email,
                                full_name: authProfile.nombre_completo || session.user.user_metadata?.full_name || '',
                                role: calculatedRole,
                                programa: authProfile.programas_proyectos_areas?.nombre || null,
                                es_solicitante: authProfile.es_solicitante || false,
                                es_aprobador: authProfile.es_aprobador || false
                            };

                            const { data: createdProfile } = await supabase.from('profiles').insert([newProfile]).select().single();
                            
                            setUser({ ...session.user, profile: createdProfile || newProfile });
                            setLoading(false);
                        } else {
                            await supabase.auth.signOut();
                            if (!mounted) return;
                            document.cookie = `sb-auth-token=; path=/; max-age=0; SameSite=Lax; secure`;
                            setUser(null);
                            setLoading(false);
                            const currentPath = window.location.pathname;
                            if (currentPath !== "/login" && !currentPath.startsWith("/auth/")) {
                                router.push("/login?error=not_authorized");
                            }
                        }
                    }
                } else {
                    await supabase.auth.signOut();
                    if (!mounted) return;
                    document.cookie = `sb-auth-token=; path=/; max-age=0; SameSite=Lax; secure`;
                    setUser(null);
                    setLoading(false);
                    const currentPath = window.location.pathname;
                    if (currentPath !== "/login" && !currentPath.startsWith("/auth/")) {
                        router.push("/login?error=unauthorized");
                    }
                }
            } else {
                setUser(null);
                setLoading(false);
                const currentPath = window.location.pathname;
                if (currentPath !== "/login" && !currentPath.startsWith("/auth/")) {
                    router.push("/login");
                }
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // INITIAL_SESSION se dispara al montar el listener en Supabase v2
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                initialized = true;
                await loadSession(session);
            } else if (event === 'SIGNED_OUT') {
                if (!mounted) return;
                document.cookie = `sb-auth-token=; path=/; max-age=0; SameSite=Lax; secure`;
                setUser(null);
                setLoading(false);
                const currentPath = window.location.pathname;
                if (currentPath !== "/login" && !currentPath.startsWith("/auth/")) {
                    router.push("/login");
                }
            }
        });

        // Fallback de seguridad
        setTimeout(() => {
            if (!initialized && mounted) {
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (!initialized && mounted) {
                        initialized = true;
                        loadSession(session);
                    }
                });
            }
        }, 500);

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [router]);

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
                <Loader2 className="animate-spin text-primary" size={40} style={{ color: "#2563eb" }} />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
