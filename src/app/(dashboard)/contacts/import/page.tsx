'use client'

import { useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardTitle, CardContent, Button, Alert } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
    Upload as UploadIcon,
    FileSpreadsheet,
    CheckCircle,
    AlertCircle,
    X,
    ArrowRight
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface ParsedData {
    columns: string[]
    rows: Record<string, any>[]
    totalRows: number
    validRows: number
    invalidRows: number
    errors: string[]
}

export default function ImportContactsPage() {
    const { user, profile } = useAuth()
    const [file, setFile] = useState<File | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload')
    const [parsedData, setParsedData] = useState<ParsedData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: number; lastErrorMessage?: string } | null>(null)
    const [packageName, setPackageName] = useState('')

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }, [])

    const validateFile = (file: File): boolean => {
        const maxSize = 10 * 1024 * 1024 // 10MB
        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]

        if (file.size > maxSize) {
            setError('El archivo excede el tamaño máximo de 10MB')
            return false
        }

        const extension = file.name.split('.').pop()?.toLowerCase()
        if (!['xls', 'xlsx'].includes(extension || '')) {
            setError('Formato de archivo no válido. Use .xls o .xlsx')
            return false
        }

        return true
    }

    const parseExcel = async (file: File): Promise<ParsedData> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = (e) => {
                try {
                    const data = e.target?.result
                    const workbook = XLSX.read(data, { type: 'binary' })

                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                    const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })

                    if (jsonData.length === 0) {
                        reject(new Error('El archivo está vacío'))
                        return
                    }

                    const columns = Object.keys(jsonData[0])
                    const errors: string[] = []
                    const validRows: Record<string, any>[] = []
                    const invalidRows: Record<string, any>[] = []

                    jsonData.forEach((row, index) => {
                        // Flexible column matching
                        const keys = Object.keys(row)
                        const nameKey = keys.find(k => /nombre|name|nombres|empleado|cliente|customer/i.test(k))
                        const phoneKey = keys.find(k => /tel|cel|phone|mobile|movil|contacto/i.test(k))
                        const emailKey = keys.find(k => /email|correo|mail/i.test(k))
                        const cityKey = keys.find(k => /ciudad|city|ubicacion/i.test(k))

                        const hasName = nameKey ? row[nameKey] : null
                        const hasPhone = phoneKey ? row[phoneKey] : null

                        if (!hasName) {
                            errors.push(`Fila ${index + 2}: Falta el nombre`)
                            invalidRows.push(row)
                        } else if (!hasPhone) {
                            errors.push(`Fila ${index + 2}: Falta el teléfono`)
                            invalidRows.push(row)
                        } else {
                            // Clean phone number: remove everything except digits
                            const phoneStr = String(hasPhone).replace(/\D/g, '')

                            if (phoneStr.length < 7) { // Allow landlines or short numbers to be flagged but maybe lenient? Let's stick to 7+
                                errors.push(`Fila ${index + 2}: Teléfono inválido (${hasPhone})`)
                                invalidRows.push(row)
                            } else {
                                // Normalize row structure
                                validRows.push({
                                    ...row,
                                    normalized_name: hasName,
                                    normalized_phone: phoneStr,
                                    normalized_email: emailKey ? row[emailKey] : null,
                                    normalized_city: cityKey ? row[cityKey] : null
                                })
                            }
                        }
                    })

                    resolve({
                        columns,
                        rows: validRows,
                        totalRows: jsonData.length,
                        validRows: validRows.length,
                        invalidRows: invalidRows.length,
                        errors: errors.slice(0, 10), // Limit errors shown
                    })
                } catch (error: any) {
                    reject(new Error(`Error al procesar el archivo: ${error.message}`))
                }
            }

            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'))
            }

            reader.readAsBinaryString(file)
        })
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        const droppedFile = e.dataTransfer?.files?.[0]
        if (droppedFile && validateFile(droppedFile)) {
            setFile(droppedFile)
            setError(null)
        }
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile && validateFile(selectedFile)) {
            setFile(selectedFile)
            setError(null)
        }
    }

    const handleParse = async () => {
        if (!file) return

        setLoading(true)
        setError(null)

        try {
            const data = await parseExcel(file)
            setParsedData(data)
            setStep('preview')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const normalizePhone = (phone: string): string => {
        const cleaned = phone.replace(/\D/g, '')

        if (cleaned.length === 12 && cleaned.startsWith('57')) {
            return `+${cleaned}`
        }

        if (cleaned.length === 10) {
            return `+57${cleaned}`
        }

        return `+${cleaned}`
    }

    const handleImport = async () => {
        if (!user || !parsedData) return

        setLoading(true)
        setError(null)

        try {
            let imported = 0
            let duplicates = 0
            let errors = 0
            let lastErrorMessage = ''

            // Create upload record (package)
            const uploadName = packageName.trim() || file?.name || 'Paquete sin nombre'
            const { data: uploadRecord, error: uploadError } = await supabase
                .from('excel_uploads')
                .insert({
                    user_id: user.id,
                    file_name: uploadName,
                    file_path: file?.name || 'import',
                    file_size: file?.size || 0,
                    file_type: 'xlsx',
                    total_rows: parsedData.totalRows,
                    valid_rows: parsedData.validRows,
                    invalid_rows: parsedData.invalidRows,
                    status: 'processing',
                })
                .select()
                .single()

            if (uploadError || !uploadRecord) {
                throw new Error('Error al crear el paquete: ' + (uploadError?.message || 'Unknown'))
            }

            const uploadId = uploadRecord.id

            for (const row of parsedData.rows) {
                const fullName = row.normalized_name
                const phone = row.normalized_phone
                // Auto-prefix with 57 if length is 10, otherwise assume international format if starts with +
                const normalizedPhone = phone.length === 10 ? `+57${phone}` : `+${phone}`.replace('++', '+')

                // Check if contact already exists
                const { data: existing } = await supabase
                    .from('contacts')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('phone', normalizedPhone)
                    .single()

                if (existing) {
                    duplicates++
                    continue
                }

                const { error: insertError } = await supabase.from('contacts').insert({
                    user_id: user.id,
                    upload_id: uploadId,
                    full_name: fullName,
                    phone: normalizedPhone,
                    email: row.normalized_email || null,
                    city: row.normalized_city || null,
                    custom_fields: row,
                })

                if (insertError) {
                    console.error('Error inserting row:', row, insertError)
                    errors++
                    lastErrorMessage = insertError.message || insertError.details || JSON.stringify(insertError)
                } else {
                    imported++
                }
            }

            setImportResult({ imported, skipped: duplicates, errors, lastErrorMessage })
            setStep('success')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFile(null)
        setParsedData(null)
        setImportResult(null)
        setError(null)
        setStep('upload')
    }

    return (
        <DashboardLayout
            title="Importar Contactos"
            subtitle="Carga tu base de datos desde Excel"
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="max-w-3xl mx-auto">
                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-8">
                    {['Cargar', 'Vista previa', 'Completado'].map((label, index) => (
                        <div key={label} className="flex items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${index === 0 && step !== 'upload' ? 'bg-green-500 text-white' :
                                index <= (step === 'upload' ? 0 : step === 'preview' ? 1 : 2)
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}>
                                {index === 0 && step !== 'upload' ? (
                                    <CheckCircle className="h-5 w-5" />
                                ) : (
                                    index + 1
                                )}
                            </div>
                            <span className={`ml-2 text-sm ${index <= (step === 'upload' ? 0 : step === 'preview' ? 1 : 2)
                                ? 'text-gray-900 font-medium'
                                : 'text-gray-500'
                                }`}>
                                {label}
                            </span>
                            {index < 2 && (
                                <div className={`w-12 h-0.5 mx-2 ${index < (step === 'upload' ? 0 : step === 'preview' ? 1 : 2)
                                    ? 'bg-primary-600'
                                    : 'bg-gray-200'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                {error && (
                    <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {step === 'upload' && (
                    <Card>
                        <CardTitle>Cargar Archivo Excel</CardTitle>
                        <CardContent className="mt-4">
                            {/* Drop Zone */}
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 group ${dragActive
                                    ? 'border-primary-500 bg-primary-50/50 scale-[1.01]'
                                    : 'border-slate-200 hover:border-primary-400 hover:bg-slate-50/50'
                                    }`}
                            >
                                <div className={`inline-flex p-4 rounded-full mb-6 transition-colors ${dragActive ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500'}`}>
                                    <FileSpreadsheet className="h-10 w-10" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Carga tu base de datos
                                </h3>
                                <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                                    Arrastra y suelta tu archivo Excel aquí, o selecciona uno manualmente
                                </p>

                                <label className="cursor-pointer inline-flex">
                                    <div className="btn btn-primary shadow-lg shadow-primary-500/20 px-8">
                                        <UploadIcon className="h-4 w-4 mr-2" />
                                        Seleccionar archivo
                                    </div>
                                    <input
                                        type="file"
                                        accept=".xls,.xlsx"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-xs text-gray-400 mt-6 font-medium">
                                    SOPORTA ARCHIVOS .XLS Y .XLSX HASTA 10MB
                                </p>
                            </div>

                            {/* Selected File */}
                            {file && (
                                <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                        <div>
                                            <p className="font-medium text-gray-900">{file.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {(file.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFile(null)}
                                            className="p-2 text-gray-500 hover:text-red-600"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                        <Button onClick={handleParse} loading={loading}>
                                            Continuar
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Tips */}
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-900 mb-2">💡 Consejos:</p>
                                <ul className="text-sm text-blue-700 space-y-1">
                                    <li>• El archivo debe tener columnas de "Nombre" y "Teléfono"</li>
                                    <li>• Los teléfonos deben tener al menos 10 dígitos</li>
                                    <li>• Los contactos duplicados serán omitidos</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 'preview' && parsedData && (
                    <Card>
                        <CardTitle>Vista Previa de Importación</CardTitle>
                        <CardContent className="mt-4">
                            <Alert type="info" className="mb-6">
                                Se encontraron {parsedData.validRows} contactos válidos y {parsedData.invalidRows} inválidos.
                            </Alert>

                            {/* Package Name Input */}
                            <div className="mb-6 max-w-md">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Nombre del Paquete (opcional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Base de datos Febrero 2026"
                                    value={packageName}
                                    onChange={(e) => setPackageName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Este nombre te ayudará a identificar este grupo de contactos al crear campañas.</p>
                            </div>
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-4 bg-gray-50 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-gray-900">{parsedData.totalRows}</p>
                                    <p className="text-sm text-gray-500">Total filas</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-green-600">{parsedData.validRows}</p>
                                    <p className="text-sm text-gray-500">Válidos</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-red-600">{parsedData.invalidRows}</p>
                                    <p className="text-sm text-gray-500">Con errores</p>
                                </div>
                            </div>

                            {/* Errors */}
                            {parsedData.errors.length > 0 && (
                                <Alert type="warning" className="mb-6">
                                    <p className="font-medium mb-2">Errores encontrados:</p>
                                    <ul className="text-sm space-y-1">
                                        {parsedData.errors.map((err, i) => (
                                            <li key={i}>• {err}</li>
                                        ))}
                                    </ul>
                                </Alert>
                            )}

                            {/* Preview Table */}
                            <div className="overflow-x-auto border rounded-lg mb-6">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {parsedData.columns.slice(0, 5).map((col) => (
                                                <th key={col} className="px-4 py-2 text-left font-medium text-gray-700">
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData.rows.slice(0, 5).map((row, i) => (
                                            <tr key={i} className="border-t">
                                                {parsedData.columns.slice(0, 5).map((col) => (
                                                    <td key={col} className="px-4 py-2 text-gray-600">
                                                        {String(row[col] || '-').substring(0, 30)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-between">
                                <Button variant="ghost" onClick={resetForm}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleImport} loading={loading}>
                                    Importar {parsedData.validRows} contactos
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 'success' && importResult && (
                    <Card className="text-center">
                        <div className="py-8">
                            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${importResult.imported > 0 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                {importResult.imported > 0 ? <CheckCircle className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Proceso Finalizado
                            </h2>
                            <div className="space-y-1 mb-6 text-gray-600">
                                <p>✅ Importados: <strong>{importResult.imported}</strong></p>
                                <p>⚠️ Duplicados (omitidos): <strong>{importResult.skipped}</strong></p>
                                {importResult.errors > 0 && <p className="text-red-600">❌ Errores: <strong>{importResult.errors}</strong></p>}
                            </div>

                            {(importResult.errors > 0 || importResult.lastErrorMessage) && (
                                <Alert type="error" className="mb-6 max-w-lg mx-auto text-left">
                                    <p className="font-bold">Error detectado:</p>
                                    <p className="font-mono text-xs mt-1">{importResult.lastErrorMessage}</p>
                                </Alert>
                            )}

                            <div className="flex justify-center gap-4">
                                <Button variant="outline" onClick={resetForm}>
                                    Importar más
                                </Button>
                                <a href="/contacts">
                                    <Button>Ver contactos</Button>
                                </a>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    )
}
