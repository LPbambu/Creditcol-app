'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardTitle, CardContent } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase, type SystemLog } from '@/lib/supabase'
import {
    Activity,
    Filter,
    CheckCircle,
    AlertCircle,
    AlertTriangle,
    Clock,
    User,
    Upload,
    Users,
    Megaphone,
    MessageSquare,
    Settings
} from 'lucide-react'

export default function LogsPage() {
    const { user, profile } = useAuth()
    const [logs, setLogs] = useState<SystemLog[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')

    useEffect(() => {
        if (user) {
            loadLogs()
        }
    }, [user, filter])

    const loadLogs = async () => {
        if (!user) return

        setLoading(true)
        try {
            let query = supabase
                .from('system_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)

            if (filter !== 'all') {
                query = query.eq('action_category', filter)
            }

            const { data, error } = await query

            if (error) throw error

            setLogs(data || [])
        } catch (error) {
            console.error('Error loading logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'auth':
                return <User className="h-4 w-4" />
            case 'upload':
                return <Upload className="h-4 w-4" />
            case 'contact':
                return <Users className="h-4 w-4" />
            case 'campaign':
                return <Megaphone className="h-4 w-4" />
            case 'message':
                return <MessageSquare className="h-4 w-4" />
            case 'system':
                return <Settings className="h-4 w-4" />
            default:
                return <Activity className="h-4 w-4" />
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />
            default:
                return <Activity className="h-4 w-4 text-gray-500" />
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const categories = [
        { value: 'all', label: 'Todos' },
        { value: 'auth', label: 'Autenticación' },
        { value: 'upload', label: 'Cargas' },
        { value: 'contact', label: 'Contactos' },
        { value: 'campaign', label: 'Campañas' },
        { value: 'message', label: 'Mensajes' },
    ]

    return (
        <DashboardLayout
            title="Registro de Actividad"
            subtitle="Historial de acciones en el sistema"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="space-y-6">
                {/* Filter */}
                <Card padding={false}>
                    <div className="px-4 py-3 flex items-center gap-4">
                        <Filter className="h-5 w-5 text-gray-500" />
                        <div className="flex gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.value}
                                    onClick={() => setFilter(cat.value)}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === cat.value
                                            ? 'bg-primary-100 text-primary-700 font-medium'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Logs List */}
                <Card padding={false}>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Sin actividad</h3>
                            <p className="text-gray-500">No hay registros de actividad para mostrar</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {logs.map((log) => (
                                <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${log.status === 'success' ? 'bg-green-100' :
                                                log.status === 'error' ? 'bg-red-100' :
                                                    log.status === 'warning' ? 'bg-yellow-100' : 'bg-gray-100'
                                            }`}>
                                            {getStatusIcon(log.status)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">{log.action_type}</span>
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                                    {log.action_category}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 mt-1">{log.description}</p>
                                            {log.error_details && (
                                                <p className="text-sm text-red-600 mt-1">{log.error_details}</p>
                                            )}
                                        </div>
                                        <div className="text-right text-sm text-gray-500">
                                            {formatDate(log.created_at)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    )
}
