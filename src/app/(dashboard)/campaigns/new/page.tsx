'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardTitle, CardContent, Button, Input, Alert } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase, type MessageTemplate, type Contact, type ExcelUpload } from '@/lib/supabase'
import {
    Save,
    ArrowLeft,
    Users,
    Calendar,
    Zap,
    Clock,
    UserCheck,
    Check,
    Package
} from 'lucide-react'
import Link from 'next/link'

export default function NewCampaignPage() {
    const { user, profile } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [contactCount, setContactCount] = useState(0)
    const [targetMode, setTargetMode] = useState<'all' | 'package' | 'selected'>('all')
    const [allContacts, setAllContacts] = useState<Contact[]>([])
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())
    const [packages, setPackages] = useState<ExcelUpload[]>([])
    const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(new Set())

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        template_id: '',
        send_type: 'immediate' as 'immediate' | 'scheduled' | 'manual',
        scheduled_at: '',
    })

    useEffect(() => {
        if (user) {
            loadTemplates()
            loadContactCount()
            loadAllContacts()
            loadPackages()
        }
    }, [user])

    const loadTemplates = async () => {
        if (!user) return

        const { data } = await supabase
            .from('message_templates')
            .select('*')
            .eq('is_active', true)

        setTemplates(data || [])
    }

    const loadContactCount = async () => {
        if (!user) return

        const { count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('is_blocked', false)

        setContactCount(count || 0)
    }

    const loadAllContacts = async () => {
        if (!user) return
        const { data } = await supabase
            .from('contacts')
            .select('id, full_name, phone')
            .eq('is_active', true)
            .eq('is_blocked', false)
            .order('full_name')
        setAllContacts((data || []) as Contact[])
    }

    const loadPackages = async () => {
        if (!user) return
        const { data } = await supabase
            .from('excel_uploads')
            .select('*')
            .order('created_at', { ascending: false })
        setPackages(data || [])
    }

    const toggleContactSelection = (contactId: string) => {
        const newSet = new Set(selectedContactIds)
        if (newSet.has(contactId)) {
            newSet.delete(contactId)
        } else {
            newSet.add(contactId)
        }
        setSelectedContactIds(newSet)
    }

    const selectAllContacts = () => {
        setSelectedContactIds(new Set(allContacts.map(c => c.id)))
    }

    const deselectAllContacts = () => {
        setSelectedContactIds(new Set())
    }

    const togglePackageSelection = (packageId: string) => {
        const newSet = new Set(selectedPackageIds)
        if (newSet.has(packageId)) {
            newSet.delete(packageId)
        } else {
            newSet.add(packageId)
        }
        setSelectedPackageIds(newSet)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setLoading(true)
        setError(null)

        try {
            // Create campaign record
            const campaignData = {
                user_id: user.id,
                name: formData.name,
                description: formData.description || null,
                template_id: formData.template_id || null,
                send_type: formData.send_type,
                scheduled_at: formData.send_type === 'scheduled' ? formData.scheduled_at : null,
                total_contacts: contactCount,
                status: formData.send_type === 'immediate' ? 'sending' : (formData.send_type === 'scheduled' ? 'scheduled' : 'draft'),
            } as const

            const { data: campaign, error: insertError } = await supabase
                .from('campaigns')
                .insert(campaignData as any)
                .select()
                .single()

            if (insertError || !campaign) throw insertError || new Error('No se pudo crear la campaña')

            // If immediate send, execute the campaign now
            if (formData.send_type === 'immediate' && formData.template_id) {
                // Fetch template content
                const { data: template } = await supabase
                    .from('message_templates')
                    .select('content, whatsapp_template_id')
                    .eq('id', formData.template_id)
                    .single()

                if (!template) throw new Error('Plantilla no encontrada')

                // Fetch contacts based on target mode
                let contactsToSend: Array<{ id: string; full_name: string | null; phone: string; email: string | null; city: string | null; notes?: string | null }> = []

                if (targetMode === 'all') {
                    // Fetch all active contacts
                    const { data: allContactsData } = await supabase
                        .from('contacts')
                        .select('id, full_name, phone, email, city, notes')
                        .eq('is_active', true)
                        .eq('is_blocked', false)
                    contactsToSend = allContactsData || []
                } else if (targetMode === 'package') {
                    // Fetch contacts from selected packages
                    if (selectedPackageIds.size === 0) {
                        throw new Error('No has seleccionado ningún paquete')
                    }
                    const { data: packageContactsData } = await supabase
                        .from('contacts')
                        .select('id, full_name, phone, email, city, notes')
                        .in('upload_id', Array.from(selectedPackageIds))
                        .eq('is_active', true)
                        .eq('is_blocked', false)
                    contactsToSend = packageContactsData || []
                } else {
                    // Fetch only selected contacts
                    if (selectedContactIds.size === 0) {
                        throw new Error('No has seleccionado ningún contacto')
                    }
                    const { data: selectedContactsData } = await supabase
                        .from('contacts')
                        .select('id, full_name, phone, email, city, notes')
                        .in('id', Array.from(selectedContactIds))
                    contactsToSend = selectedContactsData || []
                }

                if (contactsToSend.length === 0) throw new Error('No hay contactos para enviar')

                // Update campaign with actual contact count
                await supabase.from('campaigns').update({ total_contacts: contactsToSend.length }).eq('id', campaign.id)

                let sent = 0, failed = 0

                for (const contact of contactsToSend) {
                    // Personalize the message
                    let messageContent = template.content
                    messageContent = messageContent.replace(/\{\{nombre\}\}/gi, contact.full_name || '')
                    messageContent = messageContent.replace(/\{\{1\}\}/gi, contact.full_name || '') // Also support Twilio style {{1}}
                    messageContent = messageContent.replace(/\{\{telefono\}\}/gi, contact.phone || '')
                    messageContent = messageContent.replace(/\{\{email\}\}/gi, contact.email || '')
                    messageContent = messageContent.replace(/\{\{ciudad\}\}/gi, contact.city || '')

                    // Send message via API
                    // Build request body - use Content SID for approved templates
                    const sendBody: any = {
                        userId: user.id,
                        to: contact.phone,
                    }

                    if ((template as any).whatsapp_template_id) {
                        // Use approved template (Content SID)
                        sendBody.contentSid = (template as any).whatsapp_template_id
                        sendBody.contentVariables = { '1': contact.full_name || 'Cliente' }
                    } else {
                        // Fallback to plain text
                        sendBody.message = messageContent
                    }

                    const response = await fetch('/api/whatsapp/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sendBody),
                    })

                    if (response.ok) {
                        sent++
                        try {
                            const successData = await response.json()
                            // Log success matching the schema
                            await supabase.from('system_logs').insert({
                                user_id: user.id,
                                action_type: 'campaign_sent',
                                action_category: 'campaign',
                                description: `Mensaje enviado a ${contact.full_name}`,
                                status: 'success',
                                metadata: {
                                    entity_type: 'campaign',
                                    entity_id: campaign.id,
                                    phone: contact.phone,
                                    sid: successData.messageSid,
                                    status: successData.status
                                }
                            })
                        } catch (e) {
                            console.error('Error logging success:', e)
                        }
                    } else {
                        failed++
                        try {
                            const errorData = await response.json()
                            await supabase.from('system_logs').insert({
                                user_id: user.id,
                                action_type: 'campaign_error',
                                action_category: 'campaign',
                                description: `Error al enviar a ${contact.full_name}`,
                                status: 'error',
                                error_details: errorData.error || 'Unknown error',
                                metadata: {
                                    entity_type: 'campaign',
                                    entity_id: campaign.id,
                                    phone: contact.phone
                                }
                            })
                        } catch (e) {
                            console.error('Error logging failure:', e)
                        }
                    }

                    // Small delay between messages
                    await new Promise(r => setTimeout(r, 500))
                }

                // Update campaign with final stats
                await supabase.from('campaigns').update({
                    messages_sent: sent,
                    messages_failed: failed,
                    messages_pending: 0,
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                }).eq('id', campaign.id)
            }

            router.push('/campaigns')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const sendTypes = [
        {
            value: 'immediate',
            label: 'Envío inmediato',
            description: 'Enviar a todos los contactos ahora',
            icon: <Zap className="h-5 w-5" />,
        },
        {
            value: 'scheduled',
            label: 'Programado',
            description: 'Programar envío para una fecha futura',
            icon: <Calendar className="h-5 w-5" />,
        },
        {
            value: 'manual',
            label: 'Manual',
            description: 'Guardar como borrador para enviar después',
            icon: <Clock className="h-5 w-5" />,
        },
    ]

    return (
        <DashboardLayout
            title="Nueva Campaña"
            subtitle="Configura tu campaña de envío masivo"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="max-w-3xl mx-auto">
                {/* Back Button */}
                <Link href="/campaigns" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
                    <ArrowLeft className="h-4 w-4" />
                    Volver a campañas
                </Link>

                {error && (
                    <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Campaign Info */}
                    <Card>
                        <CardTitle>Información de la campaña</CardTitle>
                        <CardContent className="mt-4 space-y-4">
                            <Input
                                label="Nombre de la campaña"
                                name="name"
                                placeholder="Ej: Promoción de Febrero"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Descripción (opcional)
                                </label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    placeholder="Describe el objetivo de esta campaña..."
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Template Selection */}
                    <Card>
                        <CardTitle>Plantilla de mensaje</CardTitle>
                        <CardContent className="mt-4">
                            <select
                                name="template_id"
                                value={formData.template_id}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="">Selecciona una plantilla</option>
                                {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                            {templates.length === 0 && (
                                <p className="mt-2 text-sm text-gray-500">
                                    No tienes plantillas.{' '}
                                    <Link href="/messages/templates" className="text-primary-600 hover:underline">
                                        Crear una plantilla
                                    </Link>
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Contact Selection */}
                    <Card>
                        <CardTitle>Destinatarios</CardTitle>
                        <CardContent className="mt-4">
                            {/* Target Mode Selection */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <label
                                    className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${targetMode === 'all' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <input
                                        type="radio"
                                        name="targetMode"
                                        value="all"
                                        checked={targetMode === 'all'}
                                        onChange={() => setTargetMode('all')}
                                        className="sr-only"
                                    />
                                    <Users className={`h-5 w-5 ${targetMode === 'all' ? 'text-primary-600' : 'text-gray-400'}`} />
                                    <div className="text-sm">
                                        <p className={`font-medium ${targetMode === 'all' ? 'text-primary-700' : 'text-gray-900'}`}>
                                            Todos
                                        </p>
                                        <p className="text-xs text-gray-500">{contactCount}</p>
                                    </div>
                                </label>
                                <label
                                    className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${targetMode === 'package' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <input
                                        type="radio"
                                        name="targetMode"
                                        value="package"
                                        checked={targetMode === 'package'}
                                        onChange={() => setTargetMode('package')}
                                        className="sr-only"
                                    />
                                    <Package className={`h-5 w-5 ${targetMode === 'package' ? 'text-primary-600' : 'text-gray-400'}`} />
                                    <div className="text-sm">
                                        <p className={`font-medium ${targetMode === 'package' ? 'text-primary-700' : 'text-gray-900'}`}>
                                            Por Paquete
                                        </p>
                                        <p className="text-xs text-gray-500">{packages.length}</p>
                                    </div>
                                </label>
                                <label
                                    className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${targetMode === 'selected' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <input
                                        type="radio"
                                        name="targetMode"
                                        value="selected"
                                        checked={targetMode === 'selected'}
                                        onChange={() => setTargetMode('selected')}
                                        className="sr-only"
                                    />
                                    <UserCheck className={`h-5 w-5 ${targetMode === 'selected' ? 'text-primary-600' : 'text-gray-400'}`} />
                                    <div className="text-sm">
                                        <p className={`font-medium ${targetMode === 'selected' ? 'text-primary-700' : 'text-gray-900'}`}>
                                            Específicos
                                        </p>
                                        <p className="text-xs text-gray-500">{selectedContactIds.size}</p>
                                    </div>
                                </label>
                            </div>

                            {/* Package List (shown when targetMode is 'package') */}
                            {targetMode === 'package' && (
                                <div className="border rounded-lg">
                                    <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                                        <span className="text-sm font-medium text-gray-700">Selecciona los paquetes:</span>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {packages.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500">
                                                No hay paquetes importados.
                                                <Link href="/contacts/import" className="block text-primary-600 mt-2 hover:underline">
                                                    Importar contactos
                                                </Link>
                                            </div>
                                        ) : (
                                            packages.map((pkg) => (
                                                <label
                                                    key={pkg.id}
                                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPackageIds.has(pkg.id)}
                                                        onChange={() => togglePackageSelection(pkg.id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">{pkg.file_name}</p>
                                                        <p className="text-xs text-gray-500">{new Date(pkg.created_at).toLocaleDateString()} • {pkg.valid_rows} contactos</p>
                                                    </div>
                                                    {selectedPackageIds.has(pkg.id) && (
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    )}
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Contact List (shown when targetMode is 'selected') */}
                            {targetMode === 'selected' && (
                                <div className="border rounded-lg">
                                    <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                                        <span className="text-sm font-medium text-gray-700">Selecciona los contactos:</span>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={selectAllContacts} className="text-xs text-primary-600 hover:underline">
                                                Seleccionar todos
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button type="button" onClick={deselectAllContacts} className="text-xs text-gray-500 hover:underline">
                                                Deseleccionar todos
                                            </button>
                                        </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {allContacts.map((contact) => (
                                            <label
                                                key={contact.id}
                                                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedContactIds.has(contact.id)}
                                                    onChange={() => toggleContactSelection(contact.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{contact.full_name}</p>
                                                    <p className="text-sm text-gray-500">{contact.phone}</p>
                                                </div>
                                                {selectedContactIds.has(contact.id) && (
                                                    <Check className="h-4 w-4 text-green-500" />
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Send Type */}
                    <Card>
                        <CardTitle>Tipo de envío</CardTitle>
                        <CardContent className="mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {sendTypes.map((type) => (
                                    <label
                                        key={type.value}
                                        className={`flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${formData.send_type === type.value
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="send_type"
                                            value={type.value}
                                            checked={formData.send_type === type.value}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div className={`p-3 rounded-full mb-3 ${formData.send_type === type.value
                                            ? 'bg-primary-100 text-primary-600'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {type.icon}
                                        </div>
                                        <p className={`font-medium text-center ${formData.send_type === type.value ? 'text-primary-700' : 'text-gray-900'
                                            }`}>
                                            {type.label}
                                        </p>
                                        <p className="text-sm text-gray-500 text-center mt-1">
                                            {type.description}
                                        </p>
                                    </label>
                                ))}
                            </div>

                            {formData.send_type === 'scheduled' && (
                                <div className="mt-4">
                                    <Input
                                        label="Fecha y hora de envío"
                                        type="datetime-local"
                                        name="scheduled_at"
                                        value={formData.scheduled_at}
                                        onChange={handleChange}
                                        required
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Summary */}
                    <Card>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-100 rounded-xl">
                                        <Users className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {contactCount} contactos activos
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Recibirán esta campaña
                                        </p>
                                    </div>
                                </div>
                                <Button type="submit" loading={loading} size="lg" icon={<Save className="h-4 w-4" />}>
                                    Crear Campaña
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </DashboardLayout>
    )
}
