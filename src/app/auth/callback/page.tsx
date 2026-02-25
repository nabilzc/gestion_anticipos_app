"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleAuth = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (data.session) {
                router.push("/");
            } else {
                router.push("/login");
            }
        };
        handleAuth();
    }, [router]);

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc"
        }}>
            <div style={{ textAlign: "center" }}>
                <div className="spinner" style={{
                    width: "40px",
                    height: "40px",
                    border: "4px solid #e2e8f0",
                    borderTop: "4px solid #3b82f6",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 1rem"
                }}></div>
                <p style={{ color: "#64748b", fontWeight: 500 }}>Verificando sesión...</p>
                <style dangerouslySetInnerHTML={{
                    __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
            </div>
        </div>
    );
}
