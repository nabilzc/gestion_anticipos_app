"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
    const { user, signOut } = useAuth();
    const pathname = usePathname();

    // No mostrar sidebar en login ni en pantallas de autenticación
    const isAuthPage = pathname === "/login" || pathname?.startsWith("/auth/");

    // Si es página de autenticación, retornar solo el contenido
    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar user={user} onLogout={signOut} />
            <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                <Header user={user} />
                <div style={{ flex: 1, overflow: "auto", position: "relative", padding: "24px" }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
