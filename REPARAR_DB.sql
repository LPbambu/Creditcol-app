-- REPARAR_DB.sql
-- ESTE SCRIPT ARREGLA TODO: TABLAS FALTANTES Y ERRORES DE POLITICAS
-- EJECUTAR EN EL SQL EDITOR DE SUPABASE

-- ============================================
-- 1. LIMPIEZA PREVIA (Para evitar errores de "ya existe")
-- ============================================

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- CONTACTS
DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;

-- UPLOADS
DROP POLICY IF EXISTS "Users can view own uploads" ON public.excel_uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON public.excel_uploads;

-- TEMPLATES
DROP POLICY IF EXISTS "Users can view own templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.message_templates;

-- CAMPAIGNS
DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;

-- MESSAGES
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

-- LOGS
DROP POLICY IF EXISTS "Users can view own logs" ON public.system_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON public.system_logs;

-- CONFIG
DROP POLICY IF EXISTS "Users can view own config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Users can insert own config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Users can update own config" ON public.whatsapp_config;

-- ============================================
-- 2. CREACION DE TABLAS (Si no existen)
-- ============================================

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

-- IMPORTANTE: Reparar usuarios que ya existen pero no tienen perfil
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

-- ============================================
-- 3. CREACION DE POLITICAS
-- ============================================

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own uploads" ON public.excel_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own uploads" ON public.excel_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own templates" ON public.message_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON public.message_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.message_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.message_templates FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own logs" ON public.system_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.system_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own config" ON public.whatsapp_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own config" ON public.whatsapp_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own config" ON public.whatsapp_config FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 4. TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_updated_at ON public.profiles;
CREATE TRIGGER trigger_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_updated_at ON public.contacts;
CREATE TRIGGER trigger_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

SELECT 'REPARACION COMPLETADA CON EXITO' AS message;
