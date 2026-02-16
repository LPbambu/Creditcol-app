'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, Alert } from '@/components/ui'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await login(email, password)

        if (error) {
            setError(error)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-block relative">
                        {/* Glow effect behind logo */}
                        <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full" />
                        <Image
                            src="/images/logo/logo-main.png"
                            alt="CREDITCOL"
                            width={240}
                            height={80}
                            className="mx-auto relative z-10 drop-shadow-lg"
                            priority
                        />
                    </div>
                    <p className="mt-6 text-gray-300 font-medium tracking-wide">
                        Sistema de Automatización WhatsApp
                    </p>
                </div>

                {/* Login Form */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 animate-fadeIn border border-white/20">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">
                        Bienvenido
                    </h2>
                    <p className="text-center text-gray-500 mb-8">
                        Ingresa tus credenciales para continuar
                    </p>

                    {error && (
                        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Correo electrónico"
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            icon={<Mail className="h-5 w-5" />}
                        />

                        <div className="relative">
                            <Input
                                label="Contraseña"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                icon={<Lock className="h-5 w-5" />}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                <span className="text-gray-600 group-hover:text-gray-800">Recordarme</span>
                            </label>
                            <a href="#" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">
                                ¿Olvidaste tu contraseña?
                            </a>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-lg shadow-lg shadow-primary-500/25"
                            loading={loading}
                        >
                            Iniciar Sesión
                        </Button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-gray-100">
                        <p className="text-gray-600">
                            ¿No tienes una cuenta?{' '}
                            <Link href="/register" className="text-primary-600 hover:text-primary-700 font-bold hover:underline">
                                Regístrate aquí
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-gray-400 text-sm">
                    © 2026 CREDITCOL. Todos los derechos reservados.
                </p>
            </div>
        </div>
    )
}
