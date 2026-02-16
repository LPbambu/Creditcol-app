'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardTitle, CardContent, Button, Input, Alert } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/authService'
import {
    User,
    Save,
    Lock,
    Bell,
    Globe,
    Key
} from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
    const { user, profile, refreshProfile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        company_name: '',
    })

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                phone: profile.phone || '',
                company_name: profile.company_name || '',
            })
        }
    }, [profile])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            const { error } = await authService.updateProfile(user.id, formData)

            if (error) throw new Error(error)

            await refreshProfile()
            setSuccess(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const settingsLinks = [
        {
            href: '/settings/profile',
            icon: <User className="h-5 w-5" />,
            title: 'Perfil',
            description: 'Actualiza tu información personal',
            active: true,
        },
        {
            href: '/settings/whatsapp',
            icon: <Key className="h-5 w-5" />,
            title: 'WhatsApp API',
            description: 'Configura tu integración de WhatsApp',
        },

    ]

    return (
        <DashboardLayout
            title="Configuración"
            subtitle="Administra tu cuenta y preferencias"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Settings Menu */}
                <div className="space-y-2">
                    {settingsLinks.map((link) => (
                        <Link
                            key={link.title}
                            href={link.href}
                            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group ${link.active
                                ? 'bg-white shadow-md border-l-4 border-primary-600'
                                : 'hover:bg-white hover:shadow-sm text-gray-600'
                                }`}
                        >
                            <div className={`p-2.5 rounded-lg transition-colors ${link.active ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500 group-hover:bg-primary-50 group-hover:text-primary-500'
                                }`}>
                                {link.icon}
                            </div>
                            <div>
                                <p className={`font-semibold ${link.active ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                                    }`}>
                                    {link.title}
                                </p>
                                <p className="text-xs text-gray-500">{link.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Profile Form */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardTitle>Información del Perfil</CardTitle>
                        <CardContent className="mt-4">
                            {success && (
                                <Alert type="success" className="mb-6" dismissible onDismiss={() => setSuccess(false)}>
                                    Perfil actualizado correctamente
                                </Alert>
                            )}

                            {error && (
                                <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
                                    {error}
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="flex items-center gap-6 mb-6">
                                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary-500 to-secondary-800 flex items-center justify-center text-white text-2xl font-bold">
                                        {formData.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{formData.full_name || 'Usuario'}</p>
                                        <p className="text-gray-500">{profile?.email}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Nombre completo"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        icon={<User className="h-5 w-5" />}
                                    />

                                    <Input
                                        label="Teléfono"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+57 300..."
                                    />

                                    <Input
                                        label="Empresa"
                                        name="company_name"
                                        value={formData.company_name}
                                        onChange={handleChange}
                                        className="md:col-span-2"
                                    />
                                </div>

                                <div className="flex justify-end pt-4 border-t">
                                    <Button type="submit" loading={loading} icon={<Save className="h-4 w-4" />}>
                                        Guardar cambios
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    )
}
