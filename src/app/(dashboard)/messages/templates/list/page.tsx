'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardTitle, CardContent, Button, Alert } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
    MessageSquare,
    Plus,
    Edit2,
    Trash2,
    Copy,
    CheckCircle,
    Clock,
    AlertCircle,
    ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface Template {
    id: string
    name: string
    content: string
    description: string | null
    variables: string[]
    is_active: boolean
    is_whatsapp_approved: boolean
    whatsapp_template_id: string | null
    created_at: string
}

export default function TemplatesListPage() {
    const { user, profile } = useAuth()
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

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
                .order('created_at', { ascending: false })

            if (error) throw error
            setTemplates((data as Template[]) || [])
        } catch (error) {
            console.error('Error loading templates:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteTemplate = async (templateId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return

        setError(null)
        try {
            const { error } = await supabase.from('message_templates').delete().eq('id', templateId)

            if (error) {
                if (error.code === '23503') {
                    throw new Error('No se puede eliminar la plantilla porque está siendo usada en una o más campañas.')
                }
                throw error
            }

            setTemplates(templates.filter(t => t.id !== templateId))
            setSuccess('Plantilla eliminada correctamente')
            setTimeout(() => setSuccess(null), 3000)
        } catch (error: any) {
            console.error('Error deleting template:', error)
            setError(error.message || 'Error al eliminar la plantilla')
        }
    }

    const toggleActive = async (template: Template) => {
        try {
            const { error } = await supabase
                .from('message_templates')
                .update({ is_active: !template.is_active } as Record<string, unknown>)
                .eq('id', template.id)

            if (error) throw error

            setTemplates(templates.map(t =>
                t.id === template.id ? { ...t, is_active: !t.is_active } : t
            ))
        } catch (error) {
            console.error('Error updating template:', error)
            setError('Error al actualizar el estado')
        }
    }

    const copyToClipboard = async (text: string, id: string) => {
        try {
            // Fallback for non-https or unsupported browsers
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text)
            } else {
                const textArea = document.createElement("textarea")
                textArea.value = text
                textArea.style.position = "fixed"
                textArea.style.left = "-999999px"
                textArea.style.top = "-999999px"
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()
                document.execCommand('copy')
                textArea.remove()
            }

            setCopied(id)
            setTimeout(() => setCopied(null), 2000)
        } catch (err) {
            console.error('Failed to copy text: ', err)
            setError('No se pudo copiar al portapapeles')
        }
    }

    const getApprovalBadge = (template: Template) => {
        if (template.is_whatsapp_approved) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    Aprobado por Meta
                </span>
            )
        }
        if (template.whatsapp_template_id) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    <Clock className="h-3 w-3" />
                    Pendiente de aprobación
                </span>
            )
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                <AlertCircle className="h-3 w-3" />
                Solo para Sandbox
            </span>
        )
    }

    return (
        <DashboardLayout
            title="Plantillas de Mensaje"
            subtitle="Gestiona tus plantillas para WhatsApp"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="space-y-6">
                {error && (
                    <Alert type="error" dismissible onDismiss={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert type="success" dismissible onDismiss={() => setSuccess(null)}>
                        {success}
                    </Alert>
                )}

                {/* Info Banner */}
                <Alert type="info">
                    <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium">¿Cómo funcionan las plantillas?</p>
                            <p className="text-sm mt-1">
                                Para enviar mensajes masivos con la API de WhatsApp Business, necesitas usar plantillas aprobadas por Meta.
                                Puedes crear plantillas aquí y luego registrarlas en tu cuenta de Meta Business para obtener aprobación.
                            </p>
                            <a
                                href="https://business.facebook.com/wa/manage/message-templates/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                            >
                                Gestionar plantillas en Meta Business
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                </Alert>

                {/* Header */}
                <div className="flex justify-between items-center">
                    <p className="text-gray-600">
                        {templates.length} plantilla{templates.length !== 1 ? 's' : ''} creada{templates.length !== 1 ? 's' : ''}
                    </p>
                    <Link href="/messages/templates">
                        <Button icon={<Plus className="h-4 w-4" />}>
                            Nueva Plantilla
                        </Button>
                    </Link>
                </div>

                {/* Templates List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : templates.length === 0 ? (
                    <Card className="text-center py-16">
                        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                            <MessageSquare className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes plantillas</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Crea plantillas personalizadas para agilizar tus envíos masivos y mantener consistencia en tus mensajes.
                        </p>
                        <Link href="/messages/templates">
                            <Button icon={<Plus className="h-4 w-4" />}>
                                Crear Primera Plantilla
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {templates.map((template) => (
                            <Card key={template.id} className={!template.is_active ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {getApprovalBadge(template)}
                                            {!template.is_active && (
                                                <span className="text-xs text-gray-500">(Inactiva)</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => copyToClipboard(template.content, template.id)}
                                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100"
                                            title="Copiar contenido"
                                        >
                                            {copied === template.id ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </button>
                                        <Link href={`/messages/templates?id=${template.id}`}>
                                            <button
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                title="Editar plantilla"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                        </Link>
                                        <button
                                            onClick={() => deleteTemplate(template.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                            title="Eliminar plantilla"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {template.description && (
                                    <p className="text-sm text-gray-500 mb-3">{template.description}</p>
                                )}

                                {/* Preview */}
                                <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4 font-mono">
                                        {template.content}
                                    </p>
                                </div>

                                {/* Variables */}
                                {template.variables && template.variables.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {template.variables.map((v, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100"
                                            >
                                                {`{{${v}}}`}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <span className="text-xs text-gray-400">
                                        Creada el {new Date(template.created_at).toLocaleDateString('es-CO')}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleActive(template)}
                                            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${template.is_active
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {template.is_active ? 'Activa' : 'Inactiva'}
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* WhatsApp Business API Info */}
                <Card className="mt-8">
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-blue-500" />
                        Información sobre Templates de WhatsApp Business
                    </CardTitle>
                    <CardContent className="mt-4 text-sm text-gray-600 space-y-3">
                        <p>
                            <strong>Formato de Variables:</strong> WhatsApp Business API usa el formato <code className="bg-gray-100 px-1 rounded">{`{{1}}`}</code>, <code className="bg-gray-100 px-1 rounded">{`{{2}}`}</code>, etc.
                            Nuestro sistema usa <code className="bg-gray-100 px-1 rounded">{`{{nombre}}`}</code>, <code className="bg-gray-100 px-1 rounded">{`{{telefono}}`}</code> para mayor claridad.
                        </p>
                        <p>
                            <strong>Proceso de Aprobación:</strong> Para usar templates en producción, debes registrarlos en Meta Business Suite.
                            Meta puede tardar entre 24h y varios días en aprobar una plantilla.
                        </p>
                        <p>
                            <strong>Categorías de Templates:</strong> Los templates se clasifican en Marketing, Utilidad y Autenticación.
                            Los de Marketing tienen costos más altos por mensaje.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
