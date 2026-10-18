-- ============================================================
-- SQL Schema Reconstruction for FUNDAEC Gestión de Anticipos
-- Fecha: 2026-05-21
-- ============================================================

-- 1. Crear tabla de Programas, Proyectos y Áreas
CREATE TABLE IF NOT EXISTS public.programas_proyectos_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'Programas', 'Proyectos', 'Área', 'Dirección'
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Crear tabla de Perfiles de Usuario (Extensión de Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  cedula TEXT,
  cargo TEXT,
  banco TEXT,
  tipo_cuenta TEXT, -- 'Ahorros' o 'Corriente'
  numero_cuenta TEXT,
  telefono TEXT,
  role TEXT DEFAULT 'Solicitante', -- 'Administrador Global', 'Administrador', 'Aprobador', 'Solicitante'
  programa TEXT,
  es_solicitante BOOLEAN DEFAULT true,
  es_aprobador BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Crear tabla de Perfiles Autorizados para Registro Pre-aprobado
CREATE TABLE IF NOT EXISTS public.perfiles_autorizados (
  email TEXT PRIMARY KEY,
  nombre_completo TEXT,
  es_administrador BOOLEAN DEFAULT false,
  es_aprobador BOOLEAN DEFAULT false,
  es_solicitante BOOLEAN DEFAULT true,
  id_programa_area UUID REFERENCES public.programas_proyectos_areas(id),
  aprobador_email TEXT,
  aprobador_suplente_email TEXT
);

-- 4. Crear tabla de Responsables de Programas (Jerarquía)
CREATE TABLE IF NOT EXISTS public.responsables_programas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  programa_id UUID REFERENCES public.programas_proyectos_areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Crear tabla de Anticipos
CREATE TABLE IF NOT EXISTS public.anticipos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitante_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Borrador', -- 'Borrador', 'Enviado', 'Aprobado', 'Rechazado', 'Desembolsado', 'Legalizado', 'Cerrado'
  motivo TEXT NOT NULL,
  monto_total NUMERIC NOT NULL,
  monto_letras TEXT NOT NULL,
  banco_nombre TEXT,
  banco_tipo_cuenta TEXT,
  banco_numero_cuenta TEXT,
  fecha_ejecucion DATE,
  observaciones TEXT,
  firma_base64 TEXT,
  tipo_documento TEXT,
  numero_documento TEXT,
  cargo TEXT,
  proyecto TEXT,
  contacto TEXT,
  aprobador_email TEXT,
  fecha_desembolso TIMESTAMPTZ,
  transaccion_desembolso TEXT,
  notas_desembolso TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Crear tabla de Ítems de Anticipos (Gastos específicos)
CREATE TABLE IF NOT EXISTS public.anticipo_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anticipo_id UUID REFERENCES public.anticipos(id) ON DELETE CASCADE,
  tipo_gasto TEXT NOT NULL,
  codigo TEXT,
  descripcion TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Crear tabla de Legalizaciones (Soportes e información contable)
CREATE TABLE IF NOT EXISTS public.legalizaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anticipo_id UUID REFERENCES public.anticipos(id) ON DELETE CASCADE,
  url_excel TEXT,
  url_cuenta_cobro TEXT,
  estado_auditoria TEXT DEFAULT 'Pendiente', -- 'Pendiente', 'Aprobado', 'Rechazado'
  comentarios_auditoria TEXT,
  fecha_legalizacion TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.programas_proyectos_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_autorizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsables_programas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anticipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anticipo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legalizaciones ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS POLICIES)
-- ==========================================

-- Políticas para programas_proyectos_areas
CREATE POLICY "Lectura pública de estructuras operativas" ON public.programas_proyectos_areas
  FOR SELECT USING (true);

CREATE POLICY "Administradores pueden gestionar estructuras" ON public.programas_proyectos_areas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'Administrador Global' OR profiles.role = 'Administrador')
    )
  );

-- Políticas para profiles
CREATE POLICY "Usuarios pueden ver todos los perfiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para perfiles_autorizados
CREATE POLICY "Lectura pública de perfiles autorizados" ON public.perfiles_autorizados
  FOR SELECT USING (true);

CREATE POLICY "Administradores pueden editar perfiles autorizados" ON public.perfiles_autorizados
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'Administrador Global' OR profiles.role = 'Administrador')
    )
  );

-- Políticas para responsables_programas
CREATE POLICY "Lectura pública de responsables" ON public.responsables_programas
  FOR SELECT USING (true);

CREATE POLICY "Administradores pueden editar responsables" ON public.responsables_programas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'Administrador Global' OR profiles.role = 'Administrador')
    )
  );

-- Políticas para anticipos
CREATE POLICY "Usuarios pueden ver sus propios anticipos o si son aprobadores/finanzas" ON public.anticipos
  FOR SELECT USING (
    auth.uid() = solicitante_id OR
    aprobador_email = (SELECT email FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'Administrador Global' OR profiles.role = 'Administrador' OR profiles.role = 'Finanzas')
    )
  );

CREATE POLICY "Solicitantes pueden insertar anticipos" ON public.anticipos
  FOR INSERT WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Usuarios pueden actualizar sus propios anticipos o aprobadores" ON public.anticipos
  FOR UPDATE USING (
    auth.uid() = solicitante_id OR
    aprobador_email = (SELECT email FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'Administrador Global' OR profiles.role = 'Administrador' OR profiles.role = 'Finanzas')
    )
  );

-- Políticas para anticipo_items
CREATE POLICY "Ver items si tiene acceso al anticipo padre" ON public.anticipo_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.anticipos
      WHERE anticipos.id = anticipo_items.anticipo_id
    )
  );

CREATE POLICY "Insertar items si tiene acceso al anticipo padre" ON public.anticipo_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.anticipos
      WHERE anticipos.id = anticipo_items.anticipo_id AND anticipos.solicitante_id = auth.uid()
    )
  );

CREATE POLICY "Actualizar items si tiene acceso al anticipo padre" ON public.anticipo_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.anticipos
      WHERE anticipos.id = anticipo_items.anticipo_id AND anticipos.solicitante_id = auth.uid()
    )
  );

-- Políticas para legalizaciones
CREATE POLICY "Ver legalizaciones si tiene acceso" ON public.legalizaciones
  FOR SELECT USING (true);

CREATE POLICY "Insertar/Modificar legalizaciones" ON public.legalizaciones
  FOR ALL USING (true);

-- ==========================================
-- TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ==========================================

-- Función: Crear un perfil de usuario automáticamente al iniciar sesión por primera vez
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, es_solicitante)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'Solicitante',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la función anterior al registrar en Auth
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
