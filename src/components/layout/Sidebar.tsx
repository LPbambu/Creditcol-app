'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { twMerge } from 'tailwind-merge'
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    Megaphone,
    FileSpreadsheet,
    Settings,
    Activity,
    LogOut,
    Inbox,
    Send,
    X
} from 'lucide-react'

interface SidebarLink {
    href: string
    label: string
    icon: React.ReactNode
}

const mainLinks: SidebarLink[] = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: '/send', label: 'Envío Manual', icon: <Send className="h-5 w-5" /> },
    { href: '/chats', label: 'Chats', icon: <Inbox className="h-5 w-5" /> },
    { href: '/contacts', label: 'Contactos', icon: <Users className="h-5 w-5" /> },
    { href: '/messages', label: 'Mensajes', icon: <MessageSquare className="h-5 w-5" /> },
    { href: '/campaigns', label: 'Campañas', icon: <Megaphone className="h-5 w-5" /> },
    { href: '/contacts/import', label: 'Importar Excel', icon: <FileSpreadsheet className="h-5 w-5" /> },
]

const secondaryLinks: SidebarLink[] = [
    { href: '/logs', label: 'Actividad', icon: <Activity className="h-5 w-5" /> },
    { href: '/settings', label: 'Configuración', icon: <Settings className="h-5 w-5" /> },
]

interface SidebarProps {
    onLogout?: () => void
    isOpen?: boolean
    onClose?: () => void
}

export function Sidebar({ onLogout, isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname()

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard'
        }
        return pathname.startsWith(href)
    }

    const handleLinkClick = () => {
        if (isOpen && onClose) {
            onClose()
        }
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar-bg flex flex-col transition-transform duration-300 transform 
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-xl md:shadow-none border-r border-white/10`}>

                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/70 hover:text-white md:hidden"
                >
                    <X className="h-6 w-6" />
                </button>

                {/* Logo */}
                <div className="h-28 bg-white flex items-center justify-center px-4 shadow-sm relative z-10">
                    <Link href="/dashboard" className="flex items-center justify-center w-full h-full" onClick={handleLinkClick}>
                        <Image
                            src="/images/logo/logo-main.png"
                            alt="CREDITCOL"
                            width={280}
                            height={100}
                            className="object-contain h-24 w-auto"
                            priority
                        />
                    </Link>
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    <div className="space-y-1">
                        {mainLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={handleLinkClick}
                                className={twMerge(
                                    'flex items-center gap-3 px-4 py-3 text-sidebar-text rounded-lg transition-all duration-200',
                                    isActive(link.href)
                                        ? 'bg-sidebar-active text-sidebar-textActive'
                                        : 'hover:bg-sidebar-hover hover:text-sidebar-textActive'
                                )}
                            >
                                {link.icon}
                                <span className="font-medium">{link.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="my-4 border-t border-white/10" />

                    {/* Secondary Links */}
                    <div className="space-y-1">
                        {secondaryLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={handleLinkClick}
                                className={twMerge(
                                    'flex items-center gap-3 px-4 py-3 text-sidebar-text rounded-lg transition-all duration-200',
                                    isActive(link.href)
                                        ? 'bg-sidebar-active text-sidebar-textActive'
                                        : 'hover:bg-sidebar-hover hover:text-sidebar-textActive'
                                )}
                            >
                                {link.icon}
                                <span className="font-medium">{link.label}</span>
                            </Link>
                        ))}
                    </div>
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => {
                            handleLinkClick()
                            onLogout?.()
                        }}
                        className="flex items-center gap-3 px-4 py-3 w-full text-sidebar-text rounded-lg hover:bg-red-600/20 hover:text-red-400 transition-all duration-200"
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Cerrar sesión</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
