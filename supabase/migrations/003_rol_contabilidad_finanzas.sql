-- ============================================================
-- Migración 003: Rol "Contabilidad y Finanzas"
-- Fecha: 2026-10-17
-- Descripción: Habilita el acceso a Desembolsos y, más adelante,
--   el cierre de legalizaciones. Se asigna desde Administración.
-- ============================================================

ALTER TABLE public.perfiles_autorizados
  ADD COLUMN IF NOT EXISTS es_contabilidad_finanzas BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
