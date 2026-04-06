-- ============================================================
-- Tabla: approval_comments
-- Almacena el hilo de conversación entre asesores y evaluadores
-- para cada solicitud de aprobación.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.approval_comments (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    approval_request_id uuid REFERENCES public.approval_requests(id) ON DELETE CASCADE NOT NULL,
    author_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    author_nombre   text,
    author_role     text DEFAULT 'asesor',   -- 'asesor' | 'evaluador' | 'admin'
    contenido       text,                    -- Texto del mensaje (puede ser null si solo hay archivos)
    archivos_url    text,                    -- URLs separadas por '|||'
    archivos_nombre text,                    -- Nombres separados por '|||'
    created_at      timestamptz DEFAULT now() NOT NULL
);

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_approval_comments_request
    ON public.approval_comments (approval_request_id, created_at);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden VER los comentarios
CREATE POLICY "approval_comments_select"
    ON public.approval_comments
    FOR SELECT
    TO authenticated
    USING (true);

-- Solo el autor puede INSERTAR su propio comentario
CREATE POLICY "approval_comments_insert"
    ON public.approval_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

-- Solo el autor puede ELIMINAR su propio comentario
CREATE POLICY "approval_comments_delete"
    ON public.approval_comments
    FOR DELETE
    TO authenticated
    USING (auth.uid() = author_id);
