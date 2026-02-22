'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, Button, Alert } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase, type Campaign } from '@/lib/supabase'
import {
    Plus,
    Megaphone,
    Play,
    Pause,
    Clock,
    CheckCircle,
    XCircle,
    MoreVertical,
    Trash2,
    Eye,
    RefreshCw,
    Send,
    Calendar,
    AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

export default function CampaignsPage() {
    const { user, profile } = useAuth()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [retrying, setRetrying] = useState<string | null>(null)
    const [schedulerRunning, setSchedulerRunning] = useState(false)
    const [schedulerMessage, setSchedulerMessage] = useState<string | null>(null)
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

    const loadCampaigns = useCallback(async () => {
        if (!user) return

        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            setCampaigns(data || [])
        } catch (error) {
            console.error('Error loading campaigns:', error)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (user) {
            loadCampaigns()
        }
    }, [user, loadCampaigns])

    // Check for scheduled campaigns periodically
    useEffect(() => {
        const checkScheduled = async () => {
            const scheduled = campaigns.filter(c => c.status === 'scheduled')
            if (scheduled.length === 0) return

            const now = new Date()
            const due = scheduled.filter(c => c.scheduled_at && new Date(c.scheduled_at) <= now)

            if (due.length > 0 && !schedulerRunning) {
                setSchedulerRunning(true)
                try {
                    const response = await fetch('/api/campaigns/scheduler')
                    if (response.ok) {
                        const result = await response.json()
                        if (result.processed > 0) {
                            setSchedulerMessage(`Se ejecutaron ${result.processed} campaña(s) programada(s)`)
                            loadCampaigns()
                            setTimeout(() => setSchedulerMessage(null), 5000)
                        }
                    }
                } catch {
                    console.error('Scheduler check failed')
                } finally {
                    setSchedulerRunning(false)
                }
            }
        }

        // Check every 30 seconds
        const interval = setInterval(checkScheduled, 30000)
        checkScheduled() // Initial check

        return () => clearInterval(interval)
    }, [campaigns, schedulerRunning, loadCampaigns])

    const deleteCampaign = async (campaignId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta campaña?')) return

        try {
            await supabase.from('campaigns').delete().eq('id', campaignId)
            setCampaigns(campaigns.filter(c => c.id !== campaignId))
        } catch (error) {
            console.error('Error deleting campaign:', error)
        }
        setOpenMenuId(null)
    }

    const retryCampaign = async (campaign: Campaign) => {
        if (!user || !campaign.template_id) return

        setRetrying(campaign.id)
        setOpenMenuId(null)

        try {
            // Get template
            const { data: template } = await supabase
                .from('message_templates')
                .select('content')
                .eq('id', campaign.template_id)
                .single()

            if (!template) throw new Error('Plantilla no encontrada')

            // Get failed contacts (those that weren't successfully sent in original campaign)
            const { data: failedMessages } = await supabase
                .from('messages')
                .select('contact_id')
                .in('status', ['failed', 'error'])

            const failedContactIds = (failedMessages as { contact_id: string }[] | null)?.map(m => m.contact_id) || []

            if (failedContactIds.length === 0) {
                alert('No hay mensajes fallidos para reintentar')
                setRetrying(null)
                return
            }

            // Get contact details
            const { data: contacts } = await supabase
                .from('contacts')
                .select('id, full_name, phone, email, city')
                .in('id', failedContactIds)
                .eq('is_blocked', false)

            if (!contacts || contacts.length === 0) {
                alert('No hay contactos disponibles para reintentar')
                setRetrying(null)
                return
            }

            let sent = 0, failed = 0

            for (const contact of contacts as { id: string; full_name: string | null; phone: string; email: string | null; city: string | null }[]) {
                let messageContent = template.content as string
                messageContent = messageContent.replace(/\{\{nombre\}\}/gi, contact.full_name || '')
                messageContent = messageContent.replace(/\{\{telefono\}\}/gi, contact.phone || '')
                messageContent = messageContent.replace(/\{\{email\}\}/gi, contact.email || '')
                messageContent = messageContent.replace(/\{\{ciudad\}\}/gi, contact.city || '')

                const response = await fetch('/api/whatsapp/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        to: contact.phone,
                        message: messageContent,
                    }),
                })

                if (response.ok) sent++
                else failed++

                await new Promise(r => setTimeout(r, 500))
            }

            // Update campaign stats
            await supabase
                .from('campaigns')
                .update({
                    messages_sent: (campaign.messages_sent || 0) + sent,
                    messages_failed: Math.max(0, (campaign.messages_failed || 0) - sent + failed),
                } as Record<string, unknown>)
                .eq('id', campaign.id)

            loadCampaigns()
            alert(`Reintento completado: ${sent} enviados, ${failed} fallidos`)

        } catch (error) {
            console.error('Retry error:', error)
            alert('Error al reintentar la campaña')
        } finally {
            setRetrying(null)
        }
    }

    const cancelScheduledCampaign = async (campaignId: string) => {
        if (!confirm('¿Cancelar esta campaña programada?')) return

        try {
            await supabase
                .from('campaigns')
                .update({ status: 'cancelled' } as Record<string, unknown>)
                .eq('id', campaignId)
            loadCampaigns()
        } catch (error) {
            console.error('Error cancelling campaign:', error)
        }
        setOpenMenuId(null)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="badge badge-success">Completada</span>
            case 'sending':
                return <span className="badge badge-info">Enviando</span>
            case 'scheduled':
                return <span className="badge badge-warning">Programada</span>
            case 'failed':
                return <span className="badge badge-danger">Fallida</span>
            case 'cancelled':
                return <span className="badge badge-danger">Cancelada</span>
            default:
                return <span className="badge">Borrador</span>
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-500" />
            case 'sending':
                return <Play className="h-5 w-5 text-blue-500" />
            case 'scheduled':
                return <Clock className="h-5 w-5 text-yellow-500" />
            case 'failed':
            case 'cancelled':
                return <XCircle className="h-5 w-5 text-red-500" />
            default:
                return <Pause className="h-5 w-5 text-gray-500" />
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const scheduledCount = campaigns.filter(c => c.status === 'scheduled').length

    return (
        <DashboardLayout
            title="Campañas"
            subtitle="Gestiona tus campañas de envío masivo"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="space-y-6">
                {/* Scheduler Message */}
                {schedulerMessage && (
                    <Alert type="success" dismissible onDismiss={() => setSchedulerMessage(null)}>
                        {schedulerMessage}
                    </Alert>
                )}

                {/* Scheduled Campaigns Warning */}
                {scheduledCount > 0 && (
                    <Alert type="warning">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>
                                Tienes {scheduledCount} campaña{scheduledCount > 1 ? 's' : ''} programada{scheduledCount > 1 ? 's' : ''}.
                                <strong> La aplicación debe permanecer abierta</strong> para que se ejecuten automáticamente.
                            </span>
                        </div>
                    </Alert>
                )}

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <p className="text-gray-600">
                            {campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''} creada{campaigns.length !== 1 ? 's' : ''}
                        </p>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadCampaigns}
                            icon={<RefreshCw className="h-4 w-4" />}
                        >
                            Actualizar
                        </Button>
                    </div>
                    <Link href="/campaigns/new">
                        <Button icon={<Plus className="h-4 w-4" />}>
                            Nueva Campaña
                        </Button>
                    </Link>
                </div>

                {/* Campaigns List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-2xl shadow-sm border border-gray-100 mt-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Megaphone className="h-40 w-40 -rotate-12" />
                        </div>
                        <div className="relative z-10">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-red-50 text-red-600 mb-8 transform group-hover:rotate-6 transition-transform">
                                <Megaphone className="h-12 w-12" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-3">Aún no tienes campañas</h3>
                            <p className="text-gray-500 mb-10 max-w-sm mx-auto text-lg">
                                Conecta con cientos de clientes en segundos creando tu primera campaña masiva.
                            </p>
                            <Link href="/campaigns/new">
                                <Button size="lg" icon={<Plus className="h-6 w-6" />} className="px-10 h-14 text-lg">
                                    Lanzar mi Primera Campaña
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {campaigns.map((campaign) => (
                            <Card key={campaign.id} padding={false}>
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-gray-100 rounded-xl">
                                                {getStatusIcon(campaign.status)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                                                    {getStatusBadge(campaign.status)}
                                                    {retrying === campaign.id && (
                                                        <span className="text-sm text-blue-600 flex items-center gap-1">
                                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                                            Reintentando...
                                                        </span>
                                                    )}
                                                </div>
                                                {campaign.description && (
                                                    <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                                                )}
                                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                                                    <span>Creada: {formatDate(campaign.created_at)}</span>
                                                    {campaign.scheduled_at && (
                                                        <span className="flex items-center gap-1 text-yellow-600">
                                                            <Calendar className="h-3 w-3" />
                                                            Programada: {formatDateTime(campaign.scheduled_at)}
                                                        </span>
                                                    )}
                                                    {campaign.completed_at && (
                                                        <span className="text-green-600">
                                                            Completada: {formatDateTime(campaign.completed_at)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === campaign.id ? null : campaign.id)}
                                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                            >
                                                <MoreVertical className="h-5 w-5" />
                                            </button>
                                            {openMenuId === campaign.id && (
                                                <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                                                    <button
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                        onClick={() => {
                                                            setSelectedCampaign(campaign)
                                                            setOpenMenuId(null)
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" /> Ver detalles
                                                    </button>
                                                    {(campaign.messages_failed || 0) > 0 && (
                                                        <button
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                                            onClick={() => retryCampaign(campaign)}
                                                            disabled={retrying === campaign.id}
                                                        >
                                                            <Send className="h-4 w-4" /> Reintentar fallidos
                                                        </button>
                                                    )}
                                                    {campaign.status === 'scheduled' && (
                                                        <button
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
                                                            onClick={() => cancelScheduledCampaign(campaign.id)}
                                                        >
                                                            <XCircle className="h-4 w-4" /> Cancelar programación
                                                        </button>
                                                    )}
                                                    <button
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                                        onClick={() => deleteCampaign(campaign.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" /> Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-gray-900">{campaign.total_contacts || 0}</p>
                                            <p className="text-sm text-gray-500">Contactos</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-600">{campaign.messages_sent || 0}</p>
                                            <p className="text-sm text-gray-500">Enviados</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-red-600">{campaign.messages_failed || 0}</p>
                                            <p className="text-sm text-gray-500">Fallidos</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-blue-600">
                                                {(campaign.total_contacts || 0) > 0
                                                    ? Math.round(((campaign.messages_sent || 0) / (campaign.total_contacts || 1)) * 100)
                                                    : 0}%
                                            </p>
                                            <p className="text-sm text-gray-500">Éxito</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Campaign Details Modal */}
                {selectedCampaign && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <Card className="max-w-lg w-full max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Detalles de Campaña</h2>
                                <button
                                    onClick={() => setSelectedCampaign(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Nombre</label>
                                    <p className="text-gray-900">{selectedCampaign.name}</p>
                                </div>

                                {selectedCampaign.description && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Descripción</label>
                                        <p className="text-gray-900">{selectedCampaign.description}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Estado</label>
                                        <div className="mt-1">{getStatusBadge(selectedCampaign.status)}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Tipo de Envío</label>
                                        <p className="text-gray-900 capitalize">{selectedCampaign.send_type}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Creada</label>
                                        <p className="text-gray-900">{formatDateTime(selectedCampaign.created_at)}</p>
                                    </div>
                                    {selectedCampaign.completed_at && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Completada</label>
                                            <p className="text-gray-900">{formatDateTime(selectedCampaign.completed_at)}</p>
                                        </div>
                                    )}
                                </div>

                                {selectedCampaign.scheduled_at && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Programada para</label>
                                        <p className="text-gray-900">{formatDateTime(selectedCampaign.scheduled_at)}</p>
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <label className="text-sm font-medium text-gray-500 mb-3 block">Estadísticas</label>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xl font-bold text-gray-900">{selectedCampaign.total_contacts || 0}</p>
                                            <p className="text-xs text-gray-500">Total</p>
                                        </div>
                                        <div className="text-center p-3 bg-green-50 rounded-lg">
                                            <p className="text-xl font-bold text-green-600">{selectedCampaign.messages_sent || 0}</p>
                                            <p className="text-xs text-gray-500">Enviados</p>
                                        </div>
                                        <div className="text-center p-3 bg-red-50 rounded-lg">
                                            <p className="text-xl font-bold text-red-600">{selectedCampaign.messages_failed || 0}</p>
                                            <p className="text-xs text-gray-500">Fallidos</p>
                                        </div>
                                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                                            <p className="text-xl font-bold text-blue-600">{selectedCampaign.messages_pending || 0}</p>
                                            <p className="text-xs text-gray-500">Pendientes</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                                {(selectedCampaign.messages_failed || 0) > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            retryCampaign(selectedCampaign)
                                            setSelectedCampaign(null)
                                        }}
                                        icon={<Send className="h-4 w-4" />}
                                    >
                                        Reintentar Fallidos
                                    </Button>
                                )}
                                <Button onClick={() => setSelectedCampaign(null)}>
                                    Cerrar
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
