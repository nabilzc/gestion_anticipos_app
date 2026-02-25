-- ============================================================
-- Migración 001: Crear tabla de perfiles de usuario
-- Fecha: 2026-02-24
-- Descripción: Tabla para almacenar datos adicionales del 
--   usuario como cuenta bancaria, cédula, cargo, etc.
--   Se crea automáticamente un perfil al registrarse vía Google.
-- ============================================================

-- 1. Crear tabla de perfiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  cedula TEXT,
  cargo TEXT,
  banco TEXT,
  tipo_cuenta TEXT,          -- 'Ahorros' o 'Corriente'
  numero_cuenta TEXT,
  telefono TEXT,
  rol TEXT DEFAULT 'usuario', -- 'administrador', 'analista', 'usuario'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad
--    Cada usuario solo puede leer su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

--    Cada usuario solo puede actualizar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

--    Un usuario puede insertar su propio perfil
CREATE POLICY "Insertar perfil propio"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Función: crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger: se ejecuta cuando un nuevo usuario inicia sesión
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
