'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
    MessageSquare,
    Send,
    Check,
    ChevronRight,
    ChevronLeft,
    User,
    Phone,
    FileText,
    ExternalLink,
    RotateCcw,
    CheckCircle2,
    Clock,
    SkipForward,
    List,
    Zap
} from 'lucide-react'

interface Template {
    id: string
    name: string
    content: string
    variables: string[]
}

interface Contact {
    id: string
    full_name: string
    phone: string
    email: string | null
    city: string | null
    sent: boolean
    skipped: boolean
}

export default function ManualSendPage() {
    const { user, profile } = useAuth()
    const [step, setStep] = useState<'setup' | 'sending' | 'done'>('setup')
    const [templates, setTemplates] = useState<Template[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<string>('')
    const [contacts, setContacts] = useState<Contact[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())
    const [selectAll, setSelectAll] = useState(false)
    const [campaignName, setCampaignName] = useState('')
    const [sentCount, setSentCount] = useState(0)
    const [skippedCount, setSkippedCount] = useState(0)

    // Load templates and contacts
    useEffect(() => {
        if (!user) return

        const loadData = async () => {
            setLoading(true)
            const { data: templatesData } = await supabase
                .from('message_templates')
                .select('id, name, content, variables')
                .eq('is_active', true)
                .order('name')

            setTemplates(templatesData || [])
            setLoading(false)
        }
        loadData()
    }, [user])

    const loadContacts = useCallback(async () => {
        if (!user) return
        const { data } = await supabase
            .from('contacts')
            .select('id, full_name, phone, email, city')
            .eq('is_active', true)
            .eq('is_blocked', false)
            .order('full_name')

        setContacts((data || []).map(c => ({ ...c, sent: false, skipped: false })))
    }, [user])

    useEffect(() => {
        if (user) loadContacts()
    }, [user, loadContacts])

    const formatName = (fullName: string | null): string => {
        if (!fullName) return '';
        const parts = fullName.trim().toLowerCase().split(/\s+/);
        if (parts.length === 0) return '';

        const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

        if (parts.length === 1) return capitalize(parts[0]);
        if (parts.length === 2) return `${capitalize(parts[0])} ${capitalize(parts[1])}`;
        if (parts.length === 3) return `${capitalize(parts[0])} ${capitalize(parts[1])}`; // Name1 Surname1

        // Typical structure: Name1 Name2 Surname1 Surname2 -> parts[0] + parts[2]
        return `${capitalize(parts[0])} ${capitalize(parts[2])}`;
    }

    const personalizeMessage = (template: string, contact: Contact): string => {
        let msg = template
        const formattedName = formatName(contact.full_name)
        msg = msg.replace(/\{\{nombre\}\}/gi, formattedName)
        msg = msg.replace(/\{\{1\}\}/gi, formattedName)
        msg = msg.replace(/\{\{telefono\}\}/gi, contact.phone || '')
        msg = msg.replace(/\{\{email\}\}/gi, contact.email || '')
        msg = msg.replace(/\{\{ciudad\}\}/gi, contact.city || '')
        return msg
    }

    // Keyboard shortcuts for manual send optimization
    useEffect(() => {
        if (step !== 'sending') return

        const handleKeyDown = (e: KeyboardEvent) => {
            // Do not trigger if user is typing in an input (though there are none in this step)
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            if (e.key === 'Enter') {
                e.preventDefault()
                // Find and click the send button to ensure all state is current
                document.getElementById('btn-send-current')?.click()
            } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                document.getElementById('btn-skip-current')?.click()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [step])

    const getWhatsAppLink = (phone: string, message: string): string => {
        // Clean the phone number
        let cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
        if (!cleanPhone.startsWith('+')) {
            if (cleanPhone.startsWith('57')) {
                cleanPhone = '+' + cleanPhone
            } else {
                cleanPhone = '+57' + cleanPhone
            }
        }
        cleanPhone = cleanPhone.replace('+', '')
        const encodedMessage = encodeURIComponent(message)
        return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
    }

    const handleStartSending = () => {
        if (!selectedTemplate || selectedContactIds.size === 0 || !campaignName.trim()) return

        // Filter contacts to only selected ones
        const selectedContacts = contacts
            .filter(c => selectedContactIds.has(c.id))
            .map(c => ({ ...c, sent: false, skipped: false }))

        setContacts(selectedContacts)
        setCurrentIndex(0)
        setSentCount(0)
        setSkippedCount(0)
        setStep('sending')
    }

    const handleSendCurrent = () => {
        const contact = contacts[currentIndex]
        const template = templates.find(t => t.id === selectedTemplate)
        if (!contact || !template) return

        const message = personalizeMessage(template.content, contact)
        const link = getWhatsAppLink(contact.phone, message)

        // Mobile optimization: try to open app directly
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

        if (isMobile) {
            // For mobile, location.href is often better to trigger app intent
            window.location.href = link
        } else {
            // Desktop
            window.open(link, '_blank')
        }

        // Mark as sent
        const updated = [...contacts]
        updated[currentIndex] = { ...updated[currentIndex], sent: true }
        setContacts(updated)
        setSentCount(prev => prev + 1)

        // Log to database
        if (user) {
            supabase.from('system_logs').insert({
                user_id: user.id,
                action_type: 'manual_message_sent',
                action_category: 'message',
                description: `Mensaje manual enviado a ${contact.full_name}`,
                status: 'success',
                metadata: {
                    phone: contact.phone,
                    template_id: selectedTemplate,
                    campaign_name: campaignName
                }
            }).then(() => { })
        }

        // Auto-advance after a short delay
        setTimeout(() => {
            if (currentIndex < contacts.length - 1) {
                setCurrentIndex(prev => prev + 1)
            } else {
                setStep('done')
            }
        }, 500)
    }

    const handleSkipCurrent = () => {
        const updated = [...contacts]
        updated[currentIndex] = { ...updated[currentIndex], skipped: true }
        setContacts(updated)
        setSkippedCount(prev => prev + 1)

        if (currentIndex < contacts.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            setStep('done')
        }
    }

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedContactIds(new Set())
        } else {
            const filtered = contacts.filter(c =>
                c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone.includes(searchTerm)
            )
            setSelectedContactIds(new Set(filtered.map(c => c.id)))
        }
        setSelectAll(!selectAll)
    }

    const toggleContact = (id: string) => {
        const newSet = new Set(selectedContactIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedContactIds(newSet)
    }

    const filteredContacts = contacts.filter(c =>
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    )

    const currentContact = contacts[currentIndex]
    const currentTemplate = templates.find(t => t.id === selectedTemplate)
    const currentMessage = currentContact && currentTemplate
        ? personalizeMessage(currentTemplate.content, currentContact)
        : ''
    const progress = contacts.length > 0 ? ((sentCount + skippedCount) / contacts.length) * 100 : 0

    return (
        <DashboardLayout
            title="Envío Manual"
            subtitle="Envía mensajes uno por uno a través de WhatsApp"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            {/* Step: SETUP */}
            {step === 'setup' && (
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Header Card */}
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap className="h-6 w-6" />
                            <h2 className="text-xl font-bold">Envío Manual de WhatsApp</h2>
                        </div>
                        <p className="text-green-100 text-sm">
                            Sin API, sin Twilio, sin restricciones. Selecciona una plantilla y tus contactos —
                            se abrirá WhatsApp con el mensaje personalizado listo para enviar.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Campaign Name & Template Selection */}
                        <div className="space-y-4">
                            {/* Campaign Name */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <FileText className="inline h-4 w-4 mr-1" />
                                    Nombre de la campaña
                                </label>
                                <input
                                    type="text"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="Ej: Campaña Febrero 2026"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                />
                            </div>

                            {/* Template Selection */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    <MessageSquare className="inline h-4 w-4 mr-1" />
                                    Selecciona una plantilla
                                </label>
                                {loading ? (
                                    <div className="flex items-center justify-center h-20">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
                                    </div>
                                ) : templates.length === 0 ? (
                                    <p className="text-gray-400 text-sm">No hay plantillas. Crea una primero.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {templates.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setSelectedTemplate(t.id)}
                                                className={`w-full text-left p-3 rounded-lg border transition-all ${selectedTemplate === t.id
                                                    ? 'border-green-500 bg-green-50 ring-2 ring-green-500/20'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span className="font-medium text-gray-900 text-sm">{t.name}</span>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.content}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Preview */}
                            {selectedTemplate && selectedContactIds.size > 0 && (
                                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        👁️ Vista previa del primer mensaje
                                    </label>
                                    <div className="bg-[#efeae2] rounded-lg p-4">
                                        <div className="bg-[#d9fdd3] rounded-lg px-3 py-2 shadow-sm max-w-[85%] ml-auto">
                                            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                                                {personalizeMessage(
                                                    currentTemplate?.content || '',
                                                    contacts.find(c => selectedContactIds.has(c.id)) || contacts[0]
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Contacts Selection */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col" style={{ maxHeight: '600px' }}>
                            <div className="p-4 border-b border-gray-100">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <User className="inline h-4 w-4 mr-1" />
                                    Selecciona contactos ({selectedContactIds.size} seleccionados)
                                </label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por nombre o teléfono..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                />
                                <button
                                    onClick={handleSelectAll}
                                    className="mt-2 text-xs text-green-600 hover:text-green-700 font-medium"
                                >
                                    {selectAll ? '✕ Deseleccionar todos' : '☑ Seleccionar todos'}
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {filteredContacts.map(contact => (
                                    <button
                                        key={contact.id}
                                        onClick={() => toggleContact(contact.id)}
                                        className={`w-full text-left p-3 border-b border-gray-50 flex items-center gap-3 transition-colors ${selectedContactIds.has(contact.id) ? 'bg-green-50' : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedContactIds.has(contact.id)
                                            ? 'bg-green-500 border-green-500'
                                            : 'border-gray-300'
                                            }`}>
                                            {selectedContactIds.has(contact.id) && (
                                                <Check className="h-3 w-3 text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-900 truncate">
                                                {contact.full_name || 'Sin nombre'}
                                            </p>
                                            <p className="text-xs text-gray-500">{contact.phone}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Start Button */}
                    <div className="flex justify-center pt-2 pb-8">
                        <Button
                            onClick={handleStartSending}
                            disabled={!selectedTemplate || selectedContactIds.size === 0 || !campaignName.trim()}
                            className="!px-8 !py-3 !text-base !rounded-xl !bg-green-600 hover:!bg-green-700 disabled:!opacity-50 disabled:!cursor-not-allowed"
                        >
                            <Send className="h-5 w-5 mr-2" />
                            Comenzar envío ({selectedContactIds.size} contactos)
                        </Button>
                    </div>
                </div>
            )}

            {/* Step: SENDING */}
            {step === 'sending' && currentContact && (
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Progress Bar */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700">
                                Contacto {currentIndex + 1} de {contacts.length}
                            </span>
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> {sentCount} enviados
                                </span>
                                <span className="flex items-center gap-1 text-gray-400">
                                    <SkipForward className="h-3.5 w-3.5" /> {skippedCount} omitidos
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div
                                className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Contact Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Contact Header */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 border-b border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-bold text-lg">
                                        {currentContact.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {currentContact.full_name || 'Sin nombre'}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Phone className="h-3.5 w-3.5" />
                                            {currentContact.phone}
                                        </span>
                                        {currentContact.city && (
                                            <span>📍 {currentContact.city}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Message Preview */}
                        <div className="p-5">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Mensaje personalizado
                            </label>
                            <div className="bg-[#efeae2] rounded-lg p-4">
                                <div className="bg-[#d9fdd3] rounded-lg px-4 py-3 shadow-sm ml-auto max-w-[90%]" style={{ borderTopRightRadius: 0 }}>
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                                        {currentMessage}
                                    </p>
                                    <div className="flex items-center justify-end mt-1">
                                        <span className="text-[10px] text-gray-500">
                                            {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
                            <div className="flex items-center justify-center text-xs text-gray-400 mb-1 hidden md:flex gap-4">
                                <span>💡 Atajos de teclado:</span>
                                <span><kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">Enter</kbd> Enviar</span>
                                <span><kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">🡒</kbd> Omitir</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    id="btn-skip-current"
                                    onClick={handleSkipCurrent}
                                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                >
                                    <SkipForward className="h-4 w-4" />
                                    <span>Omitir <span className="hidden md:inline text-gray-400 text-xs">(🡒)</span></span>
                                </button>
                                <button
                                    id="btn-send-current"
                                    onClick={handleSendCurrent}
                                    className="flex-[2] py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    <span>Abrir en WhatsApp y Enviar <span className="hidden md:inline text-green-200 text-xs">(Enter)</span></span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentIndex === 0}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" /> Anterior
                        </button>
                        <button
                            onClick={() => {
                                if (currentIndex < contacts.length - 1) {
                                    setCurrentIndex(prev => prev + 1)
                                } else {
                                    setStep('done')
                                }
                            }}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                        >
                            {currentIndex < contacts.length - 1 ? 'Siguiente' : 'Finalizar'} <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step: DONE */}
            {step === 'done' && (
                <div className="max-w-lg mx-auto text-center py-12 space-y-6">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Envío completado!</h2>
                        <p className="text-gray-500">Campaña: <strong>{campaignName}</strong></p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                            <p className="text-3xl font-bold text-gray-900">{contacts.length}</p>
                            <p className="text-xs text-gray-500 mt-1">Total</p>
                        </div>
                        <div className="bg-green-50 rounded-xl border border-green-200 p-4 shadow-sm">
                            <p className="text-3xl font-bold text-green-600">{sentCount}</p>
                            <p className="text-xs text-green-600 mt-1">Enviados</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 shadow-sm">
                            <p className="text-3xl font-bold text-gray-400">{skippedCount}</p>
                            <p className="text-xs text-gray-500 mt-1">Omitidos</p>
                        </div>
                    </div>

                    {/* Contact Status List */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y max-h-72 overflow-y-auto text-left">
                        {contacts.map((c, i) => (
                            <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                                <span className="text-xs text-gray-400 w-6">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{c.full_name}</p>
                                    <p className="text-xs text-gray-400">{c.phone}</p>
                                </div>
                                {c.sent ? (
                                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                        <CheckCircle2 className="h-4 w-4" /> Enviado
                                    </span>
                                ) : c.skipped ? (
                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                        <SkipForward className="h-4 w-4" /> Omitido
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs text-amber-500">
                                        <Clock className="h-4 w-4" /> Pendiente
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setStep('setup')
                                setSelectedContactIds(new Set())
                                setSelectedTemplate('')
                                setCampaignName('')
                                loadContacts()
                            }}
                        >
                            <RotateCcw className="h-4 w-4 mr-2" /> Nueva campaña
                        </Button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
