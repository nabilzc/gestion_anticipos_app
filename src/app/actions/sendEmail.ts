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

export async function sendAnticipoStatusUpdate(data: {
    id: string;
    solicitante_nombre: string;
    solicitante_email: string;
    status: 'Aprobado' | 'Rechazado';
    motivo_rechazo?: string;
}) {
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing");
        return { success: false, error: "Configuration error" };
    }

    const { id, solicitante_nombre, solicitante_email, status, motivo_rechazo } = data;
    const isApproved = status === 'Aprobado';

    const title = isApproved ? 'Solicitud APROBADA' : 'Solicitud RECHAZADA';
    const color = isApproved ? '#16a34a' : '#dc2626';
    const message = isApproved 
        ? `Tu solicitud de anticipo ${id} ha sido APROBADA. Pronto pasará al área financiera para el desembolso.`
        : `Tu solicitud ${id} no ha sido aprobada por el siguiente motivo: ${motivo_rechazo || 'Sin motivo especificado'}. Por favor, realiza los ajustes necesarios.`;

    const html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: ${color}; margin-bottom: 8px;">${title}</h1>
                <p style="color: #64748b;">Notificación oficial de estado de solicitud</p>
            </div>

            <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; border-left: 4px solid ${color}; margin-bottom: 24px;">
                <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 0;">
                    Hola <strong>${solicitante_nombre}</strong>,<br><br>
                    ${message}
                </p>
            </div>

            <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px;">
                <p>ID de Solicitud: <strong>${id}</strong></p>
                <p>© ${new Date().getFullYear()} FUNDAEC - Gestión Administrativa</p>
                <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            </div>
        </div>
    `;

    try {
        const { data: resData, error: resError } = await resend.emails.send({
            from: 'FUNDAEC Anticipos <onboarding@resend.dev>',
            to: [solicitante_email],
            subject: `${title}: Solicitud ${id}`,
            html: html,
        });

        if (resError) throw resError;
        return { success: true, id: resData?.id };
    } catch (error: any) {
        console.error("Status Update Email Error:", error);
        return { success: false, error: error.message };
    }
}

export async function sendDisbursementNotification(data: {
    id: string;
    solicitante_nombre: string;
    solicitante_email: string;
    comprobante_id: string;
}) {
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing");
        return { success: false, error: "Configuration error" };
    }

    const { id, solicitante_nombre, solicitante_email, comprobante_id } = data;

    const html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin-bottom: 8px;">¡Desembolso Realizado!</h1>
                <p style="color: #64748b;">Tu solicitud ha sido pagada oficialmente</p>
            </div>

            <div style="background-color: #f0fdf4; padding: 24px; border-radius: 8px; border-left: 4px solid #16a34a; margin-bottom: 24px;">
                <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 12px;">
                    Hola <strong>${solicitante_nombre}</strong>,<br><br>
                    Tu desembolso ha sido realizado con éxito. 
                </p>
                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #dcfce7; margin-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px;"><strong>Número de Operación:</strong> ${comprobante_id}</p>
                </div>
                <p style="font-size: 14px; color: #166534; margin: 0;">
                    <strong>Importante:</strong> Recuerda que tienes 5 días hábiles para legalizar tus gastos después de la fecha de ejecución establecida en tu solicitud.
                </p>
            </div>

            <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px;">
                <p>Solicitud Referencia: <strong>${id}</strong></p>
                <p>© ${new Date().getFullYear()} FUNDAEC - División Financiera</p>
                <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            </div>
        </div>
    `;

    try {
        const { data: resData, error: resError } = await resend.emails.send({
            from: 'FUNDAEC Financiero <onboarding@resend.dev>',
            to: [solicitante_email],
            subject: `Desembolso Realizado: Solicitud ${id}`,
            html: html,
        });

        if (resError) throw resError;
        return { success: true, id: resData?.id };
    } catch (error: any) {
        console.error("Disbursement Email Error:", error);
        return { success: false, error: error.message };
    }
}

export async function sendLegalizationFinanceNotification(data: {
    id: string;
    solicitante_nombre: string;
    monto_total: number;
}) {
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing");
        return { success: false, error: "Configuration error" };
    }

    const { id, solicitante_nombre, monto_total } = data;

    const html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2dd4bf; margin-bottom: 8px;">Legalización Lista</h1>
                <p style="color: #64748b;">Una nueva legalización requiere revisión</p>
            </div>

            <div style="background-color: #f0fdfa; padding: 24px; border-radius: 8px; border-left: 4px solid #2dd4bf; margin-bottom: 24px;">
                <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 12px;">
                    El usuario <strong>${solicitante_nombre}</strong> ha finalizado la carga de soportes para su anticipo.
                </p>
                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #ccfbf1; margin-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px;"><strong>ID Anticipo:</strong> ${id}</p>
                    <p style="margin: 0; font-size: 14px;"><strong>Monto Total:</strong> $${monto_total.toLocaleString('es-CO')}</p>
                </div>
                <p style="font-size: 14px; color: #0d9488; margin: 0;">
                    Por favor, ingresa al módulo de administración para validar los soportes cargados.
                </p>
            </div>

            <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px;">
                <p>© ${new Date().getFullYear()} FUNDAEC - Control Interno</p>
                <p>Este es un correo automático para el equipo financiero.</p>
            </div>
        </div>
    `;

    try {
        const { data: resData, error: resError } = await resend.emails.send({
            from: 'FUNDAEC Sistemas <onboarding@resend.dev>',
            to: ['contabilidad@fundaec.org'], // Correo genérico para finanzas
            subject: `Legalización Pendiente: ${solicitante_nombre} (${id})`,
            html: html,
        });

        if (resError) throw resError;
        return { success: true, id: resData?.id };
    } catch (error: any) {
        console.error("Legalization Finance Email Error:", error);
        return { success: false, error: error.message };
    }
}
