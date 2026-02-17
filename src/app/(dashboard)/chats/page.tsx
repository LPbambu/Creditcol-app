'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
    Search,
    Send,
    User,
    Phone,
    Clock,
    CheckCircle,
    CheckCheck,
    MessageCircle,
    ArrowLeft,
    RefreshCw,
    Wifi,
    WifiOff
} from 'lucide-react'

interface Conversation {
    contact_id: string
    contact_name: string
    contact_phone: string
    last_message: string
    last_message_at: string
    unread_count: number
    last_status: string
}

interface Message {
    id: string
    content: string
    status: string
    sent_at: string
    is_incoming: boolean
}

export default function ChatsPage() {
    const { user, profile } = useAuth()
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isRealtime, setIsRealtime] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const selectedConvRef = useRef<Conversation | null>(null)

    // Keep ref in sync with state
    useEffect(() => {
        selectedConvRef.current = selectedConversation
    }, [selectedConversation])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const loadConversations = useCallback(async () => {
        if (!user) return

        setLoading(true)
        try {
            // Get all contacts that have messages
            const { data: messagesData, error } = await supabase
                .from('messages')
                .select('contact_id, content, status, sent_at')
                .eq('user_id', user.id)
                .order('sent_at', { ascending: false })

            if (error) throw error

            // Group by contact_id and get latest message
            const contactMap = new Map<string, { content: string; status: string; sent_at: string; unread: number }>()
            for (const msg of messagesData || []) {
                if (!contactMap.has(msg.contact_id)) {
                    contactMap.set(msg.contact_id, {
                        content: msg.content,
                        status: msg.status,
                        sent_at: msg.sent_at,
                        unread: msg.status === 'received' ? 1 : 0
                    })
                } else if (msg.status === 'received') {
                    const existing = contactMap.get(msg.contact_id)!
                    existing.unread++
                }
            }

            if (contactMap.size === 0) {
                setConversations([])
                setLoading(false)
                return
            }

            // Get contact info
            const contactIds = Array.from(contactMap.keys())
            const { data: contacts } = await supabase
                .from('contacts')
                .select('id, full_name, phone')
                .in('id', contactIds)

            const conversationsData: Conversation[] = []
            for (const contact of contacts || []) {
                const msgData = contactMap.get(contact.id)
                if (msgData) {
                    conversationsData.push({
                        contact_id: contact.id,
                        contact_name: contact.full_name || contact.phone,
                        contact_phone: contact.phone,
                        last_message: msgData.content,
                        last_message_at: msgData.sent_at,
                        unread_count: msgData.unread,
                        last_status: msgData.status
                    })
                }
            }

            // Sort by last message date
            conversationsData.sort((a, b) =>
                new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            )

            setConversations(conversationsData)
        } catch (error) {
            console.error('Error loading conversations:', error)
        } finally {
            setLoading(false)
        }
    }, [user])

    const loadMessages = useCallback(async (contactId: string, showLoading = true) => {
        if (!user) return

        if (showLoading) setLoading(true)
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('id, content, status, sent_at')
                .eq('contact_id', contactId)
                .order('sent_at', { ascending: true })

            if (error) throw error

            const formattedMessages: Message[] = (data || []).map(msg => ({
                id: msg.id,
                content: msg.content,
                status: msg.status,
                sent_at: msg.sent_at,
                is_incoming: msg.status === 'received'
            }))

            setMessages(formattedMessages)
            if (showLoading) setTimeout(scrollToBottom, 100)
        } catch (error) {
            console.error('Error loading messages:', error)
        } finally {
            if (showLoading) setLoading(false)
        }
    }, [user])

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || !user) return

        setSending(true)
        try {
            const response = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    to: selectedConversation.contact_phone,
                    message: newMessage
                })
            })

            if (response.ok) {
                const result = await response.json()
                // Add to local messages
                const newMsg: Message = {
                    id: crypto.randomUUID(),
                    content: newMessage,
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    is_incoming: false
                }
                setMessages(prev => [...prev, newMsg])
                setNewMessage('')
                setTimeout(scrollToBottom, 100)

                // Insert into database
                await supabase.from('messages').insert({
                    user_id: user.id,
                    contact_id: selectedConversation.contact_id,
                    phone: selectedConversation.contact_phone,
                    content: newMessage,
                    status: 'sent',
                    provider: 'twilio',
                    provider_message_id: result.messageSid,
                    sent_at: new Date().toISOString()
                })

                // Reload conversations to update last message snippet
                loadConversations()
            } else {
                const errorData = await response.json()
                alert('Error al enviar: ' + (errorData.error || 'Error desconocido'))
            }
        } catch (error) {
            console.error('Error sending message:', error)
            alert('Error al enviar el mensaje')
        } finally {
            setSending(false)
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 0) {
            return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        } else if (diffDays === 1) {
            return 'Ayer'
        } else if (diffDays < 7) {
            return date.toLocaleDateString('es-CO', { weekday: 'short' })
        } else {
            return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
        }
    }

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }

    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
            'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
        ]
        const index = name.charCodeAt(0) % colors.length
        return colors[index]
    }

    // Effect for initial load
    useEffect(() => {
        if (user) {
            loadConversations()
        }
    }, [user, loadConversations])

    // Effect for selecting conversation
    useEffect(() => {
        if (selectedConversation) {
            loadMessages(selectedConversation.contact_id)
        }
    }, [selectedConversation, loadMessages])

    // Realtime subscription for new messages
    useEffect(() => {
        if (!user) return

        const channel = supabase
            .channel('messages-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('📨 Nuevo mensaje recibido:', payload.new)
                    const newMsg = payload.new as any

                    // If we're viewing this conversation, add the message
                    if (selectedConvRef.current && newMsg.contact_id === selectedConvRef.current.contact_id) {
                        const formattedMsg: Message = {
                            id: newMsg.id,
                            content: newMsg.content,
                            status: newMsg.status,
                            sent_at: newMsg.sent_at,
                            is_incoming: newMsg.status === 'received'
                        }
                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.some(m => m.id === formattedMsg.id)) return prev
                            return [...prev, formattedMsg]
                        })
                        setTimeout(scrollToBottom, 100)
                    }

                    // Reload conversation list
                    loadConversations()
                }
            )
            .subscribe((status) => {
                setIsRealtime(status === 'SUBSCRIBED')
                console.log('Realtime status:', status)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, loadConversations])

    // Fallback polling (every 10 seconds) in case realtime doesn't work
    useEffect(() => {
        if (!selectedConversation || !user || isRealtime) return

        const interval = setInterval(() => {
            loadMessages(selectedConversation.contact_id, false)
        }, 10000)

        return () => clearInterval(interval)
    }, [selectedConversation, user, isRealtime, loadMessages])

    // Auto-scroll on new messages
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const filteredConversations = conversations.filter(conv =>
        conv.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.contact_phone.includes(searchTerm)
    )

    return (
        <DashboardLayout
            title="Chats"
            subtitle="Conversaciones con tus contactos"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
            padding={false}
        >
            <div className="h-[calc(100vh-180px)] flex bg-white md:bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {/* Conversations List */}
                <div className={`w-full md:w-96 flex flex-col bg-white border-r border-gray-200 ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                    {/* Search Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar conversación..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                />
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={loadConversations}
                                className="!p-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                        {/* Realtime indicator */}
                        <div className="flex items-center gap-1.5 mt-2">
                            {isRealtime ? (
                                <>
                                    <Wifi className="h-3 w-3 text-green-500" />
                                    <span className="text-[10px] text-green-600 font-medium">En vivo</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="h-3 w-3 text-gray-400" />
                                    <span className="text-[10px] text-gray-400">Actualizando cada 10s</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Conversations */}
                    <div className="flex-1 overflow-y-auto">
                        {loading && !conversations.length ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium">No hay conversaciones</p>
                                <p className="text-gray-400 text-sm mt-1">Las conversaciones aparecerán aquí cuando envíes o recibas mensajes</p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv.contact_id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={`w-full p-4 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors group relative ${selectedConversation?.contact_id === conv.contact_id ? 'bg-green-50' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-12 h-12 rounded-full ${getAvatarColor(conv.contact_name)} flex-shrink-0 flex items-center justify-center overflow-hidden`}>
                                            <span className="text-white font-bold text-sm">{getInitials(conv.contact_name)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-gray-900 truncate">
                                                    {conv.contact_name || conv.contact_phone}
                                                </span>
                                                <span className={`text-xs flex-shrink-0 ml-2 ${conv.unread_count > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                                    {formatTime(conv.last_message_at)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {conv.last_status !== 'received' && (
                                                    <CheckCheck className={`h-4 w-4 flex-shrink-0 ${conv.last_status === 'read' ? 'text-blue-500' : 'text-gray-400'}`} />
                                                )}
                                                <p className="text-sm text-gray-500 truncate flex-1">
                                                    {conv.last_status === 'received' && <span className="font-medium text-gray-700">📩 </span>}
                                                    {conv.last_message}
                                                </p>
                                                {conv.unread_count > 0 && (
                                                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                                                        {conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat View */}
                <div className={`flex-1 flex flex-col bg-[#efeae2] ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 px-4 bg-gray-50 border-b border-gray-200 flex items-center gap-4 shadow-sm z-10">
                                <button
                                    onClick={() => setSelectedConversation(null)}
                                    className="md:hidden p-2 hover:bg-gray-200 rounded-full"
                                >
                                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                                </button>
                                <div className={`w-10 h-10 rounded-full ${getAvatarColor(selectedConversation.contact_name)} flex items-center justify-center overflow-hidden`}>
                                    <span className="text-white font-bold text-sm">{getInitials(selectedConversation.contact_name)}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">
                                        {selectedConversation.contact_name || selectedConversation.contact_phone}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {selectedConversation.contact_phone}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => loadMessages(selectedConversation.contact_id)}
                                    className="!p-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {/* Date separator for first message */}
                                {messages.length > 0 && (
                                    <div className="flex justify-center mb-4">
                                        <span className="bg-white/80 text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
                                            {new Date(messages[0].sent_at).toLocaleDateString('es-CO', {
                                                day: 'numeric', month: 'long', year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                )}
                                {messages.map((msg, index) => {
                                    // Show date separator when date changes
                                    const showDate = index > 0 &&
                                        new Date(msg.sent_at).toDateString() !== new Date(messages[index - 1].sent_at).toDateString()

                                    return (
                                        <div key={msg.id}>
                                            {showDate && (
                                                <div className="flex justify-center my-4">
                                                    <span className="bg-white/80 text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
                                                        {new Date(msg.sent_at).toLocaleDateString('es-CO', {
                                                            day: 'numeric', month: 'long', year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex ${msg.is_incoming ? 'justify-start' : 'justify-end'}`}>
                                                <div
                                                    className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm relative ${msg.is_incoming
                                                        ? 'bg-white rounded-tl-none'
                                                        : 'bg-[#d9fdd3] rounded-tr-none'
                                                        }`}
                                                    style={{ wordBreak: 'break-word' }}
                                                >
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                                                        {msg.content}
                                                    </p>
                                                    <div className="flex items-center justify-end gap-1 mt-1 select-none">
                                                        <span className="text-[10px] text-gray-500">
                                                            {new Date(msg.sent_at).toLocaleTimeString('es-CO', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                        {!msg.is_incoming && (
                                                            <span className="ml-0.5">
                                                                {msg.status === 'read' ? (
                                                                    <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                                                                ) : msg.status === 'delivered' ? (
                                                                    <CheckCheck className="h-3.5 w-3.5 text-gray-400" />
                                                                ) : (
                                                                    <CheckCircle className="h-3 w-3 text-gray-400" />
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-3 bg-gray-50 border-t border-gray-200">
                                <div className="flex items-center gap-2 max-w-4xl mx-auto">
                                    <input
                                        type="text"
                                        placeholder="Escribe un mensaje..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                handleSendMessage()
                                            }
                                        }}
                                        className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
                                        disabled={sending}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim() || sending}
                                        className={`w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors ${(!newMessage.trim() || sending) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {sending ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        ) : (
                                            <Send className="h-4 w-4 text-white" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 border-b-[6px] border-green-500 box-border h-full">
                            <div className="w-64 h-64 bg-gray-100 rounded-full flex items-center justify-center mb-8 relative">
                                <div className="absolute inset-0 bg-green-500/10 rounded-full animate-pulse" />
                                <MessageCircle className="h-32 w-32 text-green-500" />
                            </div>
                            <h2 className="text-3xl font-light text-gray-800 mb-4">
                                CreditCol Chat
                            </h2>
                            <p className="text-gray-500 max-w-md text-sm leading-relaxed">
                                Envía y recibe mensajes de WhatsApp directamente desde tu plataforma.
                                <br />
                                Selecciona una conversación o envía una campaña para comenzar.
                            </p>
                            <div className="mt-8 flex items-center gap-2 text-xs text-gray-400">
                                {isRealtime ? (
                                    <>
                                        <Wifi className="h-3 w-3 text-green-500" />
                                        <span className="text-green-500">Conectado en tiempo real</span>
                                    </>
                                ) : (
                                    <>
                                        <Clock className="h-3 w-3" />
                                        <span>Actualizando cada 10 segundos</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
