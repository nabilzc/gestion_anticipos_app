"use server";

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Remitente de prueba de Resend: solo entrega a la cuenta dueña hasta verificar fundaec.org
const FROM = 'FUNDAEC Anticipos <onboarding@resend.dev>';
const CONTABILIDAD_FALLBACK = 'contabilidad@fundaec.org';

const esc = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const cop = (valor: number) => `$${(Number(valor) || 0).toLocaleString('es-CO')}`;

function plantilla(opts: { titulo: string; color: string; cuerpo: string; boton?: { texto: string; url: string } }) {
    return `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <h1 style="color: ${opts.color}; text-align: center; font-size: 22px; margin-bottom: 24px;">${opts.titulo}</h1>
            <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; border-left: 4px solid ${opts.color}; font-size: 15px; line-height: 1.6; color: #334155;">
                ${opts.cuerpo}
            </div>
            ${opts.boton ? `
            <div style="text-align: center; margin-top: 24px;">
                <a href="${esc(opts.boton.url)}" style="display: inline-block; background: ${opts.color}; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">${esc(opts.boton.texto)}</a>
            </div>` : ''}
            <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 32px;">
                <p>© ${new Date().getFullYear()} FUNDAEC - Gestión Administrativa y Financiera</p>
                <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            </div>
        </div>
    `;
}

async function enviar(to: (string | null | undefined)[], subject: string, html: string) {
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing");
        return { success: false, error: "Configuration error" };
    }
    const destinatarios = Array.from(new Set(to.filter((e): e is string => !!e && e.includes('@'))));
    if (destinatarios.length === 0) return { success: false, error: "Sin destinatarios" };
    try {
        const { data, error } = await resend.emails.send({ from: FROM, to: destinatarios, subject, html });
        if (error) throw error;
        return { success: true, id: data?.id };
    } catch (error: any) {
        console.error(`Email Error (${subject}):`, error);
        return { success: false, error: error.message };
    }
}

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
    aprobador_email?: string;
}

export async function sendAnticipoNotification(data: EmailData) {
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing");
        return { success: false, error: "Configuration error" };
    }

    try {
        const { id, solicitante_nombre, solicitante_email, motivo, monto_total, monto_letras, banco_info, items, aprobador_email } = data;

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
                    ${aprobador_email ? `<p><strong>Aprobador Asignado:</strong> ${aprobador_email}</p>` : ''}
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

        const recipients = [solicitante_email];
        if (aprobador_email) {
            recipients.push(aprobador_email);
        }

        const { data: resData, error: resError } = await resend.emails.send({
            from: 'FUNDAEC Anticipos <onboarding@resend.dev>', // Usando el dominio de prueba de Resend
            to: recipients,
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
    aprobador_email?: string | null;
    comprobante_id: string;
    app_url: string;
}) {
    const html = plantilla({
        titulo: '¡Desembolso Realizado!',
        color: '#2563eb',
        cuerpo: `
            Hola <strong>${esc(data.solicitante_nombre)}</strong>,<br><br>
            Contabilidad y Finanzas registró el desembolso del anticipo <strong>${esc(data.id)}</strong>.<br>
            <strong>Número de operación:</strong> ${esc(data.comprobante_id)}<br><br>
            <strong>Importante:</strong> tienes <strong>5 días hábiles a partir de hoy</strong> para legalizar los gastos
            (relación de gastos en Excel, cuenta de cobro, facturas y, si te sobró dinero, el comprobante de reintegro).
        `,
        boton: { texto: 'Ir a Legalizaciones', url: `${data.app_url}/legalizaciones` },
    });
    return enviar([data.solicitante_email, data.aprobador_email], `Desembolso realizado: ${data.id}`, html);
}

export async function sendLegalizacionParaAprobador(data: {
    id: string;
    solicitante_nombre: string;
    aprobador_email: string | null;
    monto_total: number;
    total_legalizado?: number | null;
    es_reenvio?: boolean;
    sin_anticipo?: boolean;
    app_url: string;
}) {
    const tipo = data.sin_anticipo ? 'un gasto sin anticipo' : `el anticipo ${esc(data.id)}`;
    const html = plantilla({
        titulo: data.es_reenvio ? 'Legalización corregida para revisar' : 'Legalización pendiente de tu revisión',
        color: '#0d9488',
        cuerpo: `
            <strong>${esc(data.solicitante_nombre)}</strong> ${data.es_reenvio ? 'corrigió y reenvió' : 'cargó'} la legalización de ${tipo}.<br><br>
            <strong>Monto ${data.sin_anticipo ? 'del gasto' : 'del anticipo'}:</strong> ${cop(data.monto_total)}<br>
            ${data.total_legalizado != null ? `<strong>Total legalizado:</strong> ${cop(data.total_legalizado)}<br>` : ''}
            <br>Ingresa a la aplicación para verificar que todos los documentos estén completos y marcarla como
            <strong>revisada y aprobada</strong>, o rechazarla indicando el motivo.
        `,
        boton: { texto: 'Revisar legalización', url: `${data.app_url}/aprobaciones` },
    });
    return enviar([data.aprobador_email], `Legalización por revisar: ${data.solicitante_nombre} (${data.id})`, html);
}

export async function sendLegalizacionParaFinanzas(data: {
    id: string;
    solicitante_nombre: string;
    aprobador_email: string;
    finanzas_emails: string[];
    monto_total: number;
    total_legalizado?: number | null;
    app_url: string;
}) {
    const html = plantilla({
        titulo: 'Legalización lista para cierre',
        color: '#d97706',
        cuerpo: `
            El aprobador <strong>${esc(data.aprobador_email)}</strong> revisó y aprobó la legalización de
            <strong>${esc(data.solicitante_nombre)}</strong> (${esc(data.id)}).<br><br>
            <strong>Monto:</strong> ${cop(data.monto_total)}<br>
            ${data.total_legalizado != null ? `<strong>Total legalizado:</strong> ${cop(data.total_legalizado)}<br>` : ''}
            <br>Verifica los soportes y, si aplica, el comprobante de reintegro, para cerrar la legalización.
        `,
        boton: { texto: 'Cerrar legalización', url: `${data.app_url}/desembolsos` },
    });
    const destinatarios = data.finanzas_emails.length > 0 ? data.finanzas_emails : [CONTABILIDAD_FALLBACK];
    return enviar(destinatarios, `Legalización por cerrar: ${data.solicitante_nombre} (${data.id})`, html);
}

export async function sendLegalizacionDevuelta(data: {
    id: string;
    solicitante_nombre: string;
    solicitante_email: string;
    aprobador_email?: string | null;
    devuelta_por: 'Aprobador' | 'Contabilidad y Finanzas';
    motivo: string;
    app_url: string;
}) {
    const html = plantilla({
        titulo: 'Legalización devuelta para corrección',
        color: '#dc2626',
        cuerpo: `
            Hola <strong>${esc(data.solicitante_nombre)}</strong>,<br><br>
            ${data.devuelta_por === 'Aprobador' ? 'Tu aprobador' : 'Contabilidad y Finanzas'} devolvió la legalización
            <strong>${esc(data.id)}</strong> por el siguiente motivo:<br><br>
            <em>"${esc(data.motivo)}"</em><br><br>
            Ingresa a Legalizaciones, corrige o reemplaza los documentos y vuelve a enviarla.
        `,
        boton: { texto: 'Corregir legalización', url: `${data.app_url}/legalizaciones` },
    });
    // Si la devuelve Finanzas también se informa al aprobador
    const destinatarios = data.devuelta_por === 'Contabilidad y Finanzas'
        ? [data.solicitante_email, data.aprobador_email]
        : [data.solicitante_email];
    return enviar(destinatarios, `Legalización devuelta: ${data.id}`, html);
}

export async function sendLegalizacionCerrada(data: {
    id: string;
    solicitante_nombre: string;
    solicitante_email: string;
    aprobador_email?: string | null;
}) {
    const html = plantilla({
        titulo: 'Legalización finalizada y cerrada',
        color: '#16a34a',
        cuerpo: `
            Hola <strong>${esc(data.solicitante_nombre)}</strong>,<br><br>
            Contabilidad y Finanzas revisó y cerró la legalización <strong>${esc(data.id)}</strong>.
            El proceso quedó completo. ¡Gracias!
        `,
    });
    return enviar([data.solicitante_email, data.aprobador_email], `Legalización cerrada: ${data.id}`, html);
}
