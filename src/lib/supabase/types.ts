// Database types for Supabase
// These match the schema defined in plan-maestro.md

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    phone: string | null
                    company_name: string | null
                    avatar_url: string | null
                    timezone: string
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    phone?: string | null
                    company_name?: string | null
                    avatar_url?: string | null
                    timezone?: string
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    phone?: string | null
                    company_name?: string | null
                    avatar_url?: string | null
                    timezone?: string
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            contacts: {
                Row: {
                    id: string
                    user_id: string
                    upload_id: string | null
                    full_name: string
                    phone: string
                    email: string | null
                    document_type: string | null
                    document_number: string | null
                    city: string | null
                    address: string | null
                    notes: string | null
                    tags: string[] | null
                    custom_fields: Record<string, any> | null
                    is_active: boolean
                    is_blocked: boolean
                    last_message_sent_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    upload_id?: string | null
                    full_name: string
                    phone: string
                    email?: string | null
                    document_type?: string | null
                    document_number?: string | null
                    city?: string | null
                    address?: string | null
                    notes?: string | null
                    tags?: string[] | null
                    custom_fields?: Record<string, any> | null
                    is_active?: boolean
                    is_blocked?: boolean
                    last_message_sent_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    upload_id?: string | null
                    full_name?: string
                    phone?: string
                    email?: string | null
                    document_type?: string | null
                    document_number?: string | null
                    city?: string | null
                    address?: string | null
                    notes?: string | null
                    tags?: string[] | null
                    custom_fields?: Record<string, any> | null
                    is_active?: boolean
                    is_blocked?: boolean
                    last_message_sent_at?: string | null
                }
            }
            excel_uploads: {
                Row: {
                    id: string
                    user_id: string
                    file_name: string
                    file_path: string
                    file_size: number
                    file_type: string
                    total_rows: number
                    valid_rows: number
                    invalid_rows: number
                    status: 'pending' | 'processing' | 'completed' | 'failed'
                    error_message: string | null
                    metadata: Record<string, any> | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    file_name: string
                    file_path: string
                    file_size: number
                    file_type: string
                    total_rows?: number
                    valid_rows?: number
                    invalid_rows?: number
                    status?: 'pending' | 'processing' | 'completed' | 'failed'
                    error_message?: string | null
                    metadata?: Record<string, any> | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    file_name?: string
                    file_path?: string
                    file_size?: number
                    file_type?: string
                    total_rows?: number
                    valid_rows?: number
                    invalid_rows?: number
                    status?: 'pending' | 'processing' | 'completed' | 'failed'
                    error_message?: string | null
                    metadata?: Record<string, any> | null
                }
            }
            message_templates: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    content: string
                    variables: string[] | null
                    description: string | null
                    is_active: boolean
                    usage_count: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    content: string
                    variables?: string[] | null
                    description?: string | null
                    is_active?: boolean
                    usage_count?: number
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    content?: string
                    variables?: string[] | null
                    description?: string | null
                    is_active?: boolean
                    usage_count?: number
                }
            }
            campaigns: {
                Row: {
                    id: string
                    user_id: string
                    template_id: string | null
                    name: string
                    description: string | null
                    send_type: 'immediate' | 'scheduled' | 'manual'
                    scheduled_at: string | null
                    target_filter: Record<string, any> | null
                    total_contacts: number
                    messages_sent: number
                    messages_failed: number
                    messages_pending: number
                    status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed'
                    started_at: string | null
                    completed_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    template_id?: string | null
                    name: string
                    description?: string | null
                    send_type: 'immediate' | 'scheduled' | 'manual'
                    scheduled_at?: string | null
                    target_filter?: Record<string, any> | null
                    total_contacts?: number
                    messages_sent?: number
                    messages_failed?: number
                    messages_pending?: number
                    status?: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed'
                }
                Update: {
                    id?: string
                    user_id?: string
                    template_id?: string | null
                    name?: string
                    description?: string | null
                    send_type?: 'immediate' | 'scheduled' | 'manual'
                    scheduled_at?: string | null
                    target_filter?: Record<string, any> | null
                    total_contacts?: number
                    messages_sent?: number
                    messages_failed?: number
                    messages_pending?: number
                    status?: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed'
                }
            }
            messages: {
                Row: {
                    id: string
                    user_id: string
                    campaign_id: string | null
                    contact_id: string
                    template_id: string | null
                    content: string
                    phone: string
                    status: 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
                    provider: string | null
                    provider_message_id: string | null
                    sent_at: string | null
                    delivered_at: string | null
                    read_at: string | null
                    failed_at: string | null
                    error_message: string | null
                    error_code: string | null
                    has_response: boolean
                    response_content: string | null
                    response_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    campaign_id?: string | null
                    contact_id: string
                    template_id?: string | null
                    content: string
                    phone: string
                    status?: 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
                    provider?: string | null
                    provider_message_id?: string | null
                    sent_at?: string | null
                    error_message?: string | null
                    error_code?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    campaign_id?: string | null
                    contact_id?: string
                    template_id?: string | null
                    content?: string
                    phone?: string
                    status?: 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
                    provider?: string | null
                    provider_message_id?: string | null
                    sent_at?: string | null
                    delivered_at?: string | null
                    read_at?: string | null
                    failed_at?: string | null
                    error_message?: string | null
                    error_code?: string | null
                    has_response?: boolean
                    response_content?: string | null
                    response_at?: string | null
                }
            }
            system_logs: {
                Row: {
                    id: string
                    user_id: string | null
                    action_type: string
                    action_category: 'auth' | 'upload' | 'contact' | 'campaign' | 'message' | 'system'
                    description: string
                    metadata: Record<string, any> | null
                    ip_address: string | null
                    user_agent: string | null
                    status: 'success' | 'warning' | 'error'
                    error_details: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    action_type: string
                    action_category: 'auth' | 'upload' | 'contact' | 'campaign' | 'message' | 'system'
                    description: string
                    metadata?: Record<string, any> | null
                    ip_address?: string | null
                    user_agent?: string | null
                    status?: 'success' | 'warning' | 'error'
                    error_details?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    action_type?: string
                    action_category?: 'auth' | 'upload' | 'contact' | 'campaign' | 'message' | 'system'
                    description?: string
                    metadata?: Record<string, any> | null
                    ip_address?: string | null
                    user_agent?: string | null
                    status?: 'success' | 'warning' | 'error'
                    error_details?: string | null
                }
            }
            whatsapp_config: {
                Row: {
                    id: string
                    user_id: string
                    provider: 'twilio' | 'whatsapp-business' | 'other'
                    account_sid: string | null
                    auth_token: string | null
                    phone_number_id: string | null
                    business_account_id: string | null
                    api_key: string | null
                    is_active: boolean
                    is_verified: boolean
                    verified_at: string | null
                    daily_message_limit: number
                    messages_sent_today: number
                    last_reset_at: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    provider: 'twilio' | 'whatsapp-business' | 'other'
                    account_sid?: string | null
                    auth_token?: string | null
                    phone_number_id?: string | null
                    business_account_id?: string | null
                    api_key?: string | null
                    is_active?: boolean
                    is_verified?: boolean
                    daily_message_limit?: number
                    messages_sent_today?: number
                }
                Update: {
                    id?: string
                    user_id?: string
                    provider?: 'twilio' | 'whatsapp-business' | 'other'
                    account_sid?: string | null
                    auth_token?: string | null
                    phone_number_id?: string | null
                    business_account_id?: string | null
                    api_key?: string | null
                    is_active?: boolean
                    is_verified?: boolean
                    verified_at?: string | null
                    daily_message_limit?: number
                    messages_sent_today?: number
                    last_reset_at?: string
                }
            }
        }
        Views: {}
        Functions: {}
    }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type ExcelUpload = Database['public']['Tables']['excel_uploads']['Row']
export type MessageTemplate = Database['public']['Tables']['message_templates']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type SystemLog = Database['public']['Tables']['system_logs']['Row']
export type WhatsAppConfig = Database['public']['Tables']['whatsapp_config']['Row']
