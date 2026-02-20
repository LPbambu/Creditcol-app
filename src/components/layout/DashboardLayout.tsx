'use client'

import React, { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'

interface DashboardLayoutProps {
    children: React.ReactNode
    title: string
    subtitle?: string
    user?: {
        name: string
        email: string
    }
    padding?: boolean
}

export function DashboardLayout({
    children,
    title,
    subtitle,
    user,
    padding = true,
}: DashboardLayoutProps) {
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = () => {
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-slate-50 relative flex">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: `radial-gradient(#1e3a5f 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />

            {/* Mobile Header for Sidebar Toggle */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 h-16 flex items-center justify-between shadow-sm">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="font-semibold text-gray-900 truncate max-w-[200px]">{title}</div>
                <div className="w-10" /> {/* Spacer for centering if needed */}
            </div>

            {/* Sidebar with Mobile State */}
            <Sidebar
                onLogout={handleLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Main Content */}
            <div className="flex-1 min-w-0 md:pl-64 flex flex-col pt-16 md:pt-0 relative z-10 transition-all duration-200">
                {/* Desktop Header */}
                <div className="hidden md:block">
                    <Header title={title} subtitle={subtitle} user={user} />
                </div>

                {/* Page Content */}
                <main className={`flex-1 ${padding ? "p-4 md:p-6" : ""}`}>
                    <div className="animate-fadeIn">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
