"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  TrendingUp,
  ArrowRight,
  LogOut,
  Bell,
  Loader2
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        router.push("/login");
      }
    });

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setLoading(false);
      } else {
        // Un pequeño retraso para permitir que Supabase procese el hash de la URL
        setTimeout(async () => {
          const { data: { session: delayedSession } } = await supabase.auth.getSession();
          if (!delayedSession) {
            router.push("/login");
          } else {
            setUser(delayedSession.user);
          }
          setLoading(false);
        }, 500);
      }
    };

    checkUser();

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!user) return null;

  const kpis = [
    { label: "Anticipos Abiertos", value: "12", icon: <Clock className="text-blue-500" />, sub: "$4,200.00", color: "#3b82f6" },
    { label: "Por Aprobar", value: "5", icon: <FileText className="text-amber-500" />, sub: "3 Urgentes", color: "#f59e0b" },
    { label: "Cerrados", value: "148", icon: <CheckCircle2 className="text-emerald-500" />, sub: "Este mes", color: "#10b981" },
    { label: "Vencidos", value: "2", icon: <AlertCircle className="text-rose-500" />, sub: "$850.00", color: "#f43f5e" },
  ];

  const recentActivity = [
    { id: "ANT-2024-001", user: "Ana García", concept: "Viáticos Taller Valle", amount: "$350.00", status: "Pendiente", statusClass: "status-pending" },
    { id: "ANT-2024-002", user: "Luis Torres", concept: "Suministros Proyecto X", amount: "$1,200.00", status: "Aprobado", statusClass: "status-approved" },
    { id: "ANT-2024-003", user: "Maria Jose", concept: "Transporte Regional", amount: "$85.00", status: "Abierto", statusClass: "status-open" },
  ];

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

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <button style={{ color: "var(--muted-foreground)" }}><Bell size={20} /></button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderLeft: "1px solid var(--border)", paddingLeft: "1.5rem" }}>
            <div style={{ textAlign: "right", lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{user?.user_metadata?.full_name || user?.email}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{user?.user_metadata?.role || "Usuario"}</div>
            </div>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#e2e8f0", display: "grid", placeItems: "center", overflow: "hidden" }}>
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Users size={18} />
              )}
            </div>
          </div>
        </div>
      </nav>

      <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%", flex: 1 }}>
        {/* Header Section */}
        <header style={{ marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.04em", marginBottom: "0.5rem" }}>Panel de Control</h1>
            <p style={{ color: "var(--muted-foreground)" }}>Bienvenido al Sistema de Gestión de Anticipos</p>
          </div>
          <button className="primary-button">
            <PlusCircle size={18} />
            Nueva Solicitud de Anticipo
          </button>
        </header>

        {/* KPIs Grid */}
        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.5rem",
          marginBottom: "3rem"
        }}>
          {kpis.map((kpi, i) => (
            <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted-foreground)" }}>{kpi.label}</span>
                <span style={{ padding: "0.5rem", background: `${kpi.color}15`, borderRadius: "8px", color: kpi.color }}>
                  {kpi.icon}
                </span>
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{kpi.value}</div>
              <div style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <TrendingUp size={14} style={{ color: "#10b981" }} />
                <span>{kpi.sub} total</span>
              </div>
            </div>
          ))}
        </section>

        {/* Action Blocks & Activity */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
          {/* Recent Activity Table */}
          <section className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Actividad Reciente</h2>
              <button style={{ color: "var(--primary)", fontSize: "0.875rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                Ver Todo <ArrowRight size={14} />
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted-foreground)", letterSpacing: "0.05em" }}>
                    <th style={{ padding: "1rem 1.5rem" }}>ID / Solicitante</th>
                    <th style={{ padding: "1rem 1.5rem" }}>Concepto</th>
                    <th style={{ padding: "1rem 1.5rem" }}>Monto</th>
                    <th style={{ padding: "1rem 1.5rem" }}>Estado</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "0.875rem" }}>
                  {recentActivity.map((item, i) => (
                    <tr key={i} style={{ borderBottom: i === recentActivity.length - 1 ? "none" : "1px solid var(--border)" }}>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <div style={{ fontWeight: 600 }}>{item.id}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{item.user}</div>
                      </td>
                      <td style={{ padding: "1rem 1.5rem", color: "var(--muted-foreground)" }}>{item.concept}</td>
                      <td style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>{item.amount}</td>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <span className={`status-badge ${item.statusClass}`}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Quick Actions Sidebar */}
          <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="card" style={{ background: "var(--primary)", color: "white", border: "none" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Legalización Pendiente</h3>
              <p style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "1.5rem" }}>Tienes 3 anticipos entregados que requieren subir facturas de soporte.</p>
              <button className="secondary-button" style={{ width: "100%", justifyContent: "center", background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
                Ir a Legalizaciones
              </button>
            </div>

            <div className="card">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Accesos Rápidos</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button className="secondary-button" style={{ justifyContent: "flex-start", width: "100%" }}>
                  <FileText size={18} /> Exportar Reporte Mensual
                </button>
                <button className="secondary-button" style={{ justifyContent: "flex-start", width: "100%" }}>
                  <PlusCircle size={18} /> Nueva Solicitud
                </button>
                <button
                  onClick={handleLogout}
                  className="secondary-button"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  <LogOut size={18} color="#ef4444" /> Cerrar Sesión
                </button>
              </div>
            </div>
          </section>
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
