'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, Button, Input, Modal } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui/Table'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Phone, FileText, Search, MessageCircle, Trash2 } from 'lucide-react'

// types
export interface Lead {
    id: string;
    created_at: string;
    nombre: string;
    telefono: string;
    tipo_cliente: string;
    reportado_datacredito: boolean;
    fuente: string;
    estado: string;
    observaciones: string | null;
}

export default function LeadsPage() {
    const { user, profile } = useAuth()
    const [leads, setLeads] = useState<Lead[]>([])
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 15

    // Modal state for notes
    const [showNoteModal, setShowNoteModal] = useState(false)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [noteText, setNoteText] = useState('')
    const [savingNote, setSavingNote] = useState(false)

    useEffect(() => {
        if (user) {
            loadLeads()
        }
    }, [user, currentPage, searchTerm])

    const loadLeads = async () => {
        if (!user) return
        setLoading(true)
        setSelectedLeads(new Set())
        try {
            let query = supabase
                .from('leads')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

            if (searchTerm) {
                query = query.ilike('nombre', `%${searchTerm}%`)
            }

            const { data, count, error } = await query
            
            if (error) throw error
            
            setLeads(data || [])
            setTotalCount(count || 0)
        } catch (error) {
            console.error('Error loading leads:', error)
        } finally {
            setLoading(false)
        }
    }

    const totalPages = Math.ceil(totalCount / pageSize)

    // Handlers
    const handleStatusChange = async (leadId: string, newStatus: string) => {
        // Optimistic update
        setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { ...l, estado: newStatus } : l))
        
        try {
            const { error } = await supabase
                .from('leads')
                .update({ estado: newStatus })
                .eq('id', leadId)
                
            if (error) {
                throw error
            }
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Error al actualizar el estado')
            loadLeads() // re-fetch to fix UI
        }
    }

    const handleDeleteLead = async (leadId: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este prospecto? Esta acción no se puede deshacer.')) {
            return
        }

        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', leadId)

            if (error) throw error

            setLeads(prevLeads => prevLeads.filter(l => l.id !== leadId))
            setTotalCount(prev => prev - 1)
        } catch (error) {
            console.error('Error deleting lead:', error)
            alert('Error al eliminar el prospecto')
        }
    }

    const toggleSelectAll = () => {
        if (selectedLeads.size === leads.length) {
            setSelectedLeads(new Set())
        } else {
            setSelectedLeads(new Set(leads.map(l => l.id)))
        }
    }

    const toggleSelectLead = (id: string) => {
        const newSet = new Set(selectedLeads)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedLeads(newSet)
    }

    const handleBulkDelete = async () => {
        if (!window.confirm(`¿Estás seguro de eliminar los ${selectedLeads.size} prospectos seleccionados? Esta acción no se puede deshacer.`)) {
            return
        }
        
        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .in('id', Array.from(selectedLeads))
                
            if (error) throw error
            
            setLeads(prevLeads => prevLeads.filter(l => !selectedLeads.has(l.id)))
            setTotalCount(prev => prev - selectedLeads.size)
            setSelectedLeads(new Set())
        } catch (error) {
            console.error('Error deleting leads:', error)
            alert('Error al eliminar los prospectos')
        }
    }

    const [bulkStatus, setBulkStatus] = useState('')

    const handleBulkStatusChange = async (newStatus: string) => {
        if (!newStatus) return
        
        try {
            const { error } = await supabase
                .from('leads')
                .update({ estado: newStatus })
                .in('id', Array.from(selectedLeads))
                
            if (error) throw error
            
            setLeads(prevLeads => prevLeads.map(l => 
                selectedLeads.has(l.id) ? { ...l, estado: newStatus } : l
            ))
            setSelectedLeads(new Set())
            setBulkStatus('')
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Error al actualizar los estados')
        }
    }

    const openNoteModal = (lead: Lead) => {
        setSelectedLead(lead)
        setNoteText(lead.observaciones || '')
        setShowNoteModal(true)
    }

    const saveNote = async () => {
        if (!selectedLead) return
        setSavingNote(true)
        try {
            const { error } = await supabase
                .from('leads')
                .update({ observaciones: noteText })
                .eq('id', selectedLead.id)
                
            if (error) throw error
            
            // update local state
            setLeads(prevLeads => prevLeads.map(l => l.id === selectedLead.id ? { ...l, observaciones: noteText } : l))
            setShowNoteModal(false)
        } catch (error) {
            console.error('Error saving note:', error)
            alert('Error al guardar la nota')
        } finally {
            setSavingNote(false)
        }
    }

    // Helper functions
    const getStatusColor = (status: string) => {
        switch(status?.toLowerCase()) {
            case 'nuevo': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'contactado': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'en evaluación': return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'aprobado': return 'bg-green-100 text-green-800 border-green-200'
            case 'rechazado': return 'bg-red-100 text-red-800 border-red-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const formatPhone = (phone: string) => {
        if (!phone) return ''
        const clean = phone.replace(/\D/g, '')
        // Ensure standard 57 prefix if not present for whatsapp
        return clean.startsWith('57') ? clean : '57' + clean
    }

    const handleWhatsAppClick = (lead: Lead) => {
        const tel = formatPhone(lead.telefono)
        const text = `Hola ${lead.nombre}, vi que solicitaste una evaluación de crédito en Creditcol...`
        const url = `https://wa.me/${tel}?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    return (
        <DashboardLayout
            title="Leads / Prospectos"
            subtitle={`Gestión de clientes - ${totalCount} prospectos registrados`}
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="space-y-6">
                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    {selectedLeads.size > 0 && (
                        <div className="flex flex-wrap items-center gap-3 bg-primary-50 px-4 py-2 rounded-lg border border-primary-100 min-w-max">
                            <span className="text-sm font-medium text-primary-700">
                                {selectedLeads.size} seleccionados
                            </span>
                            <select
                                value={bulkStatus}
                                onChange={(e) => {
                                    setBulkStatus(e.target.value)
                                    handleBulkStatusChange(e.target.value)
                                }}
                                className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white/50"
                            >
                                <option value="">Cambiar estado...</option>
                                <option value="nuevo">Nuevo</option>
                                <option value="contactado">Contactado</option>
                                <option value="en evaluación">En evaluación</option>
                                <option value="aprobado">Aprobado</option>
                                <option value="rechazado">Rechazado</option>
                            </select>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
                            >
                                <Trash2 className="h-4 w-4" /> Eliminar
                            </button>
                        </div>
                    )}
                </div>

                <Card padding={false}>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron leads</h3>
                            <p className="text-gray-500 mb-8 max-w-xs mx-auto text-pretty">
                                Los nuevos prospectos que se registren en la Landing Page aparecerán aquí automáticamente.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <input 
                                                    type="checkbox" 
                                                    checked={leads.length > 0 && selectedLeads.size === leads.length}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                />
                                            </TableHead>
                                            <TableHead>Ingreso</TableHead>
                                            <TableHead>Prospecto</TableHead>
                                            <TableHead>Perfil</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Notas</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leads.map((lead) => (
                                            <TableRow key={lead.id} className={`hover:bg-slate-50 transition-colors ${selectedLeads.has(lead.id) ? 'bg-primary-50/50' : ''}`}>
                                                <TableCell>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedLeads.has(lead.id)}
                                                        onChange={() => toggleSelectLead(lead.id)}
                                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500 truncate whitespace-nowrap">
                                                    {new Date(lead.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 capitalize">{lead.nombre.toLowerCase()}</p>
                                                        <div className="flex items-center gap-2 mt-1 -ml-1">
                                                            <div className="flex items-center gap-1 text-sm text-gray-600 px-2 py-0.5 rounded-full bg-slate-100">
                                                                <Phone className="h-3 w-3" />
                                                                {lead.telefono}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className="text-sm font-medium text-slate-700">
                                                            {lead.tipo_cliente === 'empleado_publico' ? 'Empleado P.' : lead.tipo_cliente === 'pensionado' ? 'Pensionado' : lead.tipo_cliente || 'N/A'}
                                                        </span>
                                                        {lead.reportado_datacredito ? (
                                                            <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold uppercase tracking-wider">
                                                                Reportado
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-600 border border-green-100 text-[10px] font-bold uppercase tracking-wider">
                                                                No Reportado
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <select
                                                        value={lead.estado?.toLowerCase() || 'nuevo'}
                                                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                                        className={`text-sm rounded-full px-3 py-1 font-medium border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 ${getStatusColor(lead.estado || 'nuevo')}`}
                                                    >
                                                        <option value="nuevo">Nuevo</option>
                                                        <option value="contactado">Contactado</option>
                                                        <option value="en evaluación">En evaluación</option>
                                                        <option value="aprobado">Aprobado</option>
                                                        <option value="rechazado">Rechazado</option>
                                                    </select>
                                                </TableCell>
                                                <TableCell>
                                                    <button
                                                        onClick={() => openNoteModal(lead)}
                                                        className="group flex flex-col items-start max-w-[150px]"
                                                    >
                                                        {!lead.observaciones ? (
                                                            <span className="text-sm text-primary-600 hover:underline flex items-center gap-1 mt-1">
                                                                <FileText className="h-3 w-3" /> Añadir nota
                                                            </span>
                                                        ) : (
                                                            <div className="text-sm text-gray-600 truncate w-full text-left group-hover:text-primary-600 transition-colors mt-1">
                                                                {lead.observaciones}
                                                            </div>
                                                        )}
                                                    </button>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleWhatsAppClick(lead)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-transform hover:scale-105 active:scale-95 text-sm font-medium shadow-sm hover:shadow-md"
                                                        >
                                                            <MessageCircle className="h-4 w-4" />
                                                            Contactar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLead(lead.id)}
                                                            className="flex items-center gap-2 px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-transform hover:scale-105 active:scale-95 text-sm font-medium border border-red-200"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {totalPages > 1 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </>
                    )}
                </Card>
            </div>

            {/* Note Modal */}
            <Modal
                isOpen={showNoteModal}
                onClose={() => setShowNoteModal(false)}
                title={`Notas: ${selectedLead?.nombre || ''}`}
            >
                <div className="space-y-4">
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <textarea
                            className="w-full bg-transparent border-0 focus:ring-0 p-0 text-gray-800 placeholder-yellow-600/50 resize-y min-h-[100px]"
                            placeholder="Escribe aquí las observaciones, recordatorios o acuerdos con el cliente..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={() => setShowNoteModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={saveNote}
                            loading={savingNote}
                        >
                            Guardar Nota
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
