/**
 * Lógica de negocio unificada para la gestión de anticipos
 */

/**
 * Determina si un anticipo está vencido.
 * Un anticipo se considera vencido si han pasado más de 5 días HÁBILES desde la 'fecha_ejecucion'
 * (o 'created_at' si no hay fecha_ejecucion) y el estado no es 'Cerrado', 'Borrador' o 'Rechazado'.
 */
export const isAnticipoVencido = (anticipo: any): boolean => {
    const { status, fecha_ejecucion, created_at } = anticipo;

    // Estados que no pueden estar vencidos
    if (["Cerrado", "Borrador", "Rechazado", "Aprobado", "En Revisión", "Legalizado"].includes(status)) {
        return false;
    }

    const fechaReferencia = fecha_ejecucion || created_at;
    if (!fechaReferencia) return false;

    // Normalizamos las fechas para comparar solo días, ignorando la hora
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaRef = new Date(fechaReferencia);
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
    return new Date(fecha).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};
