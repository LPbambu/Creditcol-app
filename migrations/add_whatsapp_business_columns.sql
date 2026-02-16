-- Script para agregar columnas de WhatsApp Business API templates
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas a message_templates si no existen
DO $$
BEGIN
    -- Columna para indicar si está aprobado por Meta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'message_templates' AND column_name = 'is_whatsapp_approved'
    ) THEN
        ALTER TABLE message_templates ADD COLUMN is_whatsapp_approved BOOLEAN DEFAULT FALSE;
    END IF;

    -- Columna para el ID del template en WhatsApp Business API
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'message_templates' AND column_name = 'whatsapp_template_id'
    ) THEN
        ALTER TABLE message_templates ADD COLUMN whatsapp_template_id TEXT;
    END IF;

    -- Columna para la categoría del template (marketing, utility, authentication)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'message_templates' AND column_name = 'category'
    ) THEN
        ALTER TABLE message_templates ADD COLUMN category TEXT DEFAULT 'marketing';
    END IF;

    -- Columna para el idioma del template
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'message_templates' AND column_name = 'language'
    ) THEN
        ALTER TABLE message_templates ADD COLUMN language TEXT DEFAULT 'es';
    END IF;
END $$;

-- Agregar columnas de respuesta a messages si no existen
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'has_response'
    ) THEN
        ALTER TABLE messages ADD COLUMN has_response BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'response_content'
    ) THEN
        ALTER TABLE messages ADD COLUMN response_content TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'response_at'
    ) THEN
        ALTER TABLE messages ADD COLUMN response_at TIMESTAMPTZ;
    END IF;
END $$;

-- Comentarios para documentación
COMMENT ON COLUMN message_templates.is_whatsapp_approved IS 'Indica si el template fue aprobado por Meta';
COMMENT ON COLUMN message_templates.whatsapp_template_id IS 'ID del template en la API de WhatsApp Business';
COMMENT ON COLUMN message_templates.category IS 'Categoría del template: marketing, utility, authentication';
COMMENT ON COLUMN message_templates.language IS 'Código de idioma del template (es, en, etc.)';

COMMENT ON COLUMN messages.has_response IS 'Indica si el mensaje tiene respuesta del destinatario';
COMMENT ON COLUMN messages.response_content IS 'Contenido de la respuesta';
COMMENT ON COLUMN messages.response_at IS 'Fecha y hora de la respuesta';
