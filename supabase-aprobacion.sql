-- ============================================================
-- SCRIPT DE APROBACIÓN - CREDITCOL
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Agregar campo 'role' a la tabla profiles si no existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'asesor' 
CHECK (role IN ('asesor', 'evaluador', 'admin'));

-- 2. Crear la tabla approval_requests
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Información del prospecto
    nombre_cliente TEXT NOT NULL,
    telefono TEXT NOT NULL,
    entidades_reporte TEXT NOT NULL,   -- Con qué entidades está reportado

    -- Desprendible (archivo)
    desprendible_url TEXT,             -- URL del archivo en Storage
    desprendible_nombre TEXT,          -- Nombre original del archivo

    -- Estado del proceso
    estado TEXT NOT NULL DEFAULT 'pendiente_aprobacion' 
        CHECK (estado IN ('pendiente_aprobacion', 'aprobado', 'descartado')),

    -- Auditoría
    asesor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    asesor_nombre TEXT,
    evaluador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    evaluador_nombre TEXT,
    fecha_evaluacion TIMESTAMP WITH TIME ZONE,
    notas_evaluador TEXT
);

-- 3. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON approval_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_estado ON approval_requests(estado);
CREATE INDEX IF NOT EXISTS idx_approval_requests_asesor_id ON approval_requests(asesor_id);

-- 4. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER update_approval_requests_updated_at
    BEFORE UPDATE ON approval_requests
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 5. Habilitar RLS
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS
-- Cualquier usuario autenticado puede VER todas las solicitudes
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver solicitudes" ON approval_requests;
CREATE POLICY "Usuarios autenticados pueden ver solicitudes"
    ON approval_requests FOR SELECT
    TO authenticated
    USING (true);

-- Solo asesores/admins pueden INSERTAR
DROP POLICY IF EXISTS "Asesores pueden crear solicitudes" ON approval_requests;
CREATE POLICY "Asesores pueden crear solicitudes"
    ON approval_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = asesor_id);

-- Solo evaluadores/admins pueden ACTUALIZAR el estado
DROP POLICY IF EXISTS "Evaluadores pueden actualizar estado" ON approval_requests;
CREATE POLICY "Evaluadores pueden actualizar estado"
    ON approval_requests FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('evaluador', 'admin')
        )
    );

-- Asesores o evaluadores/admins pueden ELIMINAR solicitudes
DROP POLICY IF EXISTS "Usuarios pueden eliminar solicitudes" ON approval_requests;
CREATE POLICY "Usuarios pueden eliminar solicitudes"
    ON approval_requests FOR DELETE
    TO authenticated
    USING (
        auth.uid() = asesor_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('evaluador', 'admin')
        )
    );

-- 7. Crear bucket de Storage para desprendibles
-- (Ejecutar esto por separado si falla)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('desprendibles', 'desprendibles', false)
ON CONFLICT (id) DO NOTHING;

-- Política de storage: autenticados pueden subir
DROP POLICY IF EXISTS "Autenticados pueden subir desprendibles" ON storage.objects;
CREATE POLICY "Autenticados pueden subir desprendibles"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'desprendibles');

-- Política de storage: autenticados pueden ver
DROP POLICY IF EXISTS "Autenticados pueden ver desprendibles" ON storage.objects;
CREATE POLICY "Autenticados pueden ver desprendibles"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'desprendibles');

-- 8. Para asignar rol de evaluador a un usuario existente:
-- UPDATE profiles SET role = 'evaluador' WHERE email = 'evaluador@creditcol.com';
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@creditcol.com';
