-- ============================================================
-- Migración 002: Agregar columna "tipo" a anticipos
-- Fecha: 2026-10-17
-- Descripción: Distingue anticipos normales (tipo NULL) de
--   legalizaciones directas / gastos sin anticipo
--   (tipo = 'legalizacion_directa').
-- ============================================================

ALTER TABLE public.anticipos ADD COLUMN IF NOT EXISTS tipo TEXT;

-- Recarga el esquema en la API de Supabase para que reconozca la columna
NOTIFY pgrst, 'reload schema';
