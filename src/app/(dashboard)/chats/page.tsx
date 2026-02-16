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
    MessageCircle,
    ArrowLeft,
    RefreshCw
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

    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const loadConversations = useCallback(async () => {
        if (!user) return

        setLoading(true)
        try {
            // Get all contacts with their latest message
            const { data: contacts, error } = await supabase
                .from('contacts')
                .select('id, full_name, phone')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })

            if (error) throw error

            // For each contact, get their latest message
            const conversationsData: Conversation[] = []

            for (const contact of contacts || []) {
                const { data: lastMsg } = await supabase
                    .from('messages')
                    .select('content, status, sent_at')
                    .eq('contact_id', contact.id)
                    .order('sent_at', { ascending: false })
                    .limit(1)
                    .single()

                if (lastMsg) {
                    // Count unread (received messages)
                    const { count } = await supabase
                        .from('messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('contact_id', contact.id)
                        .eq('status', 'received')
                    // We typically need an 'is_read' flag, but for now assuming count is correct
                    // Or logic to count unread could be complex without a read flag.
                    // Let's assume for now we just show a count but don't track read state perfectly yet.

                    conversationsData.push({
                        contact_id: contact.id,
                        contact_name: contact.full_name,
                        contact_phone: contact.phone,
                        last_message: lastMsg.content,
                        last_message_at: lastMsg.sent_at,
                        unread_count: count || 0,
                        last_status: lastMsg.status
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

                // Insert into database - wait for it to ensure consistency
                await supabase.from('messages').insert({
                    user_id: user.id,
                    contact_id: selectedConversation.contact_id,
                    phone: selectedConversation.contact_phone,
                    content: newMessage,
                    status: 'sent',
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

    // Effect for polling messages
    useEffect(() => {
        if (!selectedConversation || !user) return

        const interval = setInterval(() => {
            loadMessages(selectedConversation.contact_id, false) // false = background update
        }, 5000)

        return () => clearInterval(interval)
    }, [selectedConversation, user, loadMessages])

    // Effect for auto-scroll on new messages
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
                                <p className="text-gray-500">No hay conversaciones</p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv.contact_id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={`w-full p-4 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors group relative ${selectedConversation?.contact_id === conv.contact_id ? 'bg-green-50' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                            {/* Avatar Placeholder */}
                                            <User className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-gray-900 truncate">
                                                    {conv.contact_name || conv.contact_phone}
                                                </span>
                                                <span className={`text-xs ${conv.unread_count > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                                    {formatTime(conv.last_message_at)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {conv.last_status === 'sent' && <CheckCircle className="h-3 w-3 text-gray-400" />}
                                                {conv.last_status === 'delivered' && <CheckCircle className="h-3 w-3 text-gray-400" />}
                                                {conv.last_status === 'read' && <CheckCircle className="h-3 w-3 text-blue-500" />}

                                                <p className="text-sm text-gray-500 truncate flex-1">
                                                    {conv.last_message}
                                                </p>

                                                {conv.unread_count > 0 && (
                                                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
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
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    <User className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">
                                        {selectedConversation.contact_name || selectedConversation.contact_phone}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {selectedConversation.contact_phone}
                                    </p>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.is_incoming ? 'justify-start' : 'justify-end'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm relative ${msg.is_incoming ? 'bg-white rounded-tl-none' : 'bg-[#d9fdd3] rounded-tr-none'
                                                }`}
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
                                                            <CheckCircle className="h-3 w-3 text-blue-500" />
                                                        ) : (
                                                            <CheckCircle className="h-3 w-3 text-gray-400" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-3 bg-gray-50 border-t border-gray-200">
                                <div className="flex items-center gap-2 max-w-4xl mx-auto">
                                    <input
                                        type="text"
                                        placeholder="Escribe un mensaje"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                        className="flex-1 px-4 py-2 bg-white border border-white rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 text-sm"
                                        disabled={sending}
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim() || sending}
                                        className={`!p-2 rounded-full ${sending ? 'opacity-50' : ''}`}
                                        loading={sending}
                                    >
                                        <div className="w-6 h-6 flex items-center justify-center">
                                            <Send className="h-4 w-4" />
                                        </div>
                                    </Button>
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
                                WhatsApp Web
                            </h2>
                            <p className="text-gray-500 max-w-md text-sm leading-relaxed">
                                Envía y recibe mensajes sin necesidad de mantener tu teléfono conectado.
                                <br />
                                Usa CREDITCOL en hasta 4 dispositivos vinculados y 1 teléfono a la vez.
                            </p>
                            <div className="mt-8 flex items-center gap-2 text-xs text-gray-400">
                                <Phone className="h-3 w-3" />
                                <span>Cifrado de extremo a extremo (simulado)</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
