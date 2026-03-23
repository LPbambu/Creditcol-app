-- ============================================================
-- FIX: Políticas RLS faltantes en la tabla leads
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Asegurarse de que RLS esté activo en leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas previas si existen (para evitar conflictos)
DROP POLICY IF EXISTS "leads_select_policy" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_policy" ON public.leads;
DROP POLICY IF EXISTS "leads_update_policy" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_policy" ON public.leads;

-- Nombres alternativos que pudieron haberse creado antes
DROP POLICY IF EXISTS "Enable read access for all users" ON public.leads;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.leads;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.leads;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.leads;

-- 3. Crear políticas correctas
-- SELECT: cualquier usuario autenticado puede ver todos los leads
CREATE POLICY "leads_select_policy" ON public.leads
  FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT: cualquier usuario autenticado puede insertar leads
CREATE POLICY "leads_insert_policy" ON public.leads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: cualquier usuario autenticado puede actualizar leads
CREATE POLICY "leads_update_policy" ON public.leads
  FOR UPDATE USING (auth.role() = 'authenticated');

-- DELETE: cualquier usuario autenticado puede eliminar leads
CREATE POLICY "leads_delete_policy" ON public.leads
  FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Verificar que quedó bien
SELECT 
  policyname, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'leads';

SELECT 'Políticas RLS de leads configuradas correctamente ✅' AS resultado;
