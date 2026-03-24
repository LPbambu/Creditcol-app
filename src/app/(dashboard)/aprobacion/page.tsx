'use client'

import { useEffect, useState, useRef } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, Button, Modal } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { ApprovalRequest } from '@/lib/supabase/types'
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

// ─── Upload Form ─────────────────────────────────────────────

function UploadForm({ onSuccess }: { onSuccess: () => void }) {
    const { user, profile } = useAuth()
    const [nombre, setNombre] = useState('')
    const [telefono, setTelefono] = useState('')
    const [entidades, setEntidades] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return
        const allowed = ['image/png', 'image/jpeg', 'application/pdf']
        if (!allowed.includes(f.type)) {
            setError('Solo se permiten archivos PNG, JPG o PDF.')
            return
        }
        if (f.size > 10 * 1024 * 1024) {
            setError('El archivo no puede superar 10 MB.')
            return
        }
        setFile(f)
        setError('')
        if (f.type !== 'application/pdf') {
            const url = URL.createObjectURL(f)
            setPreview(url)
        } else {
            setPreview('pdf')
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const f = e.dataTransfer.files?.[0]
        if (f) {
            const fakeEvent = { target: { files: [f] } } as any
            handleFileChange(fakeEvent)
        }
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
            let desprendible_url: string | null = null
            let desprendible_nombre: string | null = null

            // Upload file to Supabase Storage if provided
            if (file) {
                const ext = file.name.split('.').pop()
                const fileName = `${user.id}/${Date.now()}.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from('desprendibles')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                const { data: urlData } = supabase.storage
                    .from('desprendibles')
                    .getPublicUrl(fileName)

                desprendible_url = urlData?.publicUrl || null
                desprendible_nombre = file.name
            }

            const { error: insertError } = await supabase
                .from('approval_requests')
                .insert({
                    nombre_cliente: nombre.trim(),
                    telefono: telefono.trim(),
                    entidades_reporte: entidades.trim(),
                    desprendible_url,
                    desprendible_nombre,
                    asesor_id: user.id,
                    asesor_nombre: profile?.full_name || user.email || 'Asesor',
                    estado: 'pendiente_aprobacion',
                })

            if (insertError) throw insertError

            setSuccess(true)
            setNombre('')
            setTelefono('')
            setEntidades('')
            setFile(null)
            setPreview(null)
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
                        Desprendible de pago <span className="text-gray-400 font-normal">(PNG, JPG o PDF · máx. 10 MB)</span>
                    </span>
                </label>

                {!file ? (
                    <div
                        onDrop={handleDrop}
                        onDragOver={e => e.preventDefault()}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 hover:border-primary-400 bg-gray-50 hover:bg-primary-50/30 rounded-xl p-10 text-center cursor-pointer transition-all duration-200 group"
                    >
                        <Upload className="h-10 w-10 text-gray-300 group-hover:text-primary-400 mx-auto mb-3 transition-colors" />
                        <p className="text-sm font-medium text-gray-700">Arrastra el archivo aquí o <span className="text-primary-600 underline underline-offset-2">haz clic para seleccionar</span></p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".png,.jpg,.jpeg,.pdf"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                ) : (
                    <div className="relative rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                        {preview && preview !== 'pdf' ? (
                            <img src={preview} alt="Desprendible" className="w-full max-h-64 object-contain p-2" />
                        ) : (
                            <div className="flex items-center gap-3 p-4">
                                <FileImage className="h-10 w-10 text-primary-500 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB · PDF</p>
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => { setFile(null); setPreview(null) }}
                            className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
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
    const [showNota, setShowNota] = useState(false)
    const [nota, setNota] = useState(req.notas_evaluador || '')
    const [showImageModal, setShowImageModal] = useState(false)
    const badge = getEstadoBadge(req.estado)

    const isPdf = req.desprendible_nombre?.toLowerCase().endsWith('.pdf')

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
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.classes}`}>
                        {badge.icon} {badge.label}
                    </span>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-start gap-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</p>
                                <p className="text-gray-800 font-semibold">{req.telefono}</p>
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

                    {/* Desprendible */}
                    {req.desprendible_url && (
                        <div className="mt-1">
                            {!isPdf ? (
                                <button
                                    onClick={() => setShowImageModal(true)}
                                    className="flex items-center gap-2 w-full group"
                                >
                                    <img
                                        src={req.desprendible_url}
                                        alt="Desprendible"
                                        className="h-20 w-full object-cover rounded-lg border border-gray-200 group-hover:opacity-80 transition-opacity"
                                    />
                                    <span className="absolute hidden group-hover:flex items-center gap-1 text-white text-xs bg-black/60 px-2 py-1 rounded">
                                        <Eye className="h-3 w-3" /> Ver
                                    </span>
                                </button>
                            ) : (
                                <a
                                    href={req.desprendible_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm text-primary-700 font-medium"
                                >
                                    <FileImage className="h-4 w-4" />
                                    {req.desprendible_nombre || 'Ver PDF'}
                                </a>
                            )}
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
            </div>

            {/* Image Modal */}
            {showImageModal && req.desprendible_url && !isPdf && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setShowImageModal(false)}
                >
                    <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute -top-4 -right-4 bg-white rounded-full p-1.5 shadow-lg hover:bg-red-50"
                        >
                            <X className="h-5 w-5 text-gray-700" />
                        </button>
                        <img
                            src={req.desprendible_url}
                            alt="Desprendible"
                            className="w-full rounded-2xl shadow-2xl max-h-[80vh] object-contain bg-white"
                        />
                        <p className="text-center text-white/60 text-sm mt-3">{req.nombre_cliente} · {req.desprendible_nombre}</p>
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
