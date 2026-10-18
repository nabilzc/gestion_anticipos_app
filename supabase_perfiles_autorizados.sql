-- Ejecuta esto en el SQL Editor de Supabase:
CREATE TABLE IF NOT EXISTS public.perfiles_autorizados (
  email TEXT PRIMARY KEY,
  nombre_completo TEXT,
  rol TEXT CHECK (rol IN ('Solicitante', 'Aprobador', 'Administrador')),
  id_programa_area UUID REFERENCES public.programas_proyectos_areas(id)
);

-- Habilitar RLS (opcional pero recomendado)
ALTER TABLE public.perfiles_autorizados ENABLE ROW LEVEL SECURITY;

-- Politicas para perfiles_autorizados
CREATE POLICY "Lectura pública de perfiles autorizados" 
ON public.perfiles_autorizados FOR SELECT 
USING (true);

-- Política para que solo administradores puedan editar
CREATE POLICY "Administradores pueden editar perfiles autorizados" 
ON public.perfiles_autorizados FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'Administrador Global' OR profiles.role = 'Administrador')
  )
);
