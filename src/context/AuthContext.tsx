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
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth event:", event, "session user:", session?.user?.email);
            if (session) {
                if (session.user.email && ALLOWED_EMAILS.includes(session.user.email)) {
                    setUser(session.user);
                    setLoading(false);
                } else {
                    await supabase.auth.signOut();
                    setUser(null);
                    setLoading(false);
                    router.push("/login?error=unauthorized");
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoading(false);
                if (pathname !== "/login" && !pathname.startsWith("/auth/")) router.push("/login");
            } else if (!session) {
                // Only stop loading if we're on login page or if we've checked and didn't find a session
                if (pathname === "/login" || pathname === "/auth/callback") {
                    setLoading(false);
                }
            }
        });

        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                if (session.user.email && ALLOWED_EMAILS.includes(session.user.email)) {
                    setUser(session.user);
                } else {
                    await supabase.auth.signOut();
                    setUser(null);
                    router.push("/login?error=unauthorized");
                }
            } else {
                if (pathname !== "/login" && !pathname.startsWith("/auth/")) {
                    // Small delay to allow hash processing if needed
                    setTimeout(async () => {
                        const { data: { session: delayedSession } } = await supabase.auth.getSession();
                        if (!delayedSession && pathname !== "/login" && !pathname.startsWith("/auth/")) {
                            router.push("/login");
                        }
                        setLoading(false);
                    }, 800);
                    return;
                }
            }
            setLoading(false);
        };

        checkUser();
        return () => subscription.unsubscribe();
    }, [router, pathname]);

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading && pathname !== "/login" && !pathname.startsWith("/auth/")) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
                <Loader2 className="animate-spin text-primary" size={40} style={{ color: "#132d1e" }} />
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
