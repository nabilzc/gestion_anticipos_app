"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from "lucide-react";

interface AnticipoItem {
    descripcion: string;
    monto: number;
}

export default function NuevaSolicitud() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<AnticipoItem[]>([{ descripcion: "", monto: 0 }]);
    const [motivo, setMotivo] = useState("");

    const addItem = () => {
        setItems([...items, { descripcion: "", monto: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof AnticipoItem, value: string | number) => {
        const newItems = [...items];
        if (field === "monto") {
            newItems[index][field] = Number(value);
        } else {
            newItems[index][field] = value as string;
        }
        setItems(newItems);
    };

    const total = items.reduce((acc, item) => acc + item.monto, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (items.some(item => !item.descripcion || item.monto <= 0)) {
            alert("Por favor, completa todos los ítems con descripciones y montos válidos.");
            return;
        }

        setLoading(true);

        try {
            // 1. Insertar el anticipo principal
            const { data: anticipo, error: anticipoError } = await supabase
                .from("anticipos")
                .insert([
                    {
                        user_id: user.id,
                        motivo: motivo,
                        monto_total: total,
                        estado: "Pendiente"
                    }
                ])
                .select()
                .single();

            if (anticipoError) throw anticipoError;

            // 2. Insertar los ítems vinculados
            const itemsToInsert = items.map(item => ({
                anticipo_id: anticipo.id,
                descripcion: item.descripcion,
                monto: item.monto
            }));

            const { error: itemsError } = await supabase
                .from("anticipo_items")
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            alert("Solicitud enviada con éxito.");
            router.push("/");
        } catch (error: any) {
            console.error("Error al guardar:", error);
            alert("Error al guardar la solicitud: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
            <button
                onClick={() => router.back()}
                style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", marginBottom: "2rem", fontWeight: 500 }}
            >
                <ArrowLeft size={18} /> Volver al Panel
            </button>

            <div className="card" style={{ background: "white", padding: "2.5rem", borderRadius: "24px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1e293b", marginBottom: "0.5rem" }}>Nueva Solicitud</h1>
                <p style={{ color: "#64748b", marginBottom: "2rem" }}>Completa los detalles de tu requerimiento de anticipo.</p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "2rem" }}>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, color: "#475569", marginBottom: "0.5rem" }}>Motivo General</label>
                        <input
                            type="text"
                            required
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Ej: Viaje a Valle o Taller de Capacitación"
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0",
                                fontSize: "1rem"
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "#475569" }}>Detalle del Gasto</label>
                            <button
                                type="button"
                                onClick={addItem}
                                style={{ display: "flex", alignItems: "center", gap: "4px", color: "#2563eb", fontWeight: 600, fontSize: "0.875rem" }}
                            >
                                <Plus size={16} /> Agregar Ítem
                            </button>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 140px 48px", gap: "12px", marginBottom: "12px", alignItems: "start" }}>
                                <input
                                    type="text"
                                    required
                                    placeholder="Descripción del ítem"
                                    value={item.descripcion}
                                    onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                                    style={{
                                        padding: "12px",
                                        borderRadius: "10px",
                                        border: "1px solid #e2e8f0",
                                        fontSize: "0.875rem"
                                    }}
                                />
                                <div style={{ position: "relative" }}>
                                    <span style={{ position: "absolute", left: "12px", top: "12px", color: "#94a3b8" }}>$</span>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="Monto"
                                        value={item.monto || ""}
                                        onChange={(e) => updateItem(index, "monto", e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "12px 12px 12px 28px",
                                            borderRadius: "10px",
                                            border: "1px solid #e2e8f0",
                                            fontSize: "0.875rem"
                                        }}
                                    />
                                </div>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        style={{ padding: "12px", color: "#ef4444", background: "#fef2f2", borderRadius: "10px" }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={{
                        background: "#f8fafc",
                        padding: "1.5rem",
                        borderRadius: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "2.5rem",
                        border: "1px dashed #e2e8f0"
                    }}>
                        <span style={{ fontWeight: 600, color: "#64748b" }}>Monto Total Estimado</span>
                        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>
                            ${total.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "16px",
                            borderRadius: "14px",
                            background: "#2563eb",
                            color: "white",
                            fontWeight: 700,
                            fontSize: "1rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.2)",
                            cursor: loading ? "not-allowed" : "pointer"
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        {loading ? "Guardando..." : "Enviar Solicitud"}
                    </button>
                </form>
            </div>
        </div>
    );
}
