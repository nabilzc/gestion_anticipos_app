import { supabase } from "@/lib/supabase";
import { ESTADO } from "@/lib/utils/businessLogic";
import {
    sendLegalizacionParaFinanzas,
    sendLegalizacionDevuelta,
    sendLegalizacionCerrada,
} from "@/app/actions/sendEmail";

export const etiquetaAnticipo = (a: any) =>
    a?.tipo === 'legalizacion_directa'
        ? `#LD-${String(a.id).substring(0, 8)}`
        : `#ANT-${String(a.id).padStart(4, '0')}`;

export const appUrl = () => (typeof window !== 'undefined' ? window.location.origin : '');

export async function getFinanzasEmails(): Promise<string[]> {
    const { data } = await supabase
        .from('perfiles_autorizados')
        .select('email')
        .eq('es_contabilidad_finanzas', true);
    return (data || []).map((p: any) => p.email).filter(Boolean);
}

// Cambia el estado solo si sigue en el estado esperado, para que dos revisores no procesen lo mismo
async function transicion(id: string | number, desde: string, cambios: Record<string, any>) {
    const { data, error } = await supabase
        .from('anticipos')
        .update(cambios)
        .eq('id', id)
        .eq('status', desde)
        .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('La legalización ya fue procesada por otra persona o no tienes permiso para modificarla.');
    }
}

export async function aprobarComoAprobador(anticipo: any, revisorEmail: string) {
    await transicion(anticipo.id, ESTADO.REVISION_APROBADOR, {
        status: ESTADO.REVISION_FINANZAS,
        metadata_legalizacion: {
            ...anticipo.metadata_legalizacion,
            revision_aprobador: { email: revisorEmail, fecha: new Date().toISOString() },
        },
    });

    const finanzasEmails = await getFinanzasEmails();
    sendLegalizacionParaFinanzas({
        id: etiquetaAnticipo(anticipo),
        solicitante_nombre: anticipo.profiles?.full_name || 'Trabajador',
        aprobador_email: revisorEmail,
        finanzas_emails: finanzasEmails,
        monto_total: anticipo.monto_total,
        total_legalizado: anticipo.metadata_legalizacion?.total_legalizado ?? null,
        app_url: appUrl(),
    }).catch(err => console.error('Error enviando correo a Finanzas:', err));
}

export async function devolverLegalizacion(
    anticipo: any,
    revisorEmail: string,
    devueltaPor: 'Aprobador' | 'Contabilidad y Finanzas',
    motivo: string,
) {
    const desde = devueltaPor === 'Aprobador' ? ESTADO.REVISION_APROBADOR : ESTADO.REVISION_FINANZAS;
    await transicion(anticipo.id, desde, {
        status: ESTADO.DEVUELTO,
        motivo_rechazo: motivo,
        metadata_legalizacion: {
            ...anticipo.metadata_legalizacion,
            devolucion: { por: devueltaPor, email: revisorEmail, motivo, fecha: new Date().toISOString() },
        },
    });

    if (anticipo.profiles?.email) {
        sendLegalizacionDevuelta({
            id: etiquetaAnticipo(anticipo),
            solicitante_nombre: anticipo.profiles.full_name || 'Trabajador',
            solicitante_email: anticipo.profiles.email,
            aprobador_email: anticipo.aprobador_email,
            devuelta_por: devueltaPor,
            motivo,
            app_url: appUrl(),
        }).catch(err => console.error('Error enviando correo de devolución:', err));
    }
}

export async function cerrarLegalizacion(anticipo: any, revisorEmail: string) {
    await transicion(anticipo.id, ESTADO.REVISION_FINANZAS, {
        status: ESTADO.CERRADO,
        metadata_legalizacion: {
            ...anticipo.metadata_legalizacion,
            cierre: { email: revisorEmail, fecha: new Date().toISOString() },
        },
    });

    if (anticipo.profiles?.email) {
        sendLegalizacionCerrada({
            id: etiquetaAnticipo(anticipo),
            solicitante_nombre: anticipo.profiles.full_name || 'Trabajador',
            solicitante_email: anticipo.profiles.email,
            aprobador_email: anticipo.aprobador_email,
        }).catch(err => console.error('Error enviando correo de cierre:', err));
    }
}
