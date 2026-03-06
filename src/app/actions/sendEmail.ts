"use server";

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailData {
    id?: string;
    solicitante_nombre: string;
    solicitante_email: string;
    motivo: string;
    monto_total: number;
    monto_letras: string;
    banco_info: {
        entidad: string;
        tipo_cuenta: string;
        numero_cuenta: string;
    };
    items: any[];
}

export async function sendAnticipoNotification(data: EmailData) {
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing");
        return { success: false, error: "Configuration error" };
    }

    try {
        const { id, solicitante_nombre, solicitante_email, motivo, monto_total, monto_letras, banco_info, items } = data;

        const html = `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 12px; color: #1e293b;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2563eb; margin-bottom: 8px;">Nueva Solicitud de Anticipo</h1>
                    <p style="color: #64748b;">Se ha registrado exitosamente tu solicitud en el sistema.</p>
                </div>

                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                    <h2 style="font-size: 16px; margin-top: 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Detalles Generales</h2>
                    <p><strong>ID de Solicitud:</strong> ${id || 'Pendiente'}</p>
                    <p><strong>Solicitante:</strong> ${solicitante_nombre}</p>
                    <p><strong>Motivo:</strong> ${motivo}</p>
                    <p><strong>Monto Total:</strong> $${monto_total.toLocaleString('es-CO')}</p>
                    <p style="font-style: italic; font-size: 14px; color: #64748b;">(${monto_letras})</p>
                </div>

                <div style="margin-bottom: 24px;">
                    <h2 style="font-size: 16px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Desglose de Gastos</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background-color: #f1f5f9;">
                                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0;">Tipo</th>
                                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0;">Descripción</th>
                                <th style="text-align: right; padding: 8px; border-bottom: 1px solid #e2e8f0;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${item.tipoGasto}</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${item.descripcion}</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: right;">$${(Number(item.valor) || 0).toLocaleString('es-CO')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                    <h2 style="font-size: 16px; margin-top: 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Información Bancaria</h2>
                    <p><strong>Entidad:</strong> ${banco_info.entidad}</p>
                    <p><strong>Tipo de Cuenta:</strong> ${banco_info.tipo_cuenta}</p>
                    <p><strong>Número de Cuenta:</strong> ${banco_info.numero_cuenta}</p>
                </div>

                <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px;">
                    <p>© ${new Date().getFullYear()} FUNDAEC - Gestión Administrativa</p>
                    <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                </div>
            </div>
        `;

        const { data: resData, error: resError } = await resend.emails.send({
            from: 'FUNDAEC Anticipos <onboarding@resend.dev>', // Usando el dominio de prueba de Resend
            to: [solicitante_email],
            subject: `Confirmación de Solicitud: ${motivo.slice(0, 30)}${motivo.length > 30 ? '...' : ''}`,
            html: html,
        });

        if (resError) {
            console.error("Resend Error:", resError);
            return { success: false, error: resError.message };
        }

        return { success: true, id: resData?.id };
    } catch (error: any) {
        console.error("Send Email Error:", error);
        return { success: false, error: error.message };
    }
}
