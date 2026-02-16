'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardTitle, CardContent, Button, Input, Alert } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase, type WhatsAppConfig } from '@/lib/supabase'
import {
    Save,
    Eye,
    EyeOff,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    MessageSquare
} from 'lucide-react'

export default function WhatsAppSettingsPage() {
    const { user, profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [testing, setTesting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showCredentials, setShowCredentials] = useState(false)
    const [config, setConfig] = useState<WhatsAppConfig | null>(null)

    const [formData, setFormData] = useState({
        provider: 'twilio' as 'twilio' | 'whatsapp-business' | 'other',
        account_sid: '',
        auth_token: '',
        phone_number_id: '',
        daily_message_limit: 1000,
    })

    useEffect(() => {
        if (user) {
            loadConfig()
        }
    }, [user])

    const loadConfig = async () => {
        if (!user) return

        const { data } = await supabase
            .from('whatsapp_config')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (data) {
            setConfig(data)
            setFormData({
                provider: data.provider,
                account_sid: data.account_sid || '',
                auth_token: data.auth_token || '',
                phone_number_id: data.phone_number_id || '',
                daily_message_limit: data.daily_message_limit,
            })
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        setSuccess(false)

        try {
            if (config) {
                // Update existing config
                const { error: updateError } = await supabase
                    .from('whatsapp_config')
                    .update({
                        provider: formData.provider,
                        account_sid: formData.account_sid,
                        auth_token: formData.auth_token,
                        phone_number_id: formData.phone_number_id,
                        daily_message_limit: formData.daily_message_limit,
                    })
                    .eq('id', config.id)

                if (updateError) throw updateError
            } else {
                // Create new config
                const { error: insertError } = await supabase
                    .from('whatsapp_config')
                    .insert({
                        user_id: user.id,
                        provider: formData.provider,
                        account_sid: formData.account_sid,
                        auth_token: formData.auth_token,
                        phone_number_id: formData.phone_number_id,
                        daily_message_limit: formData.daily_message_limit,
                    })

                if (insertError) throw insertError
            }

            await loadConfig()
            setSuccess(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const testConnection = async () => {
        if (!user) return

        setTesting(true)
        setError(null)
        setSuccess(false)

        try {
            const response = await fetch('/api/whatsapp/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al verificar la conexión')
            }

            // Reload config to show updated verification status
            await loadConfig()
            setSuccess(true)
        } catch (err: any) {
            setError(err.message || 'Error al verificar la conexión')
        } finally {
            setTesting(false)
        }
    }

    return (
        <DashboardLayout
            title="Configuración de WhatsApp"
            subtitle="Conecta tu cuenta de Twilio o WhatsApp Business"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="max-w-2xl mx-auto">
                {success && (
                    <Alert type="success" className="mb-6" dismissible onDismiss={() => setSuccess(false)}>
                        Configuración guardada correctamente
                    </Alert>
                )}

                {error && (
                    <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Status Card */}
                {config && (
                    <Card className="mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${config.is_verified ? 'bg-green-100' : 'bg-yellow-100'
                                    }`}>
                                    {config.is_verified ? (
                                        <CheckCircle className="h-6 w-6 text-green-600" />
                                    ) : (
                                        <AlertCircle className="h-6 w-6 text-yellow-600" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {config.is_verified ? 'WhatsApp Conectado' : 'Pendiente de Verificación'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Proveedor: {config.provider.toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                onClick={testConnection}
                                loading={testing}
                                icon={<RefreshCw className="h-4 w-4" />}
                            >
                                Verificar
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Configuration Form */}
                <Card>
                    <CardTitle>Credenciales de API</CardTitle>
                    <CardContent className="mt-4">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Provider Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Proveedor
                                </label>
                                <select
                                    name="provider"
                                    value={formData.provider}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="twilio">Twilio</option>
                                    <option value="whatsapp-business">WhatsApp Business API</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>

                            {formData.provider === 'twilio' && (
                                <>
                                    <Input
                                        label="Account SID"
                                        name="account_sid"
                                        type={showCredentials ? 'text' : 'password'}
                                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        value={formData.account_sid}
                                        onChange={handleChange}
                                        required
                                    />

                                    <div className="relative">
                                        <Input
                                            label="Auth Token"
                                            name="auth_token"
                                            type={showCredentials ? 'text' : 'password'}
                                            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            value={formData.auth_token}
                                            onChange={handleChange}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCredentials(!showCredentials)}
                                            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                                        >
                                            {showCredentials ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>

                                    <Input
                                        label="Número de WhatsApp"
                                        name="phone_number_id"
                                        placeholder="+1234567890"
                                        value={formData.phone_number_id}
                                        onChange={handleChange}
                                        helperText="El número de WhatsApp registrado en Twilio"
                                    />
                                </>
                            )}

                            <Input
                                label="Límite diario de mensajes"
                                name="daily_message_limit"
                                type="number"
                                value={formData.daily_message_limit}
                                onChange={handleChange}
                                min={1}
                                max={10000}
                                helperText="Protección contra envíos excesivos"
                            />

                            <div className="flex justify-end pt-4 border-t">
                                <Button type="submit" loading={loading} icon={<Save className="h-4 w-4" />}>
                                    Guardar Configuración
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Help Section */}
                <Card className="mt-6">
                    <CardTitle>¿Cómo obtener las credenciales?</CardTitle>
                    <CardContent className="mt-4">
                        <div className="space-y-4 text-sm text-gray-600">
                            <div className="flex items-start gap-3">
                                <div className="p-1 bg-blue-100 rounded text-blue-600 font-bold text-xs">1</div>
                                <p>
                                    Crea una cuenta en{' '}
                                    <a href="https://www.twilio.com" target="_blank" rel="noopener" className="text-primary-600 hover:underline">
                                        Twilio.com
                                    </a>
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-1 bg-blue-100 rounded text-blue-600 font-bold text-xs">2</div>
                                <p>
                                    Activa WhatsApp Sandbox o configura un número de producción
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-1 bg-blue-100 rounded text-blue-600 font-bold text-xs">3</div>
                                <p>
                                    Copia el Account SID y Auth Token desde la consola de Twilio
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-1 bg-blue-100 rounded text-blue-600 font-bold text-xs">4</div>
                                <p>
                                    Ingresa las credenciales aquí y verifica la conexión
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
