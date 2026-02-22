'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardTitle, CardContent, Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
    Users,
    Megaphone,
    MessageSquare,
    TrendingUp,
    FileSpreadsheet,
    Clock,
    CheckCircle,
    AlertCircle,
    Download,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    MessageCircle,
    UserX
} from 'lucide-react'

interface Stats {
    totalContacts: number
    totalCampaigns: number
    messagesSent: number
    messagesReceived: number
    blockedContacts: number
    responseRate: number
}

interface WeeklyData {
    day: string
    sent: number
    received: number
}

interface RecentActivity {
    id: string
    action_type: string
    description: string
    created_at: string
    status: 'success' | 'warning' | 'error'
}

interface RecentConversation {
    contact_id: string
    contact_name: string
    last_message: string
    last_time: string
    is_incoming: boolean
}

export default function DashboardPage() {
    const { user, profile } = useAuth()
    const [stats, setStats] = useState<Stats>({
        totalContacts: 0,
        totalCampaigns: 0,
        messagesSent: 0,
        messagesReceived: 0,
        blockedContacts: 0,
        responseRate: 0,
    })
    const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
    const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState<string | null>(null)

    const loadStats = useCallback(async () => {
        if (!user) return

        try {
            const [contacts, campaigns, messagesSent, messagesReceived, blocked] = await Promise.all([
                supabase
                    .from('contacts')
                    .select('*', { count: 'exact', head: true }),
                supabase
                    .from('campaigns')
                    .select('*', { count: 'exact', head: true }),
                supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['sent', 'delivered', 'read']),
                supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'received'),
                supabase
                    .from('contacts')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_blocked', true),
            ])

            const sent = messagesSent.count || 0
            const received = messagesReceived.count || 0
            const responseRate = sent > 0 ? Math.round((received / sent) * 100) : 0

            setStats({
                totalContacts: contacts.count || 0,
                totalCampaigns: campaigns.count || 0,
                messagesSent: sent,
                messagesReceived: received,
                blockedContacts: blocked.count || 0,
                responseRate,
            })
        } catch (error) {
            console.error('Error loading stats:', error)
        } finally {
            setLoading(false)
        }
    }, [user])

    const loadWeeklyData = useCallback(async () => {
        if (!user) return

        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        const data: WeeklyData[] = []

        for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString()
            const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString()

            const [sentRes, receivedRes] = await Promise.all([
                supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['sent', 'delivered', 'read'])
                    .gte('sent_at', startOfDay)
                    .lte('sent_at', endOfDay),
                supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'received')
                    .gte('sent_at', startOfDay)
                    .lte('sent_at', endOfDay),
            ])

            data.push({
                day: days[new Date(date).getDay()],
                sent: sentRes.count || 0,
                received: receivedRes.count || 0,
            })
        }

        setWeeklyData(data)
    }, [user])

    const loadRecentActivity = useCallback(async () => {
        if (!user) return

        try {
            const { data } = await supabase
                .from('system_logs')
                .select('id, action_type, description, created_at, status')
                .order('created_at', { ascending: false })
                .limit(5)

            if (data) {
                setRecentActivity(data as RecentActivity[])
            }
        } catch (error) {
            console.error('Error loading activity:', error)
        }
    }, [user])

    const loadRecentConversations = useCallback(async () => {
        if (!user) return

        try {
            const { data } = await supabase
                .from('messages')
                .select(`
                    id,
                    content,
                    status,
                    sent_at,
                    contact_id,
                    contacts!inner(full_name)
                `)
                .order('sent_at', { ascending: false })
                .limit(5)

            if (data) {
                const conversations: RecentConversation[] = data.map((m: any) => ({
                    contact_id: m.contact_id,
                    contact_name: m.contacts?.full_name || 'Desconocido',
                    last_message: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''),
                    last_time: m.sent_at,
                    is_incoming: m.status === 'received',
                }))
                setRecentConversations(conversations)
            }
        } catch (error) {
            console.error('Error loading conversations:', error)
        }
    }, [user])

    useEffect(() => {
        if (user) {
            loadStats()
            loadWeeklyData()
            loadRecentActivity()
            loadRecentConversations()
        }
    }, [user, loadStats, loadWeeklyData, loadRecentActivity, loadRecentConversations])

    const handleExport = async (type: string) => {
        if (!user) return
        setExporting(type)

        try {
            const response = await fetch(`/api/export?type=${type}&userId=${user.id}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            } else {
                const error = await response.json()
                alert('Error al exportar: ' + (error.error || 'Error desconocido'))
            }
        } catch (error) {
            console.error('Export error:', error)
            alert('Error al exportar')
        } finally {
            setExporting(null)
        }
    }

    const statCards = [
        {
            title: 'Total Contactos',
            value: stats.totalContacts,
            icon: <Users className="h-6 w-6" />,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
        },
        {
            title: 'Campañas Creadas',
            value: stats.totalCampaigns,
            icon: <Megaphone className="h-6 w-6" />,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
        },
        {
            title: 'Mensajes Enviados',
            value: stats.messagesSent,
            icon: <MessageSquare className="h-6 w-6" />,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
        },
        {
            title: 'Tasa de Respuesta',
            value: `${stats.responseRate}%`,
            icon: <TrendingUp className="h-6 w-6" />,
            color: 'text-primary-600',
            bgColor: 'bg-primary-100',
            trend: stats.responseRate > 20 ? 'up' : 'down',
        },
    ]

    const getActivityIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />
            default:
                return <Clock className="h-4 w-4 text-yellow-500" />
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)

        if (diffMins < 60) return `hace ${diffMins}m`
        if (diffHours < 24) return `hace ${diffHours}h`
        return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    }

    const maxBarValue = Math.max(...weeklyData.map(d => d.sent + d.received), 1)

    return (
        <DashboardLayout
            title="Dashboard"
            subtitle="Bienvenido a CREDITCOL"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="space-y-8">
                {/* Welcome Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-blue-900 shadow-xl">
                    <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                    <div className="relative p-8 text-white">
                        <h2 className="text-3xl font-bold mb-2">¡Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}! 👋</h2>
                        <p className="text-blue-100 max-w-xl text-lg">
                            Tu sistema de automatización está listo. Hoy es un buen día para conectar con tus clientes.
                        </p>
                        <div className="mt-6 flex gap-4">
                            <a href="/contacts/import" className="px-5 py-2.5 bg-white text-red-600 font-semibold rounded-lg shadow-lg hover:bg-gray-50 transition-colors">
                                Importar Contactos
                            </a>
                            <a href="/campaigns/new" className="px-5 py-2.5 bg-blue-800/50 text-white font-semibold rounded-lg backdrop-blur-sm hover:bg-blue-800/70 transition-colors border border-blue-400/30">
                                Crear Campaña
                            </a>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => (
                        <Card key={index} hover className="overflow-hidden border-t-4 border-t-transparent hover:border-t-red-500 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{stat.title}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <p className="text-3xl font-bold text-gray-900">
                                            {loading ? '...' : stat.value}
                                        </p>
                                        {stat.trend && (
                                            stat.trend === 'up' ? (
                                                <ArrowUpRight className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <ArrowDownRight className="h-5 w-5 text-red-500" />
                                            )
                                        )}
                                    </div>
                                </div>
                                <div className={`p-4 rounded-2xl ${stat.bgColor} shadow-inner`}>
                                    <div className={stat.color}>{stat.icon}</div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Weekly Activity Chart */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-gray-400" />
                                Actividad Semanal
                            </CardTitle>
                        </div>
                        <CardContent>
                            <div className="h-48 flex items-end justify-between gap-2">
                                {weeklyData.map((day, index) => (
                                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full flex flex-col gap-0.5" style={{ height: '140px' }}>
                                            {/* Received bar */}
                                            <div
                                                className="w-full bg-green-400 rounded-t transition-all duration-500"
                                                style={{ height: `${(day.received / maxBarValue) * 100}%` }}
                                                title={`Recibidos: ${day.received}`}
                                            />
                                            {/* Sent bar */}
                                            <div
                                                className="w-full bg-primary-500 rounded-b transition-all duration-500"
                                                style={{ height: `${(day.sent / maxBarValue) * 100}%` }}
                                                title={`Enviados: ${day.sent}`}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500">{day.day}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-primary-500" />
                                    <span className="text-gray-600">Enviados</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-green-400" />
                                    <span className="text-gray-600">Recibidos</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Extra Stats */}
                    <Card>
                        <CardTitle>Estadísticas Adicionales</CardTitle>
                        <CardContent className="mt-4 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <MessageCircle className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Mensajes Recibidos</p>
                                        <p className="text-sm text-gray-500">Respuestas de clientes</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-gray-900">{stats.messagesReceived}</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <UserX className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Dados de Baja</p>
                                        <p className="text-sm text-gray-500">Contactos bloqueados</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-gray-900">{stats.blockedContacts}</span>
                            </div>

                            {/* Export Buttons */}
                            <div className="pt-4 border-t">
                                <p className="text-sm font-medium text-gray-700 mb-3">Exportar Reportes</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleExport('contacts')}
                                        loading={exporting === 'contacts'}
                                        icon={<Download className="h-4 w-4" />}
                                    >
                                        Contactos
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleExport('campaigns')}
                                        loading={exporting === 'campaigns'}
                                        icon={<Download className="h-4 w-4" />}
                                    >
                                        Campañas
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleExport('messages')}
                                        loading={exporting === 'messages'}
                                        icon={<Download className="h-4 w-4" />}
                                    >
                                        Mensajes
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleExport('logs')}
                                        loading={exporting === 'logs'}
                                        icon={<Download className="h-4 w-4" />}
                                    >
                                        Actividad
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quick Actions */}
                    <Card>
                        <CardTitle>Acciones Rápidas</CardTitle>
                        <CardContent className="mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <a
                                    href="/contacts/import"
                                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                                >
                                    <div className="p-2 bg-primary-100 rounded-lg">
                                        <FileSpreadsheet className="h-5 w-5 text-primary-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Importar Excel</p>
                                        <p className="text-sm text-gray-500">Cargar contactos</p>
                                    </div>
                                </a>

                                <a
                                    href="/campaigns/new"
                                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                                >
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Megaphone className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Nueva Campaña</p>
                                        <p className="text-sm text-gray-500">Envío masivo</p>
                                    </div>
                                </a>

                                <a
                                    href="/chats"
                                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                                >
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <MessageSquare className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Chats</p>
                                        <p className="text-sm text-gray-500">Ver mensajes</p>
                                    </div>
                                </a>

                                <a
                                    href="/contacts"
                                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                >
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Users className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Contactos</p>
                                        <p className="text-sm text-gray-500">Ver listado</p>
                                    </div>
                                </a>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card>
                        <CardTitle>Actividad Reciente</CardTitle>
                        <CardContent className="mt-4">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>Sin actividad reciente</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {recentActivity.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50"
                                        >
                                            {getActivityIcon(activity.status)}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 truncate">
                                                    {activity.description}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {formatDate(activity.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Conversations */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <CardTitle>Conversaciones Recientes</CardTitle>
                        <a href="/chats" className="text-sm text-primary-600 hover:underline">Ver todas →</a>
                    </div>
                    <CardContent>
                        {recentConversations.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No hay conversaciones recientes</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {recentConversations.map((conv, index) => (
                                    <a
                                        key={index}
                                        href="/chats"
                                        className="flex items-center gap-4 py-3 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold">
                                            {conv.contact_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900">{conv.contact_name}</p>
                                                {conv.is_incoming && (
                                                    <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                                        Nuevo
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
                                        </div>
                                        <span className="text-xs text-gray-400">{formatTime(conv.last_time)}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
