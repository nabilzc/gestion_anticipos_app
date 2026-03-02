"use client";

import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  TrendingUp,
  ArrowRight,
  LogOut,
  Bell,
  Receipt
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const kpis = [
    { label: "Anticipos Abiertos", value: "12", icon: <Clock />, sub: "$4,200.00", color: "#3b82f6" },
    { label: "Por Aprobar", value: "5", icon: <FileText />, sub: "3 Urgentes", color: "#f59e0b" },
    { label: "Cerrados", value: "148", icon: <CheckCircle2 />, sub: "Este mes", color: "#10b981" },
    { label: "Vencidos", value: "2", icon: <AlertCircle />, sub: "$850.00", color: "#f43f5e" },
  ];

  const recentActivity = [
    { id: "ANT-2024-001", user: "Ana García", concept: "Viáticos Taller Valle", amount: "$350.00", status: "Pendiente", statusClass: "status-pending" },
    { id: "ANT-2024-002", user: "Luis Torres", concept: "Suministros Proyecto X", amount: "$1,200.00", status: "Aprobado", statusClass: "status-approved" },
    { id: "ANT-2024-003", user: "Maria Jose", concept: "Transporte Regional", amount: "$85.00", status: "Abierto", statusClass: "status-open" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      {/* Top Header Mockup */}
      <nav style={{
        background: "white",
        borderBottom: "1px solid #f1f5f9",
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: "72px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <button style={{ color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}><Bell size={20} /></button>
          <div style={{ textAlign: "right", lineHeight: 1.2, marginLeft: "1rem" }}>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>Periodo Actual</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Octubre 2024</div>
          </div>
        </div>
      </nav>

      <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%", flex: 1 }}>
        {/* Header Section */}
        <header style={{ marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b", letterSpacing: "-0.04em", marginBottom: "0.5rem" }}>Panel de Control</h1>
            <p style={{ color: "#64748b" }}>Bienvenido al Sistema de Gestión de Anticipos FUNDAEC</p>
          </div>
          <button className="primary-button" style={{
            background: "#2563eb",
            color: "white",
            padding: "10px 24px",
            borderRadius: "10px",
            border: "none",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)"
          }}>
            <PlusCircle size={18} />
            Nueva solicitud
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
            <div key={i} className="card" style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "24px",
              borderRadius: "20px",
              border: "1px solid rgba(0,0,0,0.05)",
              background: "white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#64748b" }}>{kpi.label}</span>
                <span style={{ padding: "10px", background: `${kpi.color}10`, borderRadius: "10px", color: kpi.color, display: "flex" }}>
                  {kpi.icon}
                </span>
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>{kpi.value}</div>
              <div style={{ fontSize: "0.875rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "4px" }}>
                <TrendingUp size={14} style={{ color: "#10b981" }} />
                <span>{kpi.sub} total</span>
              </div>
            </div>
          ))}
        </section>

        {/* Action Blocks & Activity */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
          {/* Recent Activity Table */}
          <section className="card" style={{ padding: 0, overflow: "hidden", borderRadius: "20px", border: "1px solid rgba(0,0,0,0.05)", background: "white" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b" }}>Actividad Reciente</h2>
              <button style={{ color: "#2563eb", background: "none", border: "none", fontSize: "0.875rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                Ver Todo <ArrowRight size={14} />
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.05em" }}>
                    <th style={{ padding: "1rem 1.5rem" }}>ID / Solicitante</th>
                    <th style={{ padding: "1rem 1.5rem" }}>Concepto</th>
                    <th style={{ padding: "1rem 1.5rem" }}>Monto</th>
                    <th style={{ padding: "1rem 1.5rem" }}>Estado</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "0.875rem" }}>
                  {recentActivity.map((item, i) => (
                    <tr key={i} style={{ borderBottom: i === recentActivity.length - 1 ? "none" : "1px solid #f1f5f9" }}>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "1rem" }}>{item.id}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.user}</div>
                      </td>
                      <td style={{ padding: "1rem 1.5rem", color: "#64748b" }}>{item.concept}</td>
                      <td style={{ padding: "1rem 1.5rem", fontWeight: 600, color: "#1e293b" }}>{item.amount}</td>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <span className={`status-badge ${item.statusClass}`} style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: item.status === "Aprobado" ? "#f0fdf4" : item.status === "Pendiente" ? "#fffbeb" : "#eff6ff",
                          color: item.status === "Aprobado" ? "#16a34a" : item.status === "Pendiente" ? "#d97706" : "#2563eb",
                          display: "inline-block"
                        }}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Quick Actions Sidebar */}
          <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="card" style={{
              background: "#eff6ff",
              color: "#1e40af",
              border: "1px solid #dbeafe",
              padding: "24px",
              borderRadius: "24px",
              boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.1)"
            }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.75rem", color: "#2563eb" }}>Legalización Pendiente</h3>
              <p style={{ fontSize: "0.875rem", color: "#1e40af", marginBottom: "1.5rem", lineHeight: 1.5, fontWeight: 500 }}>Tienes 3 anticipos entregados que requieren subir facturas de soporte.</p>
              <button style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                background: "#2563eb",
                color: "white",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
                transition: "all 0.2s"
              }}>
                Ir a Legalizaciones
              </button>
            </div>

            <div className="card" style={{ padding: "24px", borderRadius: "20px", background: "white", border: "1px solid rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b", marginBottom: "1.25rem" }}>Accesos Rápidos</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {[
                  { icon: FileText, text: "Reporte Mensual", href: "#" },
                  { icon: PlusCircle, text: "Nueva Solicitud", href: "#" },
                  { icon: Receipt, text: "Mis Gastos", href: "#" }
                ].map((action, k) => (
                  <button key={k} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    background: "#f8fafc",
                    border: "none",
                    color: "#475569",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontSize: "14px"
                  }}>
                    <action.icon size={18} /> {action.text}
                  </button>
                ))}
                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    background: "#fef2f2",
                    border: "none",
                    color: "#ef4444",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontSize: "14px",
                    marginTop: "8px"
                  }}
                >
                  <LogOut size={18} /> Cerrar Sesión
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer style={{
        padding: "2rem",
        textAlign: "center",
        color: "#94a3b8",
        fontSize: "0.875rem",
        background: "white",
        borderTop: "1px solid #f1f5f9"
      }}>
        © 2024 FUNDAEC - Sistema de Gestión de Anticipos. Todos los derechos reservados.
      </footer>
    </div>
  );
}
