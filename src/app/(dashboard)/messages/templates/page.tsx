'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardTitle, CardContent, Button, Input, Alert } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
    Save,
    Eye,
    Plus,
    X,
    MessageSquare,
    ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

const AVAILABLE_VARIABLES = [
    { key: 'nombre', label: 'Nombre del contacto', example: 'Juan Pérez' },
    { key: 'telefono', label: 'Teléfono', example: '+57 300 123 4567' },
    { key: 'email', label: 'Correo electrónico', example: 'juan@email.com' },
    { key: 'ciudad', label: 'Ciudad', example: 'Bogotá' },
]

function TemplatesForm() {
    const { user, profile } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const templateId = searchParams.get('id')

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(!!templateId)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        content: '',
        description: '',
    })

    useEffect(() => {
        if (user && templateId) {
            loadTemplate(templateId)
        }
    }, [user, templateId])

    const loadTemplate = async (id: string) => {
        setFetching(true)
        try {
            const { data, error } = await supabase
                .from('message_templates')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            if (data) {
                setFormData({
                    name: data.name,
                    content: data.content,
                    description: data.description || '',
                })
            }
        } catch (err: any) {
            console.error('Error loading template:', err)
            setError('No se pudo cargar la plantilla')
        } finally {
            setFetching(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const insertVariable = (variable: string) => {
        const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = formData.content
        const newText = text.substring(0, start) + `{{${variable}}}` + text.substring(end)

        setFormData(prev => ({ ...prev, content: newText }))
    }

    const extractVariables = (content: string): string[] => {
        const matches = content.match(/{{(\w+)}}/g) || []
        return [...new Set(matches.map(m => m.replace(/{{|}}/g, '')))]
    }

    const getPreviewContent = (): string => {
        let preview = formData.content
        AVAILABLE_VARIABLES.forEach(v => {
            preview = preview.replace(new RegExp(`{{${v.key}}}`, 'g'), v.example)
        })
        return preview
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setLoading(true)
        setError(null)

        try {
            const variables = extractVariables(formData.content)

            if (templateId) {
                // Update
                const { error: updateError } = await supabase
                    .from('message_templates')
                    .update({
                        name: formData.name,
                        content: formData.content,
                        description: formData.description || null,
                        variables,
                    })
                    .eq('id', templateId)

                if (updateError) throw updateError
            } else {
                // Insert
                const { error: insertError } = await supabase.from('message_templates').insert({
                    user_id: user.id,
                    name: formData.name,
                    content: formData.content,
                    description: formData.description || null,
                    variables,
                    is_active: true,
                })

                if (insertError) throw insertError
            }

            setSuccess(true)
            setTimeout(() => {
                router.push('/messages/templates/list')
            }, 1000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p className="ml-3 text-gray-500">Cargando plantilla...</p>
            </div>
        )
    }

    return (
        <DashboardLayout
            title={templateId ? "Editar Plantilla" : "Nueva Plantilla"}
            subtitle={templateId ? `Editando: ${formData.name}` : "Crea una plantilla de mensaje personalizada"}
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="max-w-4xl mx-auto">
                <Link href="/messages/templates/list" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Volver a la lista
                </Link>

                {success && (
                    <Alert type="success" className="mb-6">
                        ¡Plantilla {templateId ? 'actualizada' : 'creada'} exitosamente! Redirigiendo...
                    </Alert>
                )}

                {error && (
                    <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardTitle>Información de la Plantilla</CardTitle>
                            <CardContent className="mt-4">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <Input
                                        label="Nombre de la plantilla"
                                        name="name"
                                        placeholder="Ej: Saludo de bienvenida"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />

                                    <Input
                                        label="Descripción (opcional)"
                                        name="description"
                                        placeholder="Breve descripción de cuándo usar esta plantilla"
                                        value={formData.description}
                                        onChange={handleChange}
                                    />

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Contenido del mensaje
                                        </label>
                                        <textarea
                                            name="content"
                                            rows={6}
                                            placeholder="Hola {{nombre}}, gracias por contactarnos..."
                                            value={formData.content}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none font-sans"
                                        />
                                        <p className="mt-1.5 text-sm text-gray-500">
                                            {formData.content.length} caracteres
                                        </p>
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowPreview(!showPreview)}
                                            icon={<Eye className="h-4 w-4" />}
                                        >
                                            {showPreview ? 'Ocultar' : 'Ver'} Vista Previa
                                        </Button>
                                        <Button type="submit" loading={loading} icon={<Save className="h-4 w-4" />}>
                                            {templateId ? 'Actualizar' : 'Guardar'} Plantilla
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Preview */}
                        {showPreview && formData.content && (
                            <Card className="mt-6">
                                <CardTitle>Vista Previa</CardTitle>
                                <CardContent className="mt-4">
                                    <div className="bg-green-50 rounded-lg p-4 max-w-md">
                                        <div className="flex items-start gap-2">
                                            <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
                                            <div className="bg-white rounded-lg p-3 shadow-sm">
                                                <p className="text-gray-800 whitespace-pre-wrap">
                                                    {getPreviewContent()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Variables Sidebar */}
                    <div>
                        <Card>
                            <CardTitle>Variables Disponibles</CardTitle>
                            <CardContent className="mt-4">
                                <p className="text-sm text-gray-600 mb-4">
                                    Haz clic para insertar una variable en tu mensaje
                                </p>
                                <div className="space-y-2">
                                    {AVAILABLE_VARIABLES.map((variable) => (
                                        <button
                                            key={variable.key}
                                            type="button"
                                            onClick={() => insertVariable(variable.key)}
                                            className="w-full flex items-center justify-between p-3 text-left rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all group"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-900 group-hover:text-primary-700">
                                                    {`{{${variable.key}}}`}
                                                </p>
                                                <p className="text-sm text-gray-500">{variable.label}</p>
                                            </div>
                                            <Plus className="h-4 w-4 text-gray-400 group-hover:text-primary-500" />
                                        </button>
                                    ))}
                                </div>

                                {/* Used Variables */}
                                {extractVariables(formData.content).length > 0 && (
                                    <div className="mt-6 pt-4 border-t">
                                        <p className="text-sm font-medium text-gray-700 mb-2">
                                            Variables usadas:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {extractVariables(formData.content).map((v) => (
                                                <span
                                                    key={v}
                                                    className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded border border-green-200"
                                                >
                                                    {`{{${v}}}`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

export default function TemplatesPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <TemplatesForm />
        </Suspense>
    )
}
