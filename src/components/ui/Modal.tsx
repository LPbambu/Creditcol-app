'use client'

import React, { useEffect, useCallback } from 'react'
import { twMerge } from 'tailwind-merge'
import { X } from 'lucide-react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    className,
}: ModalProps) {
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
    }, [onClose])

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, handleEscape])

    if (!isOpen) return null

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className={twMerge(
                        'relative w-full bg-white rounded-xl shadow-xl transform transition-all animate-fadeIn',
                        sizes[size],
                        className
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    {title && (
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div className="px-6 py-4">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}

interface ModalFooterProps {
    children: React.ReactNode
    className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
    return (
        <div className={twMerge('flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4', className)}>
            {children}
        </div>
    )
}
