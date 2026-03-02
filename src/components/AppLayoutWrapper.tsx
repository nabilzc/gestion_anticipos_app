"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

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
            {/* El Sidebar ya está optimizado para dispositivos móviles */}
            <Sidebar user={user} onLogout={signOut} />
            <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
                {children}
            </div>
        </div>
    );
}
