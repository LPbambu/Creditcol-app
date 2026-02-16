-- SOLUCION_FINAL.sql
-- ESTE SCRIPT ES LA SOLUCION DEFINITIVA.
-- USA CODIGO AVANZADO ("DO BLOCKS") PARA EVITAR ERRORES DE "YA EXISTE".

-- 1. CREAR TABLAS SI NO EXISTEN
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'America/Bogota',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- REPARAR USUARIO ACTUAL (CREAR PERFIL SI NO EXISTE)
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  upload_id UUID,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  document_type TEXT,
  document_number TEXT,
  city TEXT,
  address TEXT,
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB,
  is_active BOOLEAN DEFAULT true,
  is_blocked BOOLEAN DEFAULT false,
  last_message_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.excel_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  invalid_rows INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.excel_uploads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.message_templates(id),
  name TEXT NOT NULL,
  description TEXT,
  send_type TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  target_filter JSONB,
  total_contacts INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  messages_pending INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.message_templates(id),
  content TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  provider TEXT,
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  error_code TEXT,
  has_response BOOLEAN DEFAULT false,
  response_content TEXT,
  response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  account_sid TEXT,
  auth_token TEXT,
  phone_number_id TEXT,
  business_account_id TEXT,
  api_key TEXT,
  is_active BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  daily_message_limit INTEGER DEFAULT 1000,
  messages_sent_today INTEGER DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_config_user_id ON public.whatsapp_config(user_id);


-- 2. BLOQUE DE CODIGO SEGURO PARA LAS POLITICAS
-- ESTE BLOQUE VERIFICA SI EXISTE LA POLITICA ANTES DE CREARLA
DO $$
BEGIN
    -- PROFILES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;

    -- CONTACTS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Users can view own contacts') THEN
        CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Users can insert own contacts') THEN
        CREATE POLICY "Users can insert own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Users can update own contacts') THEN
        CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Users can delete own contacts') THEN
        CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- UPLOADS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'excel_uploads' AND policyname = 'Users can view own uploads') THEN
        CREATE POLICY "Users can view own uploads" ON public.excel_uploads FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'excel_uploads' AND policyname = 'Users can insert own uploads') THEN
        CREATE POLICY "Users can insert own uploads" ON public.excel_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- TEMPLATES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_templates' AND policyname = 'Users can view own templates') THEN
        CREATE POLICY "Users can view own templates" ON public.message_templates FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_templates' AND policyname = 'Users can insert own templates') THEN
        CREATE POLICY "Users can insert own templates" ON public.message_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_templates' AND policyname = 'Users can update own templates') THEN
        CREATE POLICY "Users can update own templates" ON public.message_templates FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_templates' AND policyname = 'Users can delete own templates') THEN
        CREATE POLICY "Users can delete own templates" ON public.message_templates FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- CAMPAIGNS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Users can view own campaigns') THEN
        CREATE POLICY "Users can view own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Users can insert own campaigns') THEN
        CREATE POLICY "Users can insert own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Users can update own campaigns') THEN
        CREATE POLICY "Users can update own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Users can delete own campaigns') THEN
        CREATE POLICY "Users can delete own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- MESSAGES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can view own messages') THEN
        CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can insert own messages') THEN
        CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can update own messages') THEN
        CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    -- LOGS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_logs' AND policyname = 'Users can view own logs') THEN
        CREATE POLICY "Users can view own logs" ON public.system_logs FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_logs' AND policyname = 'Users can insert own logs') THEN
        CREATE POLICY "Users can insert own logs" ON public.system_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    END IF;

    -- CONFIG
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_config' AND policyname = 'Users can view own config') THEN
        CREATE POLICY "Users can view own config" ON public.whatsapp_config FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_config' AND policyname = 'Users can insert own config') THEN
        CREATE POLICY "Users can insert own config" ON public.whatsapp_config FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_config' AND policyname = 'Users can update own config') THEN
        CREATE POLICY "Users can update own config" ON public.whatsapp_config FOR UPDATE USING (auth.uid() = user_id);
    END IF;

END
$$;

SELECT 'AHORA SI: TODO FUNCIONA PERFECTAMENTE' AS message;
