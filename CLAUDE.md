# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto

Sistema de gestión de anticipos de FUNDAEC (Next.js 16 App Router + React 19 + Supabase + Resend, desplegado en Vercel). El dueño del proyecto es el Director Administrativo y Financiero; no es programador. Responde en español, en lenguaje claro, y explica los pasos que él debe hacer fuera del código (Supabase, Vercel, Resend). El proyecto también se trabaja con Antigravity IDE; `MASTER_WORK_PLAN.md` es el plan y changelog compartido entre herramientas (puede estar desactualizado frente al código).

## Comandos

```bash
npm run dev          # servidor local en http://localhost:3000
npm run build        # build de producción (lo que corre Vercel)
npm run lint         # eslint
npx tsc --noEmit     # chequeo de tipos
```

No hay tests automatizados. Los archivos `*.js` sueltos en la raíz (`check_db*.js`, `set_admin.js`, etc.) son scripts de diagnóstico ad hoc, no forman parte de la app.

## Arquitectura

- **Todo es cliente.** Las páginas en `src/app/**/page.tsx` son `"use client"` y consultan Supabase directamente con el cliente de `src/lib/supabase.ts` (llave pública/anon). No hay capa de API: **la seguridad de los datos depende por completo de las políticas RLS de Supabase**. Las únicas Server Actions son `src/app/actions/sendEmail.ts` (Resend) y `logError.ts`.
- `src/lib/supabase.ts` envuelve `fetch` para registrar en servidor cualquier respuesta no-OK de Supabase.
- Cada página monta su propio `<Toaster />` de `react-hot-toast`; no hay uno global.
- Estilos mayormente inline, con variables CSS en `globals.css`.

### Autenticación y roles

- `src/context/AuthContext.tsx` maneja la sesión (Google OAuth vía Supabase). En cada login cruza `profiles` con `perfiles_autorizados` (la lista blanca administrada desde `/administracion`) y recalcula `role`, `es_solicitante`, `es_aprobador`. Si el email no está en `perfiles_autorizados`, cierra sesión.
- `nzapata@fundaec.org` tiene un pase hardcodeado como `Administrador Global`: su `user.profile` es un objeto mínimo y **no** se carga desde la base (no trae `full_name`, `programa`, etc.).
- `src/middleware.ts` solo verifica que exista la cookie `sb-auth-token` en algunas rutas; no valida roles.
- Los permisos se calculan en `src/lib/permissions.ts` (`getPermisos`) y los usan el `Sidebar` y cada página. Roles en `perfiles_autorizados`: `es_solicitante`, `es_aprobador`, `es_administrador`, `es_contabilidad_finanzas` (este último solo existe ahí, no en `profiles`). El Administrador Global ve todo; un Administrador entra a Administración pero no puede asignar el rol Administrador ni modificar administradores (`esPerfilProtegido`).
- Estas restricciones son solo de interfaz: las políticas RLS de Supabase todavía no las reflejan.

### Ciclo de vida de un anticipo

Todo vive en la tabla `anticipos` (con `anticipo_items` para el detalle de gastos). El campo `status` es texto libre y cada página escribe una transición:

| Estado | Lo escribe | Notas |
|---|---|---|
| `Borrador` / `Enviado` | `solicitudes/nueva` | Envía correo al solicitante y al aprobador (`aprobador_email`) |
| `Aprobado` / `Rechazado` | `aprobaciones` | Lista todos los `Enviado`, sin filtrar por aprobador |
| `Desembolsado` | `desembolsos` (Contabilidad y Finanzas) | Guarda `fecha_pago` y `comprobante_id`; correo al trabajador y al aprobador |
| `En Revisión` (revisión del aprobador) | `legalizaciones/[id]` | Sube soportes al bucket `legalizaciones` y guarda `metadata_legalizacion` (JSONB): `soportes`, `total_legalizado`; correo al aprobador |
| `Revisión Finanzas` / `Devuelto` | `aprobaciones` (pestaña legalizaciones) | |
| `Cerrado` / `Devuelto` | `desembolsos` (pestaña cierre) | |

- Las transiciones de revisión están centralizadas en `src/lib/legalizacion.ts` (validan el estado de origen para evitar doble proceso) y la UI de revisión en `src/components/LegalizacionesPorRevisar.tsx` + `RevisionLegalizacionModal.tsx`. Administración solo consulta soportes.
- `Devuelto` vuelve al trabajador: `metadata_legalizacion.devolucion` guarda quién, motivo y fecha; al reenviar se reemplazan los soportes y pasa de nuevo por el aprobador.
- Si `total_legalizado < monto_total`, el trabajador debe adjuntar un soporte con `categoria: 'reintegro'`.
- **Gastos sin anticipo** usan la misma tabla con `tipo = 'legalizacion_directa'`, nacen en `En Revisión` y siguen el mismo flujo de revisión (`legalizaciones/directa/*`). Los anticipos normales tienen `tipo` NULL.
- `Finalizado` y `Legalizado` son estados heredados equivalentes a `Cerrado`; `Rechazado` se usa solo para solicitudes rechazadas antes del desembolso. Constantes en `ESTADO` de `businessLogic.ts`.
- `isAnticipoVencido()` define el plazo: 5 días hábiles desde `fecha_pago`. Las fechas `YYYY-MM-DD` se parsean como hora local (Colombia) para no correrse un día.

### Base de datos

- `supabase/migrations/init.sql` **no refleja la base real** (por ejemplo, la base real tiene `fecha_pago`/`comprobante_id`, no `fecha_desembolso`/`transaccion_desembolso`). Antes de usar una columna, verifícala contra la base real. Prueba rápida de solo lectura (devuelve error `42703` si la columna no existe):
  ```bash
  curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/anticipos?select=COLUMNA&limit=0" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
  ```
- Cambios de esquema: crear `supabase/migrations/NNN_descripcion.sql` (terminando en `NOTIFY pgrst, 'reload schema';`) y pedirle al usuario que lo ejecute en el SQL Editor de Supabase. Claude no tiene acceso de escritura a la base. La app nunca debe conectarse directamente a Postgres ni contener la contraseña de la base.
- Trampas de Supabase en este código: una columna inexistente en un filtro produce un `400` que vacía la lista; un `update` bloqueado por RLS **no** devuelve error. Usa `.select()` después del update y verifica que regresen filas.
- Otras tablas: `programas_proyectos_areas` (estructuras: Programas, Proyectos, Área, Dirección), `perfiles_autorizados`, `profiles`, `centros_costos`, `responsables_programas`, `legalizaciones` (uso parcial).

### Correos

`sendEmail.ts` usa el remitente de prueba `onboarding@resend.dev`, que solo entrega a la cuenta dueña de Resend, hasta que se verifique el dominio `fundaec.org`. Los avisos a Contabilidad y Finanzas van a los correos con `es_contabilidad_finanzas` (respaldo: `contabilidad@fundaec.org`). Los textos de usuario se escapan con `esc()`; el enlace a la app llega como `app_url` desde el cliente (`window.location.origin`).
