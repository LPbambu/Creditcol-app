import React from 'react'
import { twMerge } from 'tailwind-merge'

interface CardProps {
    children: React.ReactNode
    className?: string
    padding?: boolean
    hover?: boolean
}

export function Card({ children, className, padding = true, hover = false }: CardProps) {
    return (
        <div
            className={twMerge(
                'bg-white rounded-xl shadow-sm border border-gray-200',
                padding && 'p-6',
                hover && 'transition-shadow hover:shadow-md',
                className
            )}
        >
            {children}
        </div>
    )
}

interface CardHeaderProps {
    children: React.ReactNode
    className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
    return (
        <div className={twMerge('mb-4', className)}>
            {children}
        </div>
    )
}

interface CardTitleProps {
    children: React.ReactNode
    className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
    return (
        <h3 className={twMerge('text-lg font-semibold text-gray-900', className)}>
            {children}
        </h3>
    )
}

interface CardDescriptionProps {
    children: React.ReactNode
    className?: string
}

export function CardDescription({ children, className }: CardDescriptionProps) {
    return (
        <p className={twMerge('text-sm text-gray-500 mt-1', className)}>
            {children}
        </p>
    )
}

interface CardContentProps {
    children: React.ReactNode
    className?: string
}

export function CardContent({ children, className }: CardContentProps) {
    return (
        <div className={twMerge('', className)}>
            {children}
        </div>
    )
}

interface CardFooterProps {
    children: React.ReactNode
    className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
    return (
        <div className={twMerge('mt-4 pt-4 border-t border-gray-100', className)}>
            {children}
        </div>
    )
}
