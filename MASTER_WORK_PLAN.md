# Plan de Trabajo Maestro - FUNDAEC Gestión de Anticipos

## SECCIÓN 1: ESTADO DEL PROYECTO
- **Porcentaje de completitud general:** ~90%. El ciclo completo (solicitud → aprobación → desembolso → legalización → revisión del aprobador → cierre por Contabilidad y Finanzas) está construido. Falta probarlo con varios usuarios y endurecer la seguridad de la base.
- **Fase actual vs fases siguientes:** 
  - *Actual:* Pruebas del flujo completo con usuarios reales de prueba (solicitante, aprobador, Contabilidad y Finanzas).
  - *Siguiente:* Políticas RLS en Supabase, dominio verificado en Resend y lanzamiento a los primeros usuarios.
- **Bugs críticos/conocidos:** 
  - Los permisos por rol solo existen en la interfaz; las políticas RLS de Supabase no los reflejan. Si RLS solo permite modificar anticipos propios, el aprobador y Contabilidad y Finanzas no podrán procesar anticipos de otros (la app mostrará un error).
  - Los correos salen desde `onboarding@resend.dev` y solo llegan a la cuenta dueña de Resend hasta verificar `fundaec.org`.
  - El enlace "Reportes" del menú apunta a una página que no existe (solo visible para el Administrador Global).
- **Deuda técnica:** Medio-Alta. Estilos *inline* extensivos; `supabase/migrations/init.sql` no refleja la base real.
- **Seguridad:** El 2026-10-17 se eliminó una contraseña de la base que estaba escrita en el código (`fixDatabase.ts`, `/fix-db` y scripts de prueba) y se cambió la contraseña en Supabase. Sigue visible en el historial de git, pero ya no es válida.
- **Última actualización:** 17 de Octubre de 2026

---

## SECCIÓN 2: DESCRIPCIÓN GENERAL
- **Nombre y objetivo del proyecto:** Sistema de Gestión de Anticipos para FUNDAEC. Es un ERP ligero diseñado para centralizar, automatizar y digitalizar la gestión, aprobación, desembolso y legalización de anticipos financieros corporativos.
- **Stack tecnológico completo:**
  - **Framework:** Next.js 16.1.6 (App Router)
  - **Librería UI:** React 19.2.3
  - **Base de Datos & Auth:** Supabase (PostgreSQL + Auth)
  - **Estilos:** Vanilla CSS (CSS Variables)
  - **Reportes:** jspdf, docx, xlsx
  - **Email:** Resend
- **Público objetivo / casos de uso:**
  - *Empleados/Solicitantes:* Solicitar anticipos para viajes o compras, y legalizar los gastos.
  - *Aprobadores (Jefes de área):* Revisar y autorizar o rechazar solicitudes.
  - *Finanzas:* Desembolsar fondos aprobados y cerrar procesos.
  - *Administradores:* Gestionar usuarios, roles, y tablas maestras (Centros de costos, proyectos).

---

## SECCIÓN 3: DISEÑO & UX
- **Sistema de diseño:** Se utiliza un diseño moderno basado en CSS puro (en `globals.css`) empleando un sistema de variables globales.
- **Componentes UI principales:**
  - Tarjetas (`.card`) con sombras suaves y hover effects.
  - Botones primarios/secundarios (`.primary-button`, `.secondary-button`).
  - Badges de estado (`.status-pending`, `.status-approved`, etc.).
  - Componente de firma digital (`SignaturePad`).
- **Paleta de colores principal:**
  - Background: `#f8fafc`
  - Text Foreground: `#111827`
  - Primary (Azul): `#2563eb`
  - Secondary/Accent: `#eff6ff`
  - Destructive (Rojo): `#ef4444`
  - Success (Verde): `#10b981` / `#166534`
- **Tipografía usada:** `Inter`, system-ui, -apple-system, sans-serif.
- **Responsive design:** Uso intensivo de CSS Flexbox y CSS Grid. Formularios y tablas adaptables.
- **Decisiones de UX clave:** Formularios divididos en secciones numeradas para reducir carga cognitiva. Animaciones de celebración ("confeti" en CSS) al completar acciones. Respaldos *offline* (LocalStorage) para evitar pérdida de datos en caso de desconexión.

---

## SECCIÓN 4: ARQUITECTURA & ESTRUCTURA
- **Estructura de carpetas (`src/`):**
  - `/app`: Rutas del App Router (`/administracion`, `/aprobaciones`, `/desembolsos`, `/legalizaciones`, `/solicitudes`, etc.).
  - `/components`: Componentes reutilizables (`Header`, `Sidebar`, `SignaturePad`).
  - `/context`: Contextos globales (`AuthContext.tsx`).
  - `/lib`: Configuración de Supabase y utilidades de negocio (`businessLogic.ts`, `numeroALetras.ts`).
- **Flujo de datos general:** Client-side rendering (CSR) en la mayoría de las vistas, consumiendo Supabase de manera directa en los componentes (con `useEffect`) para leer/escribir datos en tiempo real.
- **Diagrama de relaciones (Lógico):**
  - `profiles` (Usuarios) <--> `anticipos` (1 a N)
  - `anticipos` <--> `anticipo_items` (1 a N)
  - `programas_proyectos` <--> `conexiones_financieras` <--> `centros_costos`

---

## SECCIÓN 5: DEPENDENCIAS & VERSIONES
- **Listado crítico (`package.json`):**
  - `next`: 16.1.6
  - `react` / `react-dom`: 19.2.3
  - `@supabase/supabase-js`: ^2.97.0 (Base de datos y Auth)
  - `lucide-react`: ^0.575.0 (Iconografía estándar de la app)
  - `react-hot-toast`: ^2.6.0 (Notificaciones flotantes / alertas)
  - `jspdf` (^4.2.1) y `jspdf-autotable` (^5.0.7): Para exportación de PDF formales.
  - `docx` (^9.6.1): Generación de documentos Word.
  - `xlsx` (^0.18.5): Lectura/escritura de Excel para legalizaciones.
  - `resend`: ^6.9.3 (Envío de correos transaccionales).

---

## SECCIÓN 6: CONVENCIONES & ESTÁNDARES
- **Convenciones de nombres:**
  - Archivos de React: `PascalCase.tsx`
  - Carpetas de rutas: `kebab-case` (`mis-anticipos`)
  - Tablas/Columnas en BD: `snake_case` (ej. `monto_total`, `fecha_ejecucion`)
- **Linting/formatting:** Configuración base de `eslint-config-next` habilitada.
- **Documentación de funciones:** Comentarios *inline* en la lógica compleja. Faltan JSDoc formales en componentes.

---

## SECCIÓN 7: CONFIGURACIÓN DEL ENTORNO
- **Variables de entorno (`.env.local`):**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Scripts disponibles:**
  - `npm run dev`: Iniciar servidor de desarrollo.
  - `npm run build`: Compilar para producción.
  - `npm run lint`: Ejecutar linter.
- **APIs externas integradas:**
  - Supabase REST API (Vía Supabase Client).
  - Resend API (Notificaciones de email en servidor/Server Actions).
- **Base de datos (Tablas principales):**
  - `anticipos`: Maestro de solicitudes.
  - `anticipo_items`: Detalles de gastos.
  - `centros_costos`, `programas_proyectos`, `programas_proyectos_areas`: Tablas maestras.
  - `conexiones_financieras`: Mapeo contable.
  - `profiles`: Extensión de usuarios de Auth.

---

## SECCIÓN 8: FUNCIONALIDADES IMPLEMENTADAS
- **[COMPLETADO] Autenticación & Perfiles:** SSO con Google vía Supabase. Roles en `perfiles_autorizados`: Solicitante, Aprobador, Administrador, Contabilidad y Finanzas, más el Administrador Global.
- **[COMPLETADO] Permisos por pantalla:** `src/lib/permissions.ts`. El menú muestra a cada persona solo sus módulos; Aprobaciones filtra por aprobador asignado; Desembolsos es exclusivo de Contabilidad y Finanzas; Legalizaciones muestra solo lo propio. El Administrador no puede asignar el rol Administrador ni modificar administradores.
- **[COMPLETADO] Dashboard de Control:** KPIs en tiempo real (Anticipos activos, monto circulante, vencidos), actividad reciente.
- **[COMPLETADO] Nueva Solicitud (Anticipos):** Formulario multi-sección, carga dinámica de Centros de Costo basada en el proyecto, firma digital (Canvas/Upload), guardado offline y "Borrador".
- **[COMPLETADO] Módulo de Aprobaciones:** Pestañas "Solicitudes de anticipo" y "Legalizaciones por revisar".
- **[COMPLETADO] Módulo de Desembolsos (Contabilidad y Finanzas):** Pestañas "Pagos pendientes" y "Legalizaciones por cerrar".
- **[COMPLETADO] Panel de Administración:** Gestión de personal autorizado, carga masiva (con columna `es_contabilidad_finanzas`), estructuras y asignación de aprobadores. La pestaña de anticipos solo consulta soportes.
- **[COMPLETADO] Exportación PDF:** Generación de formato corporativo con logos y firmas incrustadas.
- **[COMPLETADO – PENDIENTE DE PRUEBA] Flujo de legalización:** Carga de soportes con total gastado y comprobante de reintegro obligatorio si sobró dinero → revisión del aprobador → cierre por Contabilidad y Finanzas. Cualquiera de los dos puede devolverla con motivo y el trabajador la corrige y reenvía. Plazo de 5 días hábiles desde el registro del pago. Correos en cada paso. Aplica también a gastos sin anticipo.

---

## SECCIÓN 9: PLAN DE TRABAJO & ROADMAP

### FASE ACTUAL: Pruebas multiusuario y preparación de lanzamiento
- **Task 1: Prueba completa con usuarios de prueba.** [Prioridad: Alta, Complejidad: Baja]
  - Solicitante, aprobador y Contabilidad y Finanzas recorren el ciclo completo, incluidos una devolución y un reintegro.
- **Task 2: Políticas RLS en Supabase.** [Prioridad: Alta, Complejidad: Media]
  - Que la base aplique los mismos permisos que la interfaz: cada trabajador ve lo suyo, el aprobador lo asignado, Contabilidad y Finanzas lo aprobado, y solo administradores modifican `perfiles_autorizados`.
- **Task 3: Correos con dominio verificado.** [Prioridad: Alta, Complejidad: Baja]
  - Verificar `fundaec.org` en Resend y cambiar el remitente en `sendEmail.ts`.
- **Task 4: Aviso a Contabilidad y Finanzas cuando se aprueba una solicitud** ("pendiente de desembolso"). [Prioridad: Media, Complejidad: Baja]
- **Task 5: Refactorización de Estilos CSS.** [Prioridad: Baja, Complejidad: Media]

### PRÓXIMAS FASES:
- **Feature X: Conciliación Financiera Automática.** [Prioridad: Media, Complejidad: Media]
  - Comparar el monto desembolsado original vs. la sumatoria de las facturas legalizadas. Generar alertas si hay saldo a favor de FUNDAEC o del empleado.
- **Feature Y: Alertas Cronometradas (Cron Jobs).** [Prioridad: Media, Complejidad: Media]
  - Disparar correos automáticos 24h antes del vencimiento del plazo (5 días hábiles).

### FUTURO:
- **Feature Z: Integración ERP Externa.** [Prioridad: Baja, Complejidad: Alta]
  - API de exportación de asientos contables hacia el sistema financiero central de FUNDAEC.

---

## SECCIÓN 10: LIMITACIONES & RESTRICCIONES
- **Performance:** Al tener una gran cantidad de `inline-styles` en el DOM virtual, el renderizado de listas largas podría sufrir una ligera penalización.
- **Compatibilidad:** La firma digital usa HTML5 Canvas y `FileReader`, lo que requiere navegadores modernos y actualizados.
- **Escalabilidad:** Toda la aplicación está acoplada al esquema de Supabase. A gran escala, podrían requerirse índices adicionales en la DB.
- **Seguridad:** El guardado local (Offline Backup) guarda datos en texto plano en `localStorage`.

---

## SECCIÓN 11: CÓDIGO CLAVE

**Generación de Configuración de Supabase (`src/lib/supabase.ts`)**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**Lógica Condicional (Restricción de Rol en Solicitudes)**
```tsx
if (!isSolicitante) {
    return (
        <div className="unauthorized-panel">
            <AlertCircle size={48} color="#ef4444" />
            <h1>Acceso Restringido</h1>
            <p>No tienes permisos de "Solicitante" en tu perfil. Contacta al Administrador.</p>
        </div>
    );
}
```

---

## SECCIÓN 12: HISTORIAL DE CAMBIOS (CHANGELOG)
- **2026-10-17** - Flujo completo de legalización: revisión del aprobador, cierre por Contabilidad y Finanzas, devolución con motivo y reenvío, comprobante de reintegro obligatorio, plazo de 5 días hábiles desde el pago y correos en cada paso. Corrección de fechas que se mostraban un día antes.
- **2026-10-17** - Roles Contabilidad y Finanzas y Administrador (con protección de jerarquía) y permisos por pantalla en menú, Aprobaciones, Desembolsos y Legalizaciones (migración `003`).
- **2026-10-17** - Eliminación de la contraseña de la base escrita en el código (`fixDatabase.ts`, `/fix-db`, scripts de prueba) y cambio de contraseña en Supabase.
- **2026-10-17** - Corrección de la lista de Legalizaciones vacía: faltaba la columna `anticipos.tipo` (migración `002`).
- **2026-05-13** - Implementado sistema de asignación jerárquica manual con validación de estructura cruzada (Programa/Área): nueva pestaña 'Asignación de Aprobadores' con filtrado inteligente y pre-selección en Nueva Solicitud. Reordenamiento de pestañas para mejorar flujo administrativo.
- **2026-05-12** - Limpieza de interfaz: Implementado selector múltiple desplegable (multi-select dropdown) para Estructuras Vinculadas.
- **2026-05-12** - Habilitada la edición de Estructuras Operativas (Programas/Proyectos/Áreas) en la pestaña de Configuración Maestro.
- **2026-05-12** - Implementado sistema de protección de jerarquía para el rol de 'Administrador Global'.
- **2026-05-12** - Corrección de error de parseo (JSX) en la vista de Administración originado por un bloque de comentarios mal cerrado.
- **2026-05-12** - Implementado sistema de multirroles con checkboxes y funcionalidad de edición de personal autorizado.
- **2026-05-12** - Simplificación total del Maestro: Eliminación de Fuentes y Conexiones manuales; migración a modelo de permisos basado en Roles por Estructura PAS/Proyecto.
- **2026-05-12** - Simplificación de estructura maestra y sistema de pre-registro de usuarios controlado.
- **2026-04-27** - Implementación de la Vista de Revisión de Soportes (Auditoría) en el panel de Administración para revisar legalizaciones, aprobar y rechazar con galería dinámica de facturas.
- **2026-04-27** - Añadida funcionalidad de eliminación/reemplazo de archivos en el flujo de pre-finalización de legalización.
- **2026-04-27** - Ajuste de UX: Habilitación de formatos Word (.doc, .docx) para la subida de Cuenta de Cobro.
- **2026-04-27** - Debugging de handleFinalSubmit y políticas RLS de base de datos en anticipos.
- **2026-04-27** - Integración estabilizada con Supabase Storage para carga de soportes y validación anti-vacíos.
- **2026-04-27** - Inicio de procesamiento de conciliación financiera (lectura heurística de Excel y diferencias) y zona de evidencias.
- **2026-04-27** - Simplificación de descarga de la cuenta de cobro a formato estático para priorizar estabilidad.
- **2026-04-27** - Depuración profunda de sintaxis XML en Word.
- **2026-04-27** - Generación dinámica de Cuenta de Cobro.
- **2026-04-27** - Lectura de binarios ArrayBuffer para Docx.
- **2026-04-27** - Automatización de cuenta de cobro mediante plantillas dinámicas docx.
- **2026-04-27** - Implementación de selector de formatos Excel y descarga de cuenta de cobro Word.
- **2026-04-27** - Inicio del flujo de legalización con plantillas dinámicas (Selector de formatos Excel/CSV, descargas dinámicas y carga de soportes).
- **2026-04-26** - Middleware Bucle Fix: Relajación de Next.js middleware y cookie sync en AuthContext.
- **2026-04-26** - Estabilización de sesión (F5), creación de middleware y conexión de formulario de solicitud.
- **2026-04-24** - Configuración Panel de Administración, RLS global, y selectores dinámicos vinculados a cuentas de costos.
- **2026-04-22** - Estabilización Módulos Aprobaciones y Desembolsos, solución a errores de renderizado.
- **2026-04-15** - Creación base del Módulo de Legalización, interfaz para subida de archivos (Mobile-first).
- **2026-04-07** - Desarrollo UI de Aprobaciones y exportación en PDF pulida con identidad de FUNDAEC.
- **2026-04-06** - Ajustes al PDF generator y solución a fallos en el Supabase fetch.

---

## SECCIÓN 13: REFERENCIAS & DOCUMENTACIÓN
- **Documentación Técnica Principal:** `README.md` incluido en el repositorio.
- **Despliegue:** Proyecto optimizado para Vercel.
- **Infraestructura:** Supabase Dashboard (Control de Auth, Storage, y SQL Editor).
- **Librería de Componentes:** Icons provistos por [Lucide](https://lucide.dev/).
