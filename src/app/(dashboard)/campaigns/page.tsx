'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase, type Campaign } from '@/lib/supabase'
import {
    Plus,
    Megaphone,
    Play,
    CheckCircle,
    XCircle,
    MoreVertical,
    Trash2,
    Eye,
    RefreshCw,
    Send
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CampaignsPage() {
    const { user, profile } = useAuth()
    const router = useRouter()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

    const loadCampaigns = useCallback(async () => {
        if (!user) return

        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('send_type', 'manual') // ONLY MANUAL CAMPAIGNS NOW
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


    const markCampaignCompleted = async (campaignId: string) => {
        if (!confirm('¿Estás seguro de marcar esta campaña como Finalizada?')) return

        try {
            const completedDate = new Date().toISOString()
            await supabase.from('campaigns').update({ status: 'completed', completed_at: completedDate }).eq('id', campaignId)
            setCampaigns(campaigns.map(c => c.id === campaignId ? { ...c, status: 'completed', completed_at: completedDate } : c))
        } catch (error) {
            console.error('Error completing campaign:', error)
        }
        setOpenMenuId(null)
    }

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

    const continueCampaign = (campaignId: string) => {
        router.push(`/send?campaignId=${campaignId}`)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="badge badge-success">Completada</span>
            case 'sending':
                return <span className="badge badge-info">En Progreso</span>
            case 'failed':
            case 'cancelled':
                return <span className="badge badge-danger">Incompleta / Cancelada</span>
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
            case 'failed':
            case 'cancelled':
                return <XCircle className="h-5 w-5 text-red-500" />
            default:
                return <Play className="h-5 w-5 text-gray-500" />
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

    return (
        <DashboardLayout
            title="Campañas"
            subtitle="Gestiona tus campañas de envío manual"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <p className="text-gray-600">
                            {campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''} encontrada{campaigns.length !== 1 ? 's' : ''}
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
                    <Link href="/send">
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
                                Centraliza aquí todos los envíos manuales de tu equipo.
                            </p>
                            <Link href="/send">
                                <Button size="lg" icon={<Plus className="h-6 w-6" />} className="px-10 h-14 text-lg">
                                    Iniciar mi Primera Campaña
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
                                                </div>
                                                {campaign.description && (
                                                    <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                                                )}
                                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                                                    <span>Creada: {formatDate(campaign.created_at)}</span>
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
                                                    
                                                    {campaign.status !== 'completed' && (
                                                        <>
                                                            <button
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                                                                onClick={() => markCampaignCompleted(campaign.id)}
                                                            >
                                                                <CheckCircle className="h-4 w-4" /> Finalizar campaña
                                                            </button>
                                                            <button
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                                                onClick={() => continueCampaign(campaign.id)}
                                                            >
                                                                <Send className="h-4 w-4" /> Continuar envío
                                                            </button>
                                                        </>
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
                                            <p className="text-2xl font-bold text-gray-400">{campaign.messages_failed || 0}</p>
                                            <p className="text-sm text-gray-500">Omitidos</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-blue-600">
                                                {(campaign.total_contacts || 0) > 0
                                                    ? Math.round((((campaign.messages_sent || 0) + (campaign.messages_failed || 0)) / (campaign.total_contacts || 1)) * 100)
                                                    : 0}%
                                            </p>
                                            <p className="text-sm text-gray-500">Progreso</p>
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
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xl font-bold text-gray-600">{selectedCampaign.messages_failed || 0}</p>
                                            <p className="text-xs text-gray-500">Omitidos</p>
                                        </div>
                                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                                            <p className="text-xl font-bold text-blue-600">{selectedCampaign.messages_pending || 0}</p>
                                            <p className="text-xs text-gray-500">Pendientes</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                                {selectedCampaign.status !== 'completed' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => continueCampaign(selectedCampaign.id)}
                                        icon={<Send className="h-4 w-4" />}
                                    >
                                        Continuar Envío
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
