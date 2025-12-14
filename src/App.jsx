import { useState, useEffect } from 'react'

// API base URL - uses environment variable in production, localhost in development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Lead type options
const LEAD_TYPES = [
  { value: 'divorce', label: 'Divorce', color: 'bg-purple-100 text-purple-800' },
  { value: 'probate', label: 'Probate', color: 'bg-blue-100 text-blue-800' },
  { value: 'foreclosure', label: 'Foreclosure', color: 'bg-red-100 text-red-800' },
  { value: 'taxlien', label: 'Tax Lien', color: 'bg-orange-100 text-orange-800' },
  { value: 'outofstate', label: 'Out of State', color: 'bg-green-100 text-green-800' },
]

// Status options
const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-gray-100 text-gray-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { value: 'interested', label: 'Interested', color: 'bg-green-100 text-green-800' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-100 text-red-800' },
  { value: 'closed', label: 'Closed', color: 'bg-purple-100 text-purple-800' },
]

function App() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sendingEmail, setSendingEmail] = useState(null)
  const [notification, setNotification] = useState(null)

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts()
  }, [])

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/contacts`)
      if (!res.ok) throw new Error('Failed to fetch contacts')
      const data = await res.json()
      setContacts(data)
      setError(null)
    } catch (err) {
      setError(err.message)
      showNotification('Failed to load contacts', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
  }

  const handleSaveContact = async (contactData) => {
    try {
      const url = editingContact 
        ? `${API_URL}/api/contacts/${editingContact.id}`
        : `${API_URL}/api/contacts`
      
      const res = await fetch(url, {
        method: editingContact ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      })
      
      if (!res.ok) throw new Error('Failed to save contact')
      
      await fetchContacts()
      setShowModal(false)
      setEditingContact(null)
      showNotification(editingContact ? 'Contact updated!' : 'Contact added!')
    } catch (err) {
      showNotification(err.message, 'error')
    }
  }

  const handleDeleteContact = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return
    
    try {
      const res = await fetch(`${API_URL}/api/contacts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete contact')
      
      await fetchContacts()
      showNotification('Contact deleted')
    } catch (err) {
      showNotification(err.message, 'error')
    }
  }

  const handleSendEmail = async (contact) => {
    setSendingEmail(contact.id)
    try {
      const res = await fetch(`${API_URL}/api/contacts/${contact.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yourName: 'Chris Bennett',
          yourCompany: 'CHBS Holdings LLC',
          yourPhone: '555-123-4567'
        })
      })
      
      const result = await res.json()
      
      if (result.success) {
        showNotification(`Email sent to ${contact.email}!`)
        await fetchContacts()
      } else {
        throw new Error(result.error || 'Failed to send email')
      }
    } catch (err) {
      showNotification(err.message, 'error')
    } finally {
      setSendingEmail(null)
    }
  }

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchTerm || 
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.address?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = !filterType || contact.type === filterType
    const matchesStatus = !filterStatus || contact.status === filterStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  // Stats
  const stats = {
    total: contacts.length,
    new: contacts.filter(c => c.status === 'new' || !c.status).length,
    contacted: contacts.filter(c => c.status === 'contacted').length,
    interested: contacts.filter(c => c.status === 'interested').length,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Real Estate CRM</h1>
                <p className="text-xs text-slate-500">CHBS Holdings LLC</p>
              </div>
            </div>
            
            <button
              onClick={() => { setEditingContact(null); setShowModal(true) }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Contact
            </button>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in ${
          notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {notification.type === 'error' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {notification.message}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Total Leads</p>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">New</p>
            <p className="text-3xl font-bold text-blue-600">{stats.new}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Contacted</p>
            <p className="text-3xl font-bold text-amber-600">{stats.contacted}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Interested</p>
            <p className="text-3xl font-bold text-green-600">{stats.interested}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Types</option>
              {LEAD_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500">Loading contacts...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-600 font-medium mb-2">Failed to load contacts</p>
              <p className="text-slate-500 text-sm mb-4">{error}</p>
              <button
                onClick={fetchContacts}
                className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
              >
                Try again
              </button>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium mb-1">No contacts found</p>
              <p className="text-slate-400 text-sm">
                {contacts.length === 0 ? 'Add your first contact to get started' : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Contact</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Address</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Type</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Last Contact</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContacts.map((contact) => {
                    const typeInfo = LEAD_TYPES.find(t => t.value === contact.type) || LEAD_TYPES[4]
                    const statusInfo = STATUS_OPTIONS.find(s => s.value === contact.status) || STATUS_OPTIONS[0]
                    
                    return (
                      <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'No name'}</p>
                            <p className="text-sm text-slate-500">{contact.email}</p>
                            {contact.phone && <p className="text-sm text-slate-400">{contact.phone}</p>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 max-w-xs truncate">{contact.address || '—'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-500">
                            {contact.last_contacted_date 
                              ? new Date(contact.last_contacted_date).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSendEmail(contact)}
                              disabled={sendingEmail === contact.id || !contact.email}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Send Email"
                            >
                              {sendingEmail === contact.id ? (
                                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => { setEditingContact(contact); setShowModal(true) }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <ContactModal
          contact={editingContact}
          onSave={handleSaveContact}
          onClose={() => { setShowModal(false); setEditingContact(null) }}
        />
      )}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

function ContactModal({ contact, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: contact?.name || '',
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    address: contact?.address || '',
    type: contact?.type || 'outofstate',
    status: contact?.status || 'new',
    notes: contact?.notes || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Build name from firstName/lastName if name is empty
    const submitData = { ...formData }
    if (!submitData.name && (submitData.firstName || submitData.lastName)) {
      submitData.name = `${submitData.firstName} ${submitData.lastName}`.trim()
    }
    
    onSave(submitData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              {contact ? 'Edit Contact' : 'Add New Contact'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Property Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="123 Main St, City, State 12345"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lead Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {LEAD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {contact ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App
