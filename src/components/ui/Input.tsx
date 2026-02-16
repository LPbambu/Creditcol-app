'use client'

import React, { forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helperText?: string
    icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, icon, className, id, ...props }, ref) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={twMerge(
                            'w-full px-4 py-2.5 border rounded-lg transition-colors focus:outline-none focus:ring-2',
                            icon && 'pl-10',
                            error
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-red-600">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'
