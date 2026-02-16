import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'CREDITCOL - Sistema de Automatización WhatsApp',
    description: 'Plataforma de automatización de mensajes WhatsApp para gestión de contactos y campañas',
    icons: {
        icon: '/favicon.ico',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es">
            <body className="antialiased">
                {children}
            </body>
        </html>
    )
}
