'use client'

import React from 'react'
import { twMerge } from 'tailwind-merge'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

interface AlertProps {
    children: React.ReactNode
    type?: 'success' | 'error' | 'warning' | 'info'
    title?: string
    dismissible?: boolean
    onDismiss?: () => void
    className?: string
}

export function Alert({
    children,
    type = 'info',
    title,
    dismissible = false,
    onDismiss,
    className,
}: AlertProps) {
    const styles = {
        success: {
            bg: 'bg-green-50 border-green-200',
            icon: 'text-green-500',
            title: 'text-green-800',
            text: 'text-green-700',
        },
        error: {
            bg: 'bg-red-50 border-red-200',
            icon: 'text-red-500',
            title: 'text-red-800',
            text: 'text-red-700',
        },
        warning: {
            bg: 'bg-yellow-50 border-yellow-200',
            icon: 'text-yellow-500',
            title: 'text-yellow-800',
            text: 'text-yellow-700',
        },
        info: {
            bg: 'bg-blue-50 border-blue-200',
            icon: 'text-blue-500',
            title: 'text-blue-800',
            text: 'text-blue-700',
        },
    }

    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        warning: AlertTriangle,
        info: Info,
    }

    const Icon = icons[type]

    return (
        <div
            className={twMerge(
                'rounded-lg border p-4',
                styles[type].bg,
                className
            )}
        >
            <div className="flex">
                <div className="flex-shrink-0">
                    <Icon className={twMerge('h-5 w-5', styles[type].icon)} />
                </div>
                <div className="ml-3 flex-1">
                    {title && (
                        <h3 className={twMerge('text-sm font-medium', styles[type].title)}>
                            {title}
                        </h3>
                    )}
                    <div className={twMerge('text-sm', styles[type].text, title && 'mt-1')}>
                        {children}
                    </div>
                </div>
                {dismissible && onDismiss && (
                    <div className="ml-auto pl-3">
                        <button
                            type="button"
                            onClick={onDismiss}
                            className={twMerge(
                                'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                                styles[type].icon,
                                'hover:bg-black/5'
                            )}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
