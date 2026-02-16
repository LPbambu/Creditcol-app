import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Iniciar Sesión - CREDITCOL',
    description: 'Accede a tu cuenta de CREDITCOL',
}

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-secondary-900 relative overflow-hidden flex items-center justify-center">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-secondary-900 via-secondary-900 to-secondary-800 z-0" />

            {/* Animated Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />

            {/* Grid Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}
