import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface ContactExport {
    full_name: string | null
    phone: string
    email: string | null
    city: string | null
    is_active: boolean
    is_blocked: boolean
    created_at: string
}

interface CampaignExport {
    name: string
    status: string
    total_contacts: number | null
    messages_sent: number | null
    messages_failed: number | null
    created_at: string
    completed_at: string | null
}

interface LogExport {
    action_type: string
    action_category: string
    description: string
    status: string
    created_at: string
}

export async function GET(request: NextRequest) {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'contacts'
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    try {
        let data: Record<string, unknown>[] = []
        let filename = 'export.csv'

        if (type === 'contacts') {
            const { data: contacts, error } = await supabase
                .from('contacts')
                .select('full_name, phone, email, city, is_active, is_blocked, created_at')
                .order('full_name')

            if (error) throw error

            data = ((contacts as ContactExport[]) || []).map((c) => ({
                'Nombre': c.full_name || '',
                'Teléfono': c.phone,
                'Email': c.email || '',
                'Ciudad': c.city || '',
                'Activo': c.is_active ? 'Sí' : 'No',
                'Bloqueado': c.is_blocked ? 'Sí' : 'No',
                'Fecha Registro': new Date(c.created_at).toLocaleDateString('es-CO')
            }))
            filename = `contactos_${new Date().toISOString().split('T')[0]}.csv`

        } else if (type === 'campaigns') {
            const { data: campaigns, error } = await supabase
                .from('campaigns')
                .select('name, status, total_contacts, messages_sent, messages_failed, created_at, completed_at')
                .order('created_at', { ascending: false })

            if (error) throw error

            data = ((campaigns as CampaignExport[]) || []).map((c) => ({
                'Nombre': c.name,
                'Estado': c.status,
                'Total Contactos': c.total_contacts || 0,
                'Enviados': c.messages_sent || 0,
                'Fallidos': c.messages_failed || 0,
                'Fecha Creación': new Date(c.created_at).toLocaleDateString('es-CO'),
                'Fecha Completado': c.completed_at ? new Date(c.completed_at).toLocaleDateString('es-CO') : '-'
            }))
            filename = `campanas_${new Date().toISOString().split('T')[0]}.csv`

        } else if (type === 'messages') {
            const { data: messages, error } = await supabase
                .from('messages')
                .select(`
                    content,
                    phone,
                    status,
                    sent_at,
                    has_response,
                    response_content,
                    contacts!inner(full_name)
                `)
                .order('sent_at', { ascending: false })
                .limit(1000)

            if (error) throw error

            data = (messages || []).map((m: any) => ({
                'Contacto': Array.isArray(m.contacts) ? m.contacts[0]?.full_name : m.contacts?.full_name || 'Desconocido',
                'Teléfono': m.phone,
                'Mensaje': m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
                'Estado': m.status,
                'Fecha': m.sent_at ? new Date(m.sent_at).toLocaleString('es-CO') : '-',
                'Tiene Respuesta': m.has_response ? 'Sí' : 'No',
                'Respuesta': m.response_content ? m.response_content.substring(0, 50) : '-'
            }))
            filename = `mensajes_${new Date().toISOString().split('T')[0]}.csv`

        } else if (type === 'logs') {
            const { data: logs, error } = await supabase
                .from('system_logs')
                .select('action_type, action_category, description, status, created_at')
                .order('created_at', { ascending: false })
                .limit(500)

            if (error) throw error

            data = ((logs as LogExport[]) || []).map((l) => ({
                'Tipo': l.action_type,
                'Categoría': l.action_category,
                'Descripción': l.description,
                'Estado': l.status,
                'Fecha': new Date(l.created_at).toLocaleString('es-CO')
            }))
            filename = `actividad_${new Date().toISOString().split('T')[0]}.csv`
        }

        if (data.length === 0) {
            return NextResponse.json({ error: 'No data to export' }, { status: 404 })
        }

        // Convert to CSV
        const headers = Object.keys(data[0])
        const csvRows = [
            headers.join(','), // Header row
            ...data.map(row =>
                headers.map(h => {
                    let val = (row as Record<string, unknown>)[h]
                    // Escape quotes and wrap in quotes if contains comma
                    if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                        val = `"${val.replace(/"/g, '""')}"`
                    }
                    return val
                }).join(',')
            )
        ]
        const csv = csvRows.join('\n')

        // Return as downloadable file
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })

    } catch (error: unknown) {
        console.error('Export error:', error)
        const message = error instanceof Error ? error.message : 'Export failed'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
