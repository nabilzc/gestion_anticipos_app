/**
 * Lógica de negocio unificada para la gestión de anticipos
 */

// Estados del ciclo de legalización (columna anticipos.status)
export const ESTADO = {
    DESEMBOLSADO: 'Desembolsado',
    REVISION_APROBADOR: 'En Revisión',
    REVISION_FINANZAS: 'Revisión Finanzas',
    DEVUELTO: 'Devuelto',
    CERRADO: 'Cerrado',
} as const;

// Estados en los que el trabajador puede cargar o corregir su legalización
export const ESTADOS_LEGALIZABLES = [ESTADO.DESEMBOLSADO, 'Abierto', ESTADO.DEVUELTO];

// 'Finalizado' y 'Legalizado' son estados heredados equivalentes a Cerrado
export const ESTADOS_CERRADOS = [ESTADO.CERRADO, 'Finalizado', 'Legalizado'];

// "2026-10-17" se interpreta como medianoche UTC; en Colombia eso cae el día anterior
const parseFechaLocal = (fecha: string): Date => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [y, m, d] = fecha.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(fecha);
};

/**
 * Un anticipo desembolsado vence si pasan más de 5 días hábiles (L-V) desde que
 * Contabilidad y Finanzas registró el pago sin que el trabajador legalice.
 */
export const isAnticipoVencido = (anticipo: any): boolean => {
    const { status, fecha_pago, fecha_ejecucion } = anticipo;

    if (status !== ESTADO.DESEMBOLSADO && status !== 'Abierto') {
        return false;
    }

    // fecha_ejecucion solo como respaldo para anticipos pagados antes de guardar fecha_pago
    const fechaReferencia = fecha_pago || fecha_ejecucion;
    if (!fechaReferencia) return false;

    // Normalizamos las fechas para comparar solo días, ignorando la hora
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaRef = parseFechaLocal(fechaReferencia);
    fechaRef.setHours(0, 0, 0, 0);
    
    // Si la fecha de ejecución es futura o es hoy, no está vencido
    if (fechaRef >= hoy) return false;

    // Calculamos días hábiles transcurridos (Lun-Vie)
    let businessDays = 0;
    let current = new Date(fechaRef);
    
    while (current < hoy) {
        current.setDate(current.getDate() + 1);
        const day = current.getDay();
        if (day !== 0 && day !== 6) { // No es Sábado ni Domingo
            businessDays++;
        }
    }

    // Un anticipo se vence después del 5to día hábil
    return businessDays > 5;
};

/**
 * Formatea un valor numérico a moneda colombiana (COP)
 */
export const formatCurrency = (valor: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor || 0);
};

/**
 * Formatea una fecha a DD/MM/AAAA
 */
export const formatDate = (fecha: string | Date): string => {
    if (!fecha) return "N/A";
    const date = typeof fecha === 'string' ? parseFechaLocal(fecha) : fecha;
    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};
