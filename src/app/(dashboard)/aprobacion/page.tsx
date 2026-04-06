'use client'

import { useEffect, useState, useRef } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, Button, Modal } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { ApprovalRequest, ApprovalComment } from '@/lib/supabase/types'
import {
    Upload,
    User,
    Phone,
    AlertCircle,
    Clock,
    CheckCircle2,
    XCircle,
    FileImage,
    X,
    Eye,
    ChevronDown,
    ShieldCheck,
    FileBadge,
    Building2,
    Trash2,
    MessageSquare,
    Send,
    Paperclip,
} from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────

function getEstadoBadge(estado: string) {
    switch (estado) {
        case 'aprobado':
            return {
                label: 'Aprobado',
                icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            }
        case 'descartado':
            return {
                label: 'Descartado',
                icon: <XCircle className="h-3.5 w-3.5" />,
                classes: 'bg-red-100 text-red-800 border-red-200',
            }
        default:
            return {
                label: 'Pendiente aprobación',
                icon: <Clock className="h-3.5 w-3.5" />,
                classes: 'bg-amber-100 text-amber-800 border-amber-200',
            }
    }
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

/** Normaliza un número colombiano y devuelve el enlace wa.me */
function getWhatsAppUrl(phone: string): string {
    // Quita todo lo que no sea dígito
    const digits = phone.replace(/\D/g, '')
    // Si ya empieza con 57 (código CO) lo usamos; si no, lo agregamos
    const full = digits.startsWith('57') ? digits : `57${digits}`
    return `https://wa.me/${full}`
}

// ─── Upload Form ─────────────────────────────────────────────

function UploadForm({ onSuccess }: { onSuccess: () => void }) {
    const { user, profile } = useAuth()
    const [nombre, setNombre] = useState('')
    const [telefono, setTelefono] = useState('')
    const [entidades, setEntidades] = useState('')
    const [files, setFiles] = useState<File[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const allowed = ['image/png', 'image/jpeg', 'application/pdf']

    const addFiles = (incoming: FileList | null) => {
        if (!incoming) return
        const newFiles: File[] = []
        for (let i = 0; i < incoming.length; i++) {
            const f = incoming[i]
            if (!allowed.includes(f.type)) {
                setError(`"${f.name}" no es un formato válido. Solo PNG, JPG o PDF.`)
                return
            }
            if (f.size > 20 * 1024 * 1024) {
                setError(`"${f.name}" supera el límite de 20 MB.`)
                return
            }
            // Avoid duplicates by name
            if (!files.some(existing => existing.name === f.name && existing.size === f.size)) {
                newFiles.push(f)
            }
        }
        setError('')
        setFiles(prev => [...prev, ...newFiles])
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        addFiles(e.target.files)
        // Reset input so same file can be added again after removal
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        addFiles(e.dataTransfer.files)
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        if (!nombre.trim() || !telefono.trim() || !entidades.trim()) {
            setError('Por favor completa todos los campos.')
            return
        }

        setLoading(true)
        setError('')

        try {
            const urls: string[] = []
            const nombres: string[] = []

            // Upload all files to Supabase Storage
            for (const file of files) {
                const ext = file.name.split('.').pop()
                const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from('desprendibles')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                const { data: urlData } = supabase.storage
                    .from('desprendibles')
                    .getPublicUrl(fileName)

                if (urlData?.publicUrl) urls.push(urlData.publicUrl)
                nombres.push(file.name)
            }

            const { error: insertError } = await supabase
                .from('approval_requests')
                .insert({
                    nombre_cliente: nombre.trim(),
                    telefono: telefono.trim(),
                    entidades_reporte: entidades.trim(),
                    desprendible_url: urls.length > 0 ? urls.join('|||') : null,
                    desprendible_nombre: nombres.length > 0 ? nombres.join('|||') : null,
                    asesor_id: user.id,
                    asesor_nombre: profile?.full_name || user.email || 'Asesor',
                    estado: 'pendiente_aprobacion',
                })

            if (insertError) throw insertError

            setSuccess(true)
            setNombre('')
            setTelefono('')
            setEntidades('')
            setFiles([])
            onSuccess()
            setTimeout(() => setSuccess(false), 4000)
        } catch (err: any) {
            console.error(err)
            setError(err?.message || 'Error al enviar la solicitud.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Success Banner */}
            {success && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <p className="font-medium">¡Solicitud enviada exitosamente! Quedará pendiente de aprobación.</p>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Nombre */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                        <span className="flex items-center gap-2 mb-1.5">
                            <User className="h-4 w-4 text-primary-500" />
                            Nombre completo del cliente
                        </span>
                    </label>
                    <input
                        type="text"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        placeholder="Ej: Carlos Rodríguez Pérez"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                </div>

                {/* Teléfono */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                        <span className="flex items-center gap-2 mb-1.5">
                            <Phone className="h-4 w-4 text-primary-500" />
                            Número de teléfono
                        </span>
                    </label>
                    <input
                        type="tel"
                        value={telefono}
                        onChange={e => setTelefono(e.target.value)}
                        placeholder="Ej: 3001234567"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                </div>
            </div>

            {/* Entidades reportado */}
            <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                    <span className="flex items-center gap-2 mb-1.5">
                        <Building2 className="h-4 w-4 text-primary-500" />
                        Entidades en las que se encuentra reportado
                    </span>
                </label>
                <textarea
                    value={entidades}
                    onChange={e => setEntidades(e.target.value)}
                    placeholder="Ej: Bancolombia, Davivienda, Datacrédito..."
                    required
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
                />
            </div>

            {/* File Upload */}
            <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                    <span className="flex items-center gap-2 mb-1.5">
                        <FileBadge className="h-4 w-4 text-primary-500" />
                        Desprendibles de pago <span className="text-gray-400 font-normal">(PNG, JPG o PDF · máx. 20 MB c/u)</span>
                    </span>
                </label>

                {/* Drop Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 hover:border-primary-400 bg-gray-50 hover:bg-primary-50/30 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group"
                >
                    <Upload className="h-9 w-9 text-gray-300 group-hover:text-primary-400 mx-auto mb-2 transition-colors" />
                    <p className="text-sm font-medium text-gray-700">
                        Arrastra archivos aquí o{' '}
                        <span className="text-primary-600 underline underline-offset-2">haz clic para seleccionar</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Puedes agregar varios archivos PNG, JPG o PDF</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <ul className="mt-3 space-y-2">
                        {files.map((f, idx) => {
                            const isPdf = f.type === 'application/pdf'
                            const previewUrl = !isPdf ? URL.createObjectURL(f) : null
                            return (
                                <li
                                    key={idx}
                                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl"
                                >
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt={f.name}
                                            className="h-10 w-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                                        />
                                    ) : (
                                        <FileImage className="h-10 w-10 text-primary-400 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{f.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {(f.size / 1024).toFixed(1)} KB · {isPdf ? 'PDF' : 'Imagen'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(idx)}
                                        className="p-1.5 bg-white rounded-full shadow border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Enviando...</>
                    ) : (
                        <><Upload className="h-4 w-4" /> Enviar solicitud</>
                    )}
                </button>
            </div>
        </form>
    )
}

// ─── Comments Thread ──────────────────────────────────────────

function CommentsThread({ requestId }: { requestId: string }) {
    const { user, profile } = useAuth()
    const [comments, setComments] = useState<ApprovalComment[]>([])
    const [loading, setLoading] = useState(true)
    const [text, setText] = useState('')
    const [files, setFiles] = useState<File[]>([])
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const textRef = useRef<HTMLTextAreaElement>(null)

    const isEvaluador = profile?.role === 'evaluador' || profile?.role === 'admin'

    const loadComments = async () => {
        const { data } = await supabase
            .from('approval_comments')
            .select('*')
            .eq('approval_request_id', requestId)
            .order('created_at', { ascending: true })
        setComments(data || [])
        setLoading(false)
    }

    useEffect(() => { loadComments() }, [requestId])

    const addFiles = (incoming: FileList | null) => {
        if (!incoming) return
        const allowed = ['image/png', 'image/jpeg', 'application/pdf']
        const newFiles: File[] = []
        for (let i = 0; i < incoming.length; i++) {
            const f = incoming[i]
            if (!allowed.includes(f.type)) { setError(`"${f.name}" no es válido. Solo PNG, JPG o PDF.`); return }
            if (f.size > 20 * 1024 * 1024) { setError(`"${f.name}" supera 20 MB.`); return }
            if (!files.some(e => e.name === f.name && e.size === f.size)) newFiles.push(f)
        }
        setError('')
        setFiles(prev => [...prev, ...newFiles])
        if (fileRef.current) fileRef.current.value = ''
    }

    const handleSend = async () => {
        if (!user || (!text.trim() && files.length === 0)) return
        setSending(true)
        setError('')
        try {
            const urls: string[] = []
            const nombres: string[] = []
            for (const f of files) {
                const ext = f.name.split('.').pop()
                const fileName = `comments/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from('desprendibles')
                    .upload(fileName, f)
                if (uploadError) throw uploadError
                const { data: urlData } = supabase.storage.from('desprendibles').getPublicUrl(fileName)
                if (urlData?.publicUrl) urls.push(urlData.publicUrl)
                nombres.push(f.name)
            }

            const { error: insertError } = await supabase
                .from('approval_comments')
                .insert({
                    approval_request_id: requestId,
                    author_id: user.id,
                    author_nombre: profile?.full_name || user.email || 'Usuario',
                    author_role: profile?.role || 'asesor',
                    contenido: text.trim() || null,
                    archivos_url: urls.length > 0 ? urls.join('|||') : null,
                    archivos_nombre: nombres.length > 0 ? nombres.join('|||') : null,
                })
            if (insertError) throw insertError

            setText('')
            setFiles([])
            await loadComments()
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        } catch (err: any) {
            setError(err?.message || 'Error al enviar el mensaje.')
        } finally {
            setSending(false)
        }
    }

    // Auto-resize textarea
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value)
        if (textRef.current) {
            textRef.current.style.height = 'auto'
            textRef.current.style.height = Math.min(textRef.current.scrollHeight, 96) + 'px'
        }
    }

    if (loading) return (
        <div className="border-t border-gray-100 flex items-center justify-center py-5">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
        </div>
    )

    return (
        <div className="border-t border-gray-100">
            {/* Thread messages */}
            {comments.length > 0 && (
                <div className="px-5 pt-4 pb-2 space-y-4 max-h-72 overflow-y-auto">
                    {comments.map(c => {
                        const isMe = c.author_id === user?.id
                        const isEval = c.author_role === 'evaluador' || c.author_role === 'admin'
                        const archUrls = c.archivos_url ? c.archivos_url.split('|||') : []
                        const archNombres = c.archivos_nombre ? c.archivos_nombre.split('|||') : []
                        return (
                            <div key={c.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${isEval ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'}`}>
                                    {(c.author_nombre || 'U').charAt(0).toUpperCase()}
                                </div>
                                {/* Bubble */}
                                <div className={`max-w-[78%] space-y-1 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <span className="text-xs font-semibold text-gray-700">{c.author_nombre}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                                            isEval ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-primary-50 text-primary-700 border-primary-200'
                                        }`}>
                                            {isEval ? 'Evaluador' : 'Asesor'}
                                        </span>
                                    </div>
                                    {c.contenido && (
                                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                            isMe
                                                ? 'bg-primary-600 text-white rounded-tr-sm'
                                                : isEval
                                                    ? 'bg-amber-50 border border-amber-100 text-amber-900 rounded-tl-sm'
                                                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                                        }`}>
                                            {c.contenido}
                                        </div>
                                    )}
                                    {/* File attachments */}
                                    {archUrls.map((url, idx) => {
                                        const nombre = archNombres[idx] || `Archivo ${idx + 1}`
                                        const esImagen = !nombre.toLowerCase().endsWith('.pdf')
                                        return esImagen ? (
                                            <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
                                                <img src={url} alt={nombre} className="max-h-36 rounded-xl border border-gray-200 object-cover hover:opacity-90 transition-opacity" />
                                            </a>
                                        ) : (
                                            <a key={idx} href={url} target="_blank" rel="noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-primary-700 font-medium hover:bg-gray-50 transition-colors"
                                            >
                                                <FileImage className="h-3.5 w-3.5 flex-shrink-0" />
                                                <span className="truncate max-w-[140px]">{nombre}</span>
                                            </a>
                                        )
                                    })}
                                    <p className="text-[10px] text-gray-400">{formatDate(c.created_at)}</p>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={bottomRef} />
                </div>
            )}

            {comments.length === 0 && (
                <div className="px-5 py-5 text-center">
                    <MessageSquare className="h-7 w-7 text-gray-200 mx-auto mb-1.5" />
                    <p className="text-xs text-gray-400">Sin mensajes aún. Sé el primero en escribir.</p>
                </div>
            )}

            {/* Reply form */}
            <div className="px-5 pb-4 space-y-2">
                {error && <p className="text-xs text-red-600">{error}</p>}

                {/* Attached files preview */}
                {files.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {files.map((f, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-700">
                                <FileImage className="h-3.5 w-3.5 text-primary-500 flex-shrink-0" />
                                <span className="max-w-[100px] truncate">{f.name}</span>
                                <button type="button" onClick={() => setFiles(p => p.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 ml-0.5">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Input row */}
                <div className="flex items-end gap-2">
                    <div className="flex-1 flex items-end gap-2 border border-gray-200 rounded-2xl px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-primary-400 focus-within:border-primary-400 transition-all">
                        <textarea
                            ref={textRef}
                            value={text}
                            onChange={handleTextChange}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                            placeholder={isEvaluador ? 'Escribe una anotación al asesor...' : 'Responde al evaluador...'}
                            rows={1}
                            style={{ height: '24px' }}
                            className="flex-1 resize-none text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400 overflow-y-auto leading-6"
                        />
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="p-1 text-gray-400 hover:text-primary-500 transition-colors flex-shrink-0 mb-0.5"
                            title="Adjuntar archivo"
                        >
                            <Paperclip className="h-4 w-4" />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending || (!text.trim() && files.length === 0)}
                        className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-100 text-white disabled:text-gray-400 rounded-2xl transition-all flex-shrink-0 shadow-sm hover:shadow"
                    >
                        {sending
                            ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            : <Send className="h-4 w-4" />}
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.pdf"
                        className="hidden"
                        onChange={e => addFiles(e.target.files)}
                    />
                </div>
                <p className="text-[10px] text-gray-400 pl-1">Enter para enviar · Shift+Enter nueva línea · <Paperclip className="h-2.5 w-2.5 inline" /> PNG, JPG o PDF</p>
            </div>
        </div>
    )
}

// ─── Approval Card ────────────────────────────────────────────

function ApprovalCard({
    req,
    isEvaluador,
    onUpdate,
}: {
    req: ApprovalRequest
    isEvaluador: boolean
    onUpdate: () => void
}) {
    const { user, profile } = useAuth()
    const [updating, setUpdating] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showNota, setShowNota] = useState(false)
    const [nota, setNota] = useState(req.notas_evaluador || '')
    const [showImageModal, setShowImageModal] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const badge = getEstadoBadge(req.estado)

    // Support multiple files stored as '|||'-separated values
    const desprendibleUrls = req.desprendible_url ? req.desprendible_url.split('|||') : []
    const desprendibleNombres = req.desprendible_nombre ? req.desprendible_nombre.split('|||') : []
    const isPdf = req.desprendible_nombre?.toLowerCase().endsWith('.pdf')

    const handleDelete = async () => {
        if (!confirm('¿Seguro que deseas eliminar esta solicitud de aprobación? Esta acción no se puede deshacer.')) return;
        setDeleting(true)
        try {
            const { error } = await supabase
                .from('approval_requests')
                .delete()
                .eq('id', req.id);

            if (error) throw error;
            onUpdate();
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message);
        } finally {
            setDeleting(false);
        }
    }

    const handleStatusChange = async (nuevoEstado: 'aprobado' | 'descartado') => {
        if (!user) return
        setUpdating(true)
        try {
            const { error } = await supabase
                .from('approval_requests')
                .update({
                    estado: nuevoEstado,
                    evaluador_id: user.id,
                    evaluador_nombre: profile?.full_name || user.email || 'Evaluador',
                    fecha_evaluacion: new Date().toISOString(),
                    notas_evaluador: nota || null,
                })
                .eq('id', req.id)

            if (error) throw error
            onUpdate()
        } catch (err: any) {
            alert('Error al actualizar: ' + err.message)
        } finally {
            setUpdating(false)
        }
    }

    return (
        <>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div>
                        <h3 className="font-bold text-gray-900 text-base capitalize">{req.nombre_cliente.toLowerCase()}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(req.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.classes}`}>
                            {badge.icon} {badge.label}
                        </span>
                        {(isEvaluador || req.asesor_id === user?.id) && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar solicitud"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-start gap-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-gray-800 font-semibold">{req.telefono}</p>
                                    <a
                                        href={getWhatsAppUrl(req.telefono)}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Abrir WhatsApp"
                                        className="flex items-center gap-1 px-2 py-0.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-[10px] font-bold rounded-full transition-colors shadow-sm flex-shrink-0"
                                    >
                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.115 1.533 5.843L.057 23.57a.75.75 0 0 0 .92.92l5.635-1.476A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.718 9.718 0 0 1-4.946-1.348l-.355-.21-3.676.963.982-3.585-.23-.368A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                                        </svg>
                                        WhatsApp
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                            <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asesor</p>
                                <p className="text-gray-800">{req.asesor_nombre || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reportado en</p>
                            <p className="text-gray-800">{req.entidades_reporte}</p>
                        </div>
                    </div>

                    {/* Desprendibles (soporta múltiples) */}
                    {desprendibleUrls.length > 0 && (
                        <div className="mt-1 space-y-2">
                            {desprendibleUrls.map((url, idx) => {
                                const nombre = desprendibleNombres[idx] || `Archivo ${idx + 1}`
                                const esImagen = !nombre.toLowerCase().endsWith('.pdf')
                                return esImagen ? (
                                    <button
                                        key={idx}
                                        onClick={() => setShowImageModal(true)}
                                        className="flex items-center gap-2 w-full group relative"
                                    >
                                        <img
                                            src={url}
                                            alt={nombre}
                                            className="h-20 w-full object-cover rounded-lg border border-gray-200 group-hover:opacity-80 transition-opacity"
                                        />
                                        <span className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-1 text-white text-xs bg-black/40 rounded-lg">
                                            <Eye className="h-3.5 w-3.5" /> {nombre}
                                        </span>
                                    </button>
                                ) : (
                                    <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm text-primary-700 font-medium"
                                    >
                                        <FileImage className="h-4 w-4" />
                                        {nombre}
                                    </a>
                                )
                            })}
                        </div>
                    )}

                    {/* Notas evaluador */}
                    {req.notas_evaluador && (
                        <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
                            <p className="font-semibold text-xs text-yellow-600 uppercase tracking-wide mb-0.5">Nota del evaluador</p>
                            {req.notas_evaluador}
                        </div>
                    )}

                    {/* Evaluador info */}
                    {req.evaluador_nombre && (
                        <p className="text-xs text-gray-400">
                            Evaluado por <span className="font-medium text-gray-600">{req.evaluador_nombre}</span>
                            {req.fecha_evaluacion && ` · ${formatDate(req.fecha_evaluacion)}`}
                        </p>
                    )}
                </div>

                {/* Evaluador Actions */}
                {isEvaluador && req.estado === 'pendiente_aprobacion' && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-3">
                        {/* Nota opcional */}
                        <div>
                            <button
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                                onClick={() => setShowNota(v => !v)}
                            >
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showNota ? 'rotate-180' : ''}`} />
                                {showNota ? 'Ocultar nota' : 'Agregar nota (opcional)'}
                            </button>
                            {showNota && (
                                <textarea
                                    value={nota}
                                    onChange={e => setNota(e.target.value)}
                                    placeholder="Observaciones del evaluador..."
                                    rows={2}
                                    className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                disabled={updating}
                                onClick={() => handleStatusChange('aprobado')}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <CheckCircle2 className="h-4 w-4" /> Aprobar
                            </button>
                            <button
                                disabled={updating}
                                onClick={() => handleStatusChange('descartado')}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <XCircle className="h-4 w-4" /> Descartar
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Conversación toggle ── */}
                <button
                    type="button"
                    onClick={() => setShowComments(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                    <span className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Conversación
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showComments ? 'rotate-180' : ''}`} />
                </button>
                {showComments && <CommentsThread requestId={req.id} />}
            </div>

            {/* Image Modal — muestra todas las imágenes */}
            {showImageModal && desprendibleUrls.some((u, i) => !desprendibleNombres[i]?.toLowerCase().endsWith('.pdf')) && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setShowImageModal(false)}
                >
                    <div className="relative max-w-3xl w-full space-y-4" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute -top-4 -right-4 bg-white rounded-full p-1.5 shadow-lg hover:bg-red-50 z-10"
                        >
                            <X className="h-5 w-5 text-gray-700" />
                        </button>
                        {desprendibleUrls.map((url, idx) => {
                            const nombre = desprendibleNombres[idx] || `Archivo ${idx + 1}`
                            if (nombre.toLowerCase().endsWith('.pdf')) return null
                            return (
                                <div key={idx}>
                                    <img
                                        src={url}
                                        alt={nombre}
                                        className="w-full rounded-2xl shadow-2xl max-h-[70vh] object-contain bg-white"
                                    />
                                    <p className="text-center text-white/60 text-sm mt-2">{req.nombre_cliente} · {nombre}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </>
    )
}

// ─── Main Page ────────────────────────────────────────────────

export default function AprobacionPage() {
    const { user, profile } = useAuth()
    const [requests, setRequests] = useState<ApprovalRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [filterEstado, setFilterEstado] = useState<'todos' | 'pendiente_aprobacion' | 'aprobado' | 'descartado'>('todos')

    const isEvaluador = profile?.role === 'evaluador' || profile?.role === 'admin'

    const loadRequests = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('approval_requests')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setRequests(data || [])
        } catch (err) {
            console.error('Error cargando solicitudes:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) loadRequests()
    }, [user])

    const filtered = filterEstado === 'todos'
        ? requests
        : requests.filter(r => r.estado === filterEstado)

    const counts = {
        todos: requests.length,
        pendiente_aprobacion: requests.filter(r => r.estado === 'pendiente_aprobacion').length,
        aprobado: requests.filter(r => r.estado === 'aprobado').length,
        descartado: requests.filter(r => r.estado === 'descartado').length,
    }

    return (
        <DashboardLayout
            title="Aprobación de Prospectos"
            subtitle={`Sistema de evaluación y aprobación de clientes · ${requests.length} solicitudes`}
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="space-y-8">

                {/* ── Upload Form (solo asesores / todos los usuarios) ── */}
                <Card>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-primary-100 rounded-xl">
                            <Upload className="h-5 w-5 text-primary-700" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Enviar nueva solicitud</h2>
                            <p className="text-sm text-gray-500">Sube el desprendible e información del prospecto para evaluación</p>
                        </div>
                    </div>
                    <UploadForm onSuccess={loadRequests} />
                </Card>

                {/* ── Solicitudes List ── */}
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-100 rounded-xl">
                                <ShieldCheck className="h-5 w-5 text-amber-700" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Solicitudes de aprobación</h2>
                                <p className="text-sm text-gray-500">
                                    {isEvaluador
                                        ? 'Como evaluador, puedes aprobar o descartar cada solicitud'
                                        : 'Historial de solicitudes enviadas'}
                                </p>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
                            {([
                                { key: 'todos', label: 'Todos' },
                                { key: 'pendiente_aprobacion', label: 'Pendientes' },
                                { key: 'aprobado', label: 'Aprobados' },
                                { key: 'descartado', label: 'Descartados' },
                            ] as const).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilterEstado(tab.key)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterEstado === tab.key
                                        ? 'bg-white shadow text-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {tab.label}
                                    <span className={`inline-block min-w-[18px] text-center px-1 py-0.5 rounded-full text-[10px] ${filterEstado === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'}`}>
                                        {counts[tab.key]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Sin solicitudes</h3>
                            <p className="text-gray-500 text-sm max-w-xs mx-auto">
                                {filterEstado === 'todos'
                                    ? 'Aún no hay solicitudes de aprobación enviadas.'
                                    : `No hay solicitudes con estado "${filterEstado.replace('_', ' ')}".`}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {filtered.map(req => (
                                <ApprovalCard
                                    key={req.id}
                                    req={req}
                                    isEvaluador={isEvaluador}
                                    onUpdate={loadRequests}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
