'use client'

import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useRouter } from 'next/navigation'

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

    const handleLogout = () => {
        // TODO: Implement logout with Supabase
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-slate-50 relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: `radial-gradient(#1e3a5f 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />

            <div className="relative z-10">
                {/* Sidebar */}
                <Sidebar onLogout={handleLogout} />

                {/* Main Content */}
                <div className="pl-64">
                    {/* Header */}
                    <Header title={title} subtitle={subtitle} user={user} />

                    {/* Page Content */}
                    <main className={padding ? "p-6" : ""}>
                        <div className="animate-fadeIn">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}

