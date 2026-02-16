import React from 'react'
import { twMerge } from 'tailwind-merge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TableProps {
    children: React.ReactNode
    className?: string
}

export function Table({ children, className }: TableProps) {
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className={twMerge('w-full text-sm text-left', className)}>
                {children}
            </table>
        </div>
    )
}

interface TableHeaderProps {
    children: React.ReactNode
    className?: string
}

export function TableHeader({ children, className }: TableHeaderProps) {
    return (
        <thead className={twMerge('bg-gray-50', className)}>
            {children}
        </thead>
    )
}

interface TableBodyProps {
    children: React.ReactNode
    className?: string
}

export function TableBody({ children, className }: TableBodyProps) {
    return (
        <tbody className={twMerge('divide-y divide-gray-100', className)}>
            {children}
        </tbody>
    )
}

interface TableRowProps {
    children: React.ReactNode
    className?: string
    onClick?: () => void
}

export function TableRow({ children, className, onClick }: TableRowProps) {
    return (
        <tr
            className={twMerge(
                'hover:bg-gray-50 transition-colors',
                onClick && 'cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            {children}
        </tr>
    )
}

interface TableHeadProps {
    children: React.ReactNode
    className?: string
}

export function TableHead({ children, className }: TableHeadProps) {
    return (
        <th className={twMerge('px-4 py-3 font-semibold text-gray-900 border-b', className)}>
            {children}
        </th>
    )
}

interface TableCellProps {
    children: React.ReactNode
    className?: string
}

export function TableCell({ children, className }: TableCellProps) {
    return (
        <td className={twMerge('px-4 py-3', className)}>
            {children}
        </td>
    )
}

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn btn-outline text-sm disabled:opacity-50"
                >
                    Anterior
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn btn-outline text-sm disabled:opacity-50"
                >
                    Siguiente
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        Página <span className="font-medium">{currentPage}</span> de{' '}
                        <span className="font-medium">{totalPages}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
