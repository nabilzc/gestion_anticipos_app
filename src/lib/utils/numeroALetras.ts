export const numeroALetras = (n: number | null | undefined): string => {
    if (n === null || n === undefined || n === 0) return 'Cero pesos (M/CTE)';
    const entero = Math.floor(n);
    const texto = convertirEntero(entero);
    return `${texto.charAt(0).toUpperCase() + texto.slice(1)} pesos (M/CTE)`;
};

const convertirEntero = (n: number): string => {
    if (n === 0) return 'cero';
    if (n < 0) return 'menos ' + convertirEntero(-n);

    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
        'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
        'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    if (n < 30) return unidades[n];
    if (n < 100) {
        const d = Math.floor(n / 10);
        const u = n % 10;
        return u === 0 ? decenas[d] : decenas[d] + ' y ' + unidades[u];
    }
    if (n === 100) return 'cien';
    if (n < 1000) {
        const c = Math.floor(n / 100);
        const r = n % 100;
        return (c === 1 ? 'ciento' : centenas[c]) + (r > 0 ? ' ' + convertirEntero(r) : '');
    }
    if (n === 1000) return 'mil';
    if (n < 1000000) {
        const miles = Math.floor(n / 1000);
        const r = n % 1000;
        const prefMil = miles === 1 ? 'mil' : convertirEntero(miles) + ' mil';
        return prefMil + (r > 0 ? ' ' + convertirEntero(r) : '');
    }
    if (n < 1000000000) {
        const mill = Math.floor(n / 1000000);
        const r = n % 1000000;
        const prefMill = mill === 1 ? 'un millón' : convertirEntero(mill) + ' millones';
        return prefMill + (r > 0 ? ' ' + convertirEntero(r) : '');
    }
    return n.toLocaleString('es-CO');
};
