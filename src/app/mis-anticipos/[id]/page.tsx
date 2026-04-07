"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
    ArrowLeft, 
    Download, 
    Printer, 
    FileText, 
    User, 
    Briefcase, 
    CreditCard, 
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    Receipt,
    Loader2
} from "lucide-react";
import { isAnticipoVencido, formatCurrency, formatDate } from "@/lib/utils/businessLogic";
import { numeroALetras } from "@/lib/utils/numeroALetras";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function DetalleAnticipoPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [anticipo, setAnticipo] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        async function fetchDetalle() {
            if (!id || !user) return;

            try {
                // 1. Obtener datos del anticipo
                const { data: anticipoData, error: anticipoError } = await supabase
                    .from("anticipos")
                    .select(`
                        *,
                        profiles:solicitante_id (full_name, email, cedula, cargo)
                    `)
                    .eq("id", id)
                    .single();

                if (anticipoError) throw anticipoError;
                setAnticipo(anticipoData);

                // 2. Obtener items del anticipo
                const { data: itemsData, error: itemsError } = await supabase
                    .from("anticipo_items")
                    .select("*")
                    .eq("anticipo_id", id);

                if (itemsError) throw itemsError;
                setItems(itemsData || []);

            } catch (err) {
                console.error("Error fetching detail:", err);
                toast.error("No se pudo cargar el detalle del anticipo");
            } finally {
                setLoading(false);
            }
        }

        fetchDetalle();
    }, [id, user]);

    const handleDownloadPDF = async () => {
        if (!anticipo) return;

        setIsGenerating(true);
        const loadingToast = toast.loading("Generando PDF...");

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        
        try {
            // Función para cargar imagen y convertirla si es necesario
            const loadImage = (src: string): Promise<HTMLImageElement> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = src;
                    img.onload = () => resolve(img);
                    img.onerror = (e) => reject(e);
                });
            };

            // 1. Cabecera (Hoja Membreteada)
            try {
                const logo = await loadImage("/logo-fundaec.png");
                doc.addImage(logo, "PNG", margin, 15, 30, 15);
            } catch (e) {
                console.warn("No se pudo cargar el logo", e);
            }
            
            // Texto institucional debajo del logo (Alineado izquierda)
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(50, 50, 50);
            doc.text("FUNDACIÓN PARA LA APLICACIÓN Y ENSEÑANZA DE LA CIENCIA", margin, 35);
            
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.text("NIT: 890309449-0", margin, 39);

            // 2. Línea decorativa sutil
            doc.setDrawColor(240, 240, 240);
            doc.line(margin, 45, pageWidth - margin, 45);

            // 3. Título del Documento y Metadatos (Centrado o Derecha para contraste)
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 30, 30);
            doc.text("SOLICITUD DE ANTICIPO DE GASTOS", pageWidth / 2, 60, { align: "center" });
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text(`ID: #ANT-${String(anticipo.id).padStart(3, '0')}`, margin, 70);
            doc.text(`Fecha: ${formatDate(anticipo.created_at)}`, pageWidth - margin, 70, { align: "right" });

            // 4. Bloque Informativo: Solicitante y Proyecto
            let currentY = 80;
            doc.setTextColor(30, 30, 30);
            
            // Subtítulo Sección
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(235, 235, 235);
            doc.rect(margin, currentY, pageWidth - (margin * 2), 8, "F");
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("1. INFORMACIÓN GENERAL", margin + 5, currentY + 5.5);
            
            currentY += 15;
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(110, 110, 110);
            doc.text("SOLICITANTE:", margin, currentY);
            doc.text("CARGO:", margin + 85, currentY);
            
            currentY += 5;
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 30, 30);
            doc.text(`${anticipo.profiles?.full_name || "N/A"}`, margin, currentY);
            doc.text(`${anticipo.profiles?.cargo || "N/A"}`, margin + 85, currentY);

            currentY += 10;
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(110, 110, 110);
            doc.text("PROYECTO / PROGRAMA:", margin, currentY);
            doc.text("FECHA ESTIMADA:", margin + 85, currentY);

            currentY += 5;
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 30, 30);
            doc.text(`${anticipo.proyecto || "General"}`, margin, currentY);
            doc.text(`${formatDate(anticipo.fecha_ejecucion)}`, margin + 85, currentY);

            currentY += 10;
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(110, 110, 110);
            doc.text("CONCEPTO DEL GASTO:", margin, currentY);
            
            currentY += 5;
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 30, 30);
            const motivoLines = doc.splitTextToSize(anticipo.motivo || "N/A", pageWidth - (margin * 2));
            doc.text(motivoLines, margin, currentY);
            
            currentY += (motivoLines.length * 5) + 5;

            // 5. Tabla de Gastos
            autoTable(doc, {
                startY: currentY,
                margin: { left: margin, right: margin },
                head: [["CATEGORÍA", "DESCRIPCIÓN", "VALOR TOTAL"]],
                body: items.map(item => [
                    item.tipo_gasto.toUpperCase(),
                    item.descripcion,
                    formatCurrency(item.valor)
                ]),
                foot: [[
                    { content: "TOTAL SOLICITADO", colSpan: 2, styles: { halign: "right", fontStyle: "bold" } },
                    { content: formatCurrency(anticipo.monto_total), styles: { fontStyle: "bold", textColor: [37, 99, 235] } }
                ]],
                theme: "grid",
                headStyles: { fillColor: [248, 250, 252], textColor: [50, 50, 50], fontStyle: "bold", fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                footStyles: { fillColor: [255, 255, 255], textColor: [30, 30, 30], fontSize: 9 },
                columnStyles: {
                    2: { cellWidth: 40, halign: "right" }
                }
            });

            currentY = (doc as any).lastAutoTable.finalY + 8;
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(100, 100, 100);
            doc.text(`SON: ${numeroALetras(anticipo.monto_total)}`, margin, currentY);

            // 6. Información Bancaria
            currentY += 10;
            doc.setFillColor(252, 253, 254);
            doc.rect(margin, currentY, pageWidth - (margin * 2), 15, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(50, 50, 50);
            doc.text("PAGO A FAVOR DE:", margin + 5, currentY + 6);
            doc.setFont("helvetica", "normal");
            doc.text(`${anticipo.banco_info?.entidad} - ${anticipo.banco_info?.tipo_cuenta} No. ${anticipo.banco_info?.numero_cuenta}`, margin + 5, currentY + 11);

            // 7. Firmas
            const signatureAreaY = currentY + 45;
            
            // Firma Solicitante
            if (anticipo.firma_base64) {
                try { doc.addImage(anticipo.firma_base64, "PNG", margin + 10, signatureAreaY - 25, 40, 20); } catch (e) {}
            }
            doc.line(margin, signatureAreaY, margin + 70, signatureAreaY);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("SOLICITANTE", margin + 35, signatureAreaY + 5, { align: "center" });
            doc.setFont("helvetica", "normal");
            doc.text(anticipo.profiles?.full_name || "Nombre", margin + 35, signatureAreaY + 10, { align: "center" });

            // Firma Aprobador
            const secondSignX = pageWidth - margin - 70;
            if (anticipo.firma_aprobador_base64) {
                try { doc.addImage(anticipo.firma_aprobador_base64, "PNG", secondSignX + 15, signatureAreaY - 25, 40, 20); } catch (e) {}
            }
            doc.line(secondSignX, signatureAreaY, pageWidth - margin, signatureAreaY);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("AUTORIZADO POR", secondSignX + 35, signatureAreaY + 5, { align: "center" });
            doc.setFont("helvetica", "normal");
            doc.text(anticipo.nombre_aprobador || "Administración / Tesorería", secondSignX + 35, signatureAreaY + 10, { align: "center" });

            // 8. Pie de página (Centrado)
            const footerY = doc.internal.pageSize.getHeight() - 15;
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(150, 150, 150);
            doc.text("Documento digital generado automáticamente por el Sistema de Gestión de Anticipos - FUNDAEC", pageWidth / 2, footerY, { align: "center" });

            // 9. Guardar
            doc.save(`Anticipo_ID_${anticipo.id}_${new Date().getTime()}.pdf`);
            toast.success("PDF generado exitosamente", { id: loadingToast });


        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Ocurrió un error al generar el PDF", { id: loadingToast });
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) {
        return (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    if (!anticipo) {
        return (
            <div style={{ textAlign: "center", padding: "40px" }}>
                <h2>Anticipo no encontrado</h2>
                <button onClick={() => router.back()} className="secondary-button">Volver</button>
            </div>
        );
    }

    const isVencido = isAnticipoVencido(anticipo);
    const displayStatus = isVencido ? "Vencido" : anticipo.status;

    const statusStyles: Record<string, any> = {
        "Borrador": { color: "#64748b", bg: "#f1f5f9", icon: <FileText size={16} /> },
        "Enviado": { color: "#2563eb", bg: "#eff6ff", icon: <Clock size={16} /> },
        "Pendiente": { color: "#d97706", bg: "#fffbeb", icon: <Clock size={16} /> },
        "Aprobado": { color: "#16a34a", bg: "#f0fdf4", icon: <CheckCircle2 size={16} /> },
        "Rechazado": { color: "#ef4444", bg: "#fef2f2", icon: <AlertCircle size={16} /> },
        "Cerrado": { color: "#71717a", bg: "#fafafa", icon: <CheckCircle2 size={16} /> },
        "Vencido": { color: "#ef4444", bg: "#fef2f2", icon: <AlertCircle size={16} /> },
        "Abierto": { color: "#2563eb", bg: "#eff6ff", icon: <Clock size={16} /> },
        "Desembolsado": { color: "#16a34a", bg: "#f0fdf4", icon: <CheckCircle2 size={16} /> },
    };

    const style = statusStyles[displayStatus] || statusStyles["Borrador"];

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '60px' }}>
            <Toaster position="top-right" />
            
            {/* Header / Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <button 
                    onClick={() => router.back()}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}
                >
                    <ArrowLeft size={20} /> Volver a mis anticipos
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => window.print()}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        <Printer size={18} /> Imprimir Pantalla
                    </button>
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={isGenerating}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: isGenerating ? '#94a3b8' : '#2563eb', color: 'white', fontSize: '14px', fontWeight: 600, cursor: isGenerating ? 'not-allowed' : 'pointer' }}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Generando PDF...
                            </>
                        ) : (
                            <>
                                <Download size={18} /> Descargar PDF Oficial
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Formato Oficial - "Hoja de Vida" del Anticipo */}
            <div style={{ 
                background: 'white', 
                borderRadius: '16px', 
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #f1f5f9',
                overflow: 'hidden'
            }}>
                {/* Cabecera del Formato */}
                <div style={{ padding: '32px', borderBottom: '2px solid #f8fafc', background: '#fcfdfe' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ background: '#2563eb10', color: '#2563eb', padding: '8px', borderRadius: '12px' }}>
                                    <FileText size={24} />
                                </div>
                                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: 0 }}>Solicitud de Anticipo</h1>
                            </div>
                            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>ID: <span style={{ color: '#2563eb', fontWeight: 700 }}>#ANT-{String(anticipo.id).padStart(3, '0')}</span></div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '6px 14px', 
                                borderRadius: '30px', 
                                backgroundColor: style.bg, 
                                color: style.text,
                                fontSize: '13px',
                                fontWeight: 700,
                                border: `1px solid ${style.color}20`
                            }}>
                                {style.icon} {displayStatus.toUpperCase()}
                            </div>
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#94a3b8' }}>
                                Generado el {formatDate(anticipo.created_at)}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '32px' }}>
                    {/* Secciones del Formato */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '48px' }}>
                        {/* Datos del Solicitante */}
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={16} /> Información del Solicitante
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>Nombre Completo</div>
                                    <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 600 }}>{anticipo.profiles?.full_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>Cédula / Documento</div>
                                    <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>{anticipo.profiles?.cedula || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>Cargo</div>
                                    <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>{anticipo.profiles?.cargo || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>Correo Electrónico</div>
                                    <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>{anticipo.profiles?.email || anticipo.solicitante_email || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Detalles del Anticipo */}
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Briefcase size={16} /> Detalles del Proyecto
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>Proyecto / Programa</div>
                                    <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 600 }}>{anticipo.proyecto || 'General'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>Motivo / Concepto</div>
                                    <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>{anticipo.motivo}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>Fecha Estimada de Ejecución</div>
                                    <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={14} className="text-blue-500" /> {formatDate(anticipo.fecha_ejecucion)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Gastos */}
                    <div style={{ marginBottom: '48px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Receipt size={16} /> Desglose de Gastos
                        </h3>
                        <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>TIPO</th>
                                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>DESCRIPCIÓN</th>
                                        <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>VALOR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{item.tipo_gasto}</td>
                                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#64748b' }}>{item.descripcion}</td>
                                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#1e293b', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.valor)}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: '#fcfdfe', borderTop: '2px solid #f1f5f9' }}>
                                        <td colSpan={2} style={{ padding: '20px', fontSize: '14px', fontWeight: 800, color: '#1e293b', textAlign: 'right' }}>TOTAL SOLICITADO</td>
                                        <td style={{ padding: '20px', fontSize: '18px', fontWeight: 900, color: '#2563eb', textAlign: 'right' }}>{formatCurrency(anticipo.monto_total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b', fontStyle: 'italic', padding: '0 20px' }}>
                            Son: <span style={{ textTransform: 'capitalize' }}>{anticipo.monto_letras}</span>
                        </div>
                    </div>

                    {/* Información Bancaria */}
                    <div style={{ marginBottom: '48px', padding: '24px', background: '#f8fafc', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ background: 'white', padding: '12px', borderRadius: '12px', color: '#2563eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>Información Bancaria</h3>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Entidad para el desembolso de fondos</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{anticipo.banco_info?.entidad || 'N/A'}</div>
                            <div style={{ fontSize: '14px', color: '#64748b' }}>{anticipo.banco_info?.tipo_cuenta} No. {anticipo.banco_info?.numero_cuenta}</div>
                        </div>
                    </div>

                    {/* Firmas */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginTop: '60px', padding: '0 40px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ height: '100px', borderBottom: '1px solid #e2e8f0', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {anticipo.firma_base64 ? (
                                    <img src={anticipo.firma_base64} alt="Firma Solicitante" style={{ maxHeight: '80px', maxWidth: '200px' }} />
                                ) : (
                                    <span style={{ fontSize: '12px', color: '#cbd5e1', fontStyle: 'italic' }}>Firma pendiente</span>
                                )}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{anticipo.profiles?.full_name || 'Solicitante'}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Firma del Solicitante</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ height: '100px', borderBottom: '1px solid #e2e8f0', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {anticipo.firma_aprobador_base64 ? (
                                    <img src={anticipo.firma_aprobador_base64} alt="Firma Aprobador" style={{ maxHeight: '80px', maxWidth: '200px' }} />
                                ) : (
                                    <span style={{ fontSize: '12px', color: '#cbd5e1', fontStyle: 'italic' }}>Pendiente por Aprobación</span>
                                )}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{anticipo.nombre_aprobador || 'Aprobador'}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Firma de Autorización</div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer Informativo */}
            <div style={{ textAlign: 'center', marginTop: '32px', color: '#94a3b8', fontSize: '12px' }}>
                Este documento es una representación digital oficial de la solicitud de anticipo generada a través del ERP FUNDAEC.
            </div>
        </div>
    );
}
