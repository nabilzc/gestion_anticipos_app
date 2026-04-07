/**
 * Lógica de negocio unificada para la gestión de anticipos
 */

/**
 * Determina si un anticipo está vencido.
 * Un anticipo se considera vencido si han pasado más de 3 días desde la 'fecha_ejecucion'
 * (o 'created_at' si no hay fecha_ejecucion) y el estado no es 'Cerrado', 'Borrador' o 'Rechazado'.
 */
export const isAnticipoVencido = (anticipo: any): boolean => {
    const { status, fecha_ejecucion, created_at } = anticipo;

    // Estados que no pueden estar vencidos
    if (["Cerrado", "Borrador", "Rechazado"].includes(status)) {
        return false;
    }

    const fechaReferencia = fecha_ejecucion || created_at;
    if (!fechaReferencia) return false;

    const hoy = new Date();
    const fechaRef = new Date(fechaReferencia);
    
    const diffTime = hoy.getTime() - fechaRef.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    return diffDays > 3;
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
