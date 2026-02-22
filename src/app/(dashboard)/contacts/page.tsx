'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, Button, Input, Alert, Modal } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui/Table'
import { useAuth } from '@/hooks/useAuth'
import { supabase, type Contact } from '@/lib/supabase'
import {
    Search,
    Plus,
    Upload,
    Phone,
    Mail,
    MoreVertical,
    MessageSquare,
    Trash2,
    Edit,
    Users
} from 'lucide-react'
import Link from 'next/link'

export default function ContactsPage() {
    const { user, profile } = useAuth()
    const [contacts, setContacts] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [showAddModal, setShowAddModal] = useState(false)
    const [newContact, setNewContact] = useState({ full_name: '', phone: '', email: '', city: '' })
    const [saving, setSaving] = useState(false)
    const pageSize = 10

    useEffect(() => {
        if (user) {
            loadContacts()
        }
    }, [user, currentPage, searchTerm])

    const loadContacts = async () => {
        if (!user) return

        setLoading(true)
        try {
            let query = supabase
                .from('contacts')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

            if (searchTerm) {
                query = query.ilike('full_name', `%${searchTerm}%`)
            }

            const { data, count, error } = await query

            if (error) throw error

            setContacts(data || [])
            setTotalCount(count || 0)
        } catch (error) {
            console.error('Error loading contacts:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (contactId: string) => {
        if (!confirm('¿Estás seguro de eliminar este contacto?')) return

        try {
            const { error } = await supabase
                .from('contacts')
                .delete()
                .eq('id', contactId)

            if (error) throw error

            loadContacts()
        } catch (error) {
            console.error('Error deleting contact:', error)
        }
    }

    const handleDeleteAll = async () => {
        if (!user) return

        // Double confirmation for safety
        const firstConfirm = confirm(`¿Estás seguro de eliminar TODOS los ${totalCount} contactos?\n\nEsta acción NO se puede deshacer.`)
        if (!firstConfirm) return

        const secondConfirm = confirm('⚠️ ÚLTIMA ADVERTENCIA ⚠️\n\n¿Realmente deseas eliminar TODOS los contactos permanentemente?')
        if (!secondConfirm) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('contacts')
                .delete()

            if (error) throw error

            setContacts([])
            setTotalCount(0)
            alert('✅ Todos los contactos han sido eliminados.')
        } catch (error) {
            console.error('Error deleting all contacts:', error)
            alert('Error al eliminar los contactos. Por favor intenta de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    const handleAddContact = async () => {
        if (!user || !newContact.full_name || !newContact.phone) return

        setSaving(true)
        try {
            const { error } = await supabase.from('contacts').insert({
                user_id: user.id,
                full_name: newContact.full_name,
                phone: newContact.phone,
                email: newContact.email || null,
                city: newContact.city || null,
            })

            if (error) throw error

            setNewContact({ full_name: '', phone: '', email: '', city: '' })
            setShowAddModal(false)
            loadContacts()
        } catch (error) {
            console.error('Error adding contact:', error)
            alert('Error al agregar contacto')
        } finally {
            setSaving(false)
        }
    }

    const totalPages = Math.ceil(totalCount / pageSize)

    return (
        <DashboardLayout
            title="Contactos"
            subtitle={`${totalCount} contactos registrados`}
            user={profile ? { name: profile.full_name || 'Usuario', email: profile.email } : undefined}
        >
            <div className="space-y-6">
                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar contactos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    <div className="flex gap-3">
                        {totalCount > 0 && (
                            <Button
                                variant="danger"
                                onClick={handleDeleteAll}
                                icon={<Trash2 className="h-4 w-4" />}
                                title="Eliminar TODOS los contactos"
                            >
                                Eliminar Todos
                            </Button>
                        )}
                        <Link href="/contacts/import">
                            <Button variant="outline" icon={<Upload className="h-4 w-4" />}>
                                Importar Excel
                            </Button>
                        </Link>
                        <Button onClick={() => setShowAddModal(true)} icon={<Plus className="h-4 w-4" />}>
                            Nuevo Contacto
                        </Button>
                    </div>
                </div>

                {/* Contacts Table */}
                <Card padding={false}>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : contacts.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-sm border border-gray-100 mb-6 group-hover:scale-110 transition-transform">
                                <Users className="h-10 w-10 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Tu lista está vacía</h3>
                            <p className="text-gray-500 mb-8 max-w-xs mx-auto text-pretty">
                                Comienza cargando tus clientes desde un archivo Excel para empezar a enviar mensajes.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link href="/contacts/import">
                                    <Button size="lg" icon={<Upload className="h-5 w-5" />}>
                                        Importar desde Excel
                                    </Button>
                                </Link>
                                <Button variant="outline" size="lg" icon={<Plus className="h-5 w-5" />}>
                                    Crear Manualmente
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Teléfono</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Ciudad</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contacts.map((contact) => (
                                        <TableRow key={contact.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-800 flex items-center justify-center text-white font-medium">
                                                        {contact.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{contact.full_name}</p>
                                                        {contact.notes && (
                                                            <p className="text-sm text-gray-500 truncate max-w-[200px]">{contact.notes}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <Phone className="h-4 w-4 text-gray-400" />
                                                    {contact.phone}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {contact.email ? (
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <Mail className="h-4 w-4 text-gray-400" />
                                                        {contact.email}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-gray-700">{contact.city || '-'}</span>
                                            </TableCell>
                                            <TableCell>
                                                {contact.is_blocked ? (
                                                    <span className="badge badge-danger">Bloqueado</span>
                                                ) : contact.is_active ? (
                                                    <span className="badge badge-success">Activo</span>
                                                ) : (
                                                    <span className="badge badge-warning">Inactivo</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Enviar mensaje"
                                                    >
                                                        <MessageSquare className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(contact.id)}
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

            {/* Add Contact Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Agregar Nuevo Contacto"
            >
                <div className="space-y-4">
                    <Input
                        label="Nombre completo *"
                        placeholder="Ej: Juan Pérez"
                        value={newContact.full_name}
                        onChange={(e) => setNewContact({ ...newContact, full_name: e.target.value })}
                        required
                    />
                    <Input
                        label="Teléfono *"
                        placeholder="Ej: +573001234567"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                        helperText="Incluye el código de país (ej: +57 para Colombia)"
                        required
                    />
                    <Input
                        label="Email (opcional)"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={newContact.email}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    />
                    <Input
                        label="Ciudad (opcional)"
                        placeholder="Ej: Bogotá"
                        value={newContact.city}
                        onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={() => setShowAddModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAddContact}
                            loading={saving}
                            disabled={!newContact.full_name || !newContact.phone}
                        >
                            Guardar Contacto
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
