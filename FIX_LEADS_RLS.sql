-- ============================================================
-- FIX COMPLETO: Tabla leads - RLS + CHECK constraints
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── PASO 1: Ver estructura actual de la tabla leads ──────────
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leads'
ORDER BY ordinal_position;

-- ── PASO 2: Ver restricciones CHECK actuales ─────────────────
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.leads'::regclass AND contype = 'c';

-- ── PASO 3: Ver políticas RLS actuales ───────────────────────
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'leads';

-- ── PASO 4: Eliminar CHECK constraint en estado (si existe) ──
-- Busca el nombre real de la restricción en el resultado del PASO 2
-- y reemplázalo abajo. Ejemplos comunes:
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.leads'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%estado%'
    LOOP
        EXECUTE format('ALTER TABLE public.leads DROP CONSTRAINT %I', r.conname);
        RAISE NOTICE 'Eliminado constraint: %', r.conname;
    END LOOP;
END $$;

-- ── PASO 5: Activar RLS ──────────────────────────────────────
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ── PASO 6: Limpiar políticas previas ────────────────────────
DROP POLICY IF EXISTS "leads_select_policy"    ON public.leads;
DROP POLICY IF EXISTS "leads_insert_policy"    ON public.leads;
DROP POLICY IF EXISTS "leads_update_policy"    ON public.leads;
DROP POLICY IF EXISTS "leads_delete_policy"    ON public.leads;
DROP POLICY IF EXISTS "Enable read access for all users"             ON public.leads;
DROP POLICY IF EXISTS "Enable insert for authenticated users only"   ON public.leads;
DROP POLICY IF EXISTS "Enable update for authenticated users only"   ON public.leads;
DROP POLICY IF EXISTS "Enable delete for authenticated users only"   ON public.leads;

-- ── PASO 7: Crear políticas correctas ────────────────────────
-- Los leads vienen del formulario público → usan anon para INSERT
-- El dashboard usa authenticated → necesita SELECT, UPDATE, DELETE

CREATE POLICY "leads_select_policy" ON public.leads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "leads_insert_policy" ON public.leads
  FOR INSERT WITH CHECK (true);  -- permite inserción anon desde landing

CREATE POLICY "leads_update_policy" ON public.leads
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "leads_delete_policy" ON public.leads
  FOR DELETE USING (auth.role() = 'authenticated');

-- ── PASO 8: Verificar resultado ──────────────────────────────
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'leads';

SELECT 'FIX completado ✅' AS resultado;
