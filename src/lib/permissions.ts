export const ADMIN_GLOBAL_EMAIL = 'nzapata@fundaec.org';

export function getPermisos(user: any) {
    const profile = user?.profile || {};
    const esAdminGlobal = profile.role === 'Administrador Global';

    return {
        esAdminGlobal,
        puedeAdministrar: esAdminGlobal || profile.role === 'Administrador',
        puedeSolicitar: esAdminGlobal || profile.es_solicitante === true,
        puedeAprobar: esAdminGlobal || profile.es_aprobador === true,
        esContabilidadFinanzas: esAdminGlobal || profile.es_contabilidad_finanzas === true,
    };
}

// Un Administrador no puede modificar a otros administradores ni al Administrador Global
export function esPerfilProtegido(perfil: any) {
    return perfil?.es_administrador === true || perfil?.email === ADMIN_GLOBAL_EMAIL;
}
