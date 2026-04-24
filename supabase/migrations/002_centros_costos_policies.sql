-- Enable secure access to centros_costos under RLS.
-- Table already exists in 001_create_schema.sql.

CREATE POLICY "Authenticated users can view cost centers"
ON public.centros_costos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert cost centers"
ON public.centros_costos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Administrador Global', 'Administrador')
  )
);

CREATE POLICY "Admins can update cost centers"
ON public.centros_costos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Administrador Global', 'Administrador')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Administrador Global', 'Administrador')
  )
);