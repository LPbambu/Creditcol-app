'use client'

import React from 'react'
import { Bell, User, Search } from 'lucide-react'

interface HeaderProps {
    title: string
    subtitle?: string
    user?: {
        name: string
        email: string
    }
}

export function Header({ title, subtitle, user }: HeaderProps) {
    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            {/* Left: Title */}
            <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="hidden md:flex items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>


                {/* User Menu */}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                    <div className="hidden sm:block text-right">
                        <p className="text-sm font-medium text-gray-900">{user?.name || 'Usuario'}</p>
                        <p className="text-xs text-gray-500">{user?.email || 'usuario@creditcol.com'}</p>
                    </div>
                    <button className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-800 text-white">
                        <User className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>
    )
}
