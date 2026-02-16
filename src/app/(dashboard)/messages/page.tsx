'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardTitle, CardContent, Button, Alert } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase, type MessageTemplate } from '@/lib/supabase'
import {
    Plus,
    Edit,
    Trash2,
    Copy,
    MessageSquare,
    FileText
} from 'lucide-react'

export default function MessagesPage() {
    const { user, profile } = useAuth()
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            loadTemplates()
        }
    }, [user])

    const loadTemplates = async () => {
        if (!user) return

        try {
            const { data, error } = await supabase
                .from('message_templates')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            setTemplates(data || [])
        } catch (error) {
            console.error('Error loading templates:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (templateId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return

        try {
            const { error } = await supabase
                .from('message_templates')
                .delete()
                .eq('id', templateId)

            if (error) throw error

            loadTemplates()
        } catch (error) {
            console.error('Error deleting template:', error)
        }
    }

    return (
        <DashboardLayout
            title="Mensajes"
            subtitle="Gestiona tus plantillas de mensajes"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-gray-600">
                            {templates.length} plantilla{templates.length !== 1 ? 's' : ''} creada{templates.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <a href="/messages/templates">
                        <Button icon={<Plus className="h-4 w-4" />}>
                            Nueva Plantilla
                        </Button>
                    </a>
                </div>

                {/* Templates Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-2xl shadow-sm border border-gray-100 mt-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <MessageSquare className="h-40 w-40 -rotate-12" />
                        </div>
                        <div className="relative z-10">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-blue-50 text-blue-600 mb-8 transform group-hover:-rotate-6 transition-transform">
                                <MessageSquare className="h-12 w-12" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-3">No hay plantillas aún</h3>
                            <p className="text-gray-500 mb-10 max-w-sm mx-auto text-lg text-pretty">
                                Define tus mensajes predeterminados para enviarlos rápidamente a tus contactos.
                            </p>
                            <a href="/messages/templates">
                                <Button size="lg" icon={<Plus className="h-6 w-6" />} className="px-10 h-14 text-lg">
                                    Crear mi Primera Plantilla
                                </Button>
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((template) => (
                            <Card key={template.id} hover className="flex flex-col">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-primary-100 rounded-lg">
                                            <FileText className="h-5 w-5 text-primary-600" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                    </div>
                                    {template.is_active ? (
                                        <span className="badge badge-success">Activo</span>
                                    ) : (
                                        <span className="badge badge-warning">Inactivo</span>
                                    )}
                                </div>

                                <p className="text-gray-600 text-sm flex-1 mb-4 line-clamp-3">
                                    {template.content}
                                </p>

                                {template.variables && template.variables.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {template.variables.map((variable) => (
                                            <span
                                                key={variable}
                                                className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                                            >
                                                {`{{${variable}}}`}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">
                                        Usado {template.usage_count} veces
                                    </span>
                                    <div className="flex gap-1">
                                        <button
                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Duplicar"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                        <button
                                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
