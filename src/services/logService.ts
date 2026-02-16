import { supabase } from '@/lib/supabase/client'

export interface LogEntry {
    userId: string | null
    actionType: string
    actionCategory: 'auth' | 'upload' | 'contact' | 'campaign' | 'message' | 'system'
    description: string
    metadata?: Record<string, any>
    status?: 'success' | 'warning' | 'error'
    errorDetails?: string
}

export const logService = {
    async log(entry: LogEntry) {
        try {
            await supabase.from('system_logs').insert({
                user_id: entry.userId,
                action_type: entry.actionType,
                action_category: entry.actionCategory,
                description: entry.description,
                metadata: entry.metadata,
                status: entry.status || 'success',
                error_details: entry.errorDetails,
            })
        } catch (error) {
            console.error('Error logging action:', error)
        }
    },

    async getLogs(userId: string, options?: {
        limit?: number
        category?: string
    }) {
        try {
            let query = supabase
                .from('system_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

            if (options?.category) {
                query = query.eq('action_category', options.category)
            }

            if (options?.limit) {
                query = query.limit(options.limit)
            }

            const { data, error } = await query

            if (error) throw error

            return { data, error: null }
        } catch (error: any) {
            return { data: null, error: error.message }
        }
    },
}
