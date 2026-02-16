'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, Alert } from '@/components/ui'
import { Mail, Lock, User, Phone, Building, Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
    const { register } = useAuth()
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        companyName: '',
        password: '',
        confirmPassword: '',
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden')
            setLoading(false)
            return
        }

        // Validate password length
        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            setLoading(false)
            return
        }

        const { error } = await register({
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            phone: formData.phone || undefined,
            companyName: formData.companyName || undefined,
        })

        if (error) {
            setError(error)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-6">
                    <Image
                        src="/images/logo/logo-main.png"
                        alt="CREDITCOL"
                        width={200}
                        height={60}
                        className="mx-auto"
                        priority
                    />
                    <p className="mt-3 text-gray-300">
                        Crea tu cuenta
                    </p>
                </div>

                {/* Register Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
                        Registro
                    </h2>

                    {error && (
                        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Nombre completo"
                            type="text"
                            name="fullName"
                            placeholder="Juan Pérez"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                            icon={<User className="h-5 w-5" />}
                        />

                        <Input
                            label="Correo electrónico"
                            type="email"
                            name="email"
                            placeholder="tu@email.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            icon={<Mail className="h-5 w-5" />}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Teléfono"
                                type="tel"
                                name="phone"
                                placeholder="+57 300..."
                                value={formData.phone}
                                onChange={handleChange}
                                icon={<Phone className="h-5 w-5" />}
                            />

                            <Input
                                label="Empresa"
                                type="text"
                                name="companyName"
                                placeholder="Tu empresa"
                                value={formData.companyName}
                                onChange={handleChange}
                                icon={<Building className="h-5 w-5" />}
                            />
                        </div>

                        <div className="relative">
                            <Input
                                label="Contraseña"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                icon={<Lock className="h-5 w-5" />}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        <Input
                            label="Confirmar contraseña"
                            type="password"
                            name="confirmPassword"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            icon={<Lock className="h-5 w-5" />}
                        />

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                loading={loading}
                            >
                                Crear cuenta
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            ¿Ya tienes una cuenta?{' '}
                            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                                Inicia sesión
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-gray-400 text-sm">
                    Al registrarte, aceptas nuestros términos y condiciones.
                </p>
            </div>
        </div>
    )
}
