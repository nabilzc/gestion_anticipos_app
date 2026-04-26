# Plan de Trabajo Maestro - FUNDAEC Gestión de Anticipos

## SECCIÓN 1: ESTADO DEL PROYECTO
- **Porcentaje de completitud general:** ~85% (Módulos core de solicitud, aprobación, desembolso y administración completados).
- **Fase actual vs fases siguientes:** 
  - *Actual:* Estabilización de políticas de seguridad (RLS), refinamiento del panel de administración y desarrollo activo del módulo de legalizaciones.
  - *Siguiente:* Finalización del flujo de legalización y conciliación financiera.
- **Bugs críticos/conocidos:** 
  - Posibles advertencias de fetch (RLS) en consultas a tablas maestras (`programas_proyectos_areas`, `conexiones_financieras`).
  - Posibles bucles de navegación/retrasos en la sincronización de sesión al cambiar roles administrativos.
- **Deuda técnica:** Medio-Alta. Existen múltiples componentes (ej. `solicitudes/nueva/page.tsx`, `page.tsx`) que utilizan estilos *inline* extensivos en lugar de extraerlos a CSS Modules o clases utilitarias, lo que dificulta la mantenibilidad.
- **Última actualización:** 26 de Abril de 2026

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
- **[COMPLETADO] Autenticación & Perfiles:** SSO/Email con Supabase. Gestión de roles (Administrador Global, Solicitante, Aprobador, Finanzas).
- **[COMPLETADO] Dashboard de Control:** KPIs en tiempo real (Anticipos activos, monto circulante, vencidos), actividad reciente.
- **[COMPLETADO] Nueva Solicitud (Anticipos):** Formulario multi-sección, carga dinámica de Centros de Costo basada en el proyecto, firma digital (Canvas/Upload), guardado offline y "Borrador".
- **[COMPLETADO] Módulo de Aprobaciones:** Listado filtrado por estado. Revisión y estampado de firma del aprobador.
- **[COMPLETADO] Módulo de Desembolsos:** Interfaz financiera para asentar el pago real del anticipo.
- **[COMPLETADO] Panel de Administración:** Gestión CRUD de usuarios, roles, y regiones.
- **[COMPLETADO] Exportación PDF:** Generación de formato corporativo con logos y firmas incrustadas.
- **[EN PROGRESO] Módulo de Legalizaciones:** Carga de facturas (JPG/PNG/PDF), procesamiento de plantillas Excel.

---

## SECCIÓN 9: PLAN DE TRABAJO & ROADMAP

### FASE ACTUAL: Legalización & Estabilidad
- **Feature 1: Módulo de Legalización Final.** [Prioridad: Alta, Complejidad: Alta]
  - Finalizar la UI para subir múltiples soportes (imágenes/PDF).
  - Procesamiento del formato de Excel masivo.
  - Guardado en Supabase Storage asociado al `ID_Anticipo`.
- **Task 1: Refactorización de Estilos CSS.** [Prioridad: Media, Complejidad: Media]
  - Extraer los estilos *inline* de las páginas a clases CSS en `globals.css` o CSS Modules para mejorar rendimiento y lectura.
- **Task 2: Auditoría RLS (Row Level Security).** [Prioridad: Alta, Complejidad: Media]
  - Asegurar que las consultas a tablas conectadas (`conexiones_financieras`) no fallen por permisos de usuario autenticado estándar.

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
