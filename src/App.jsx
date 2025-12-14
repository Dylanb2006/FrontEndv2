import { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const LEAD_TYPES = [
  { value: '', label: 'Not Set', color: 'bg-slate-100 text-slate-600' },
  { value: 'divorce', label: 'Divorce', color: 'bg-violet-100 text-violet-700' },
  { value: 'probate', label: 'Probate', color: 'bg-sky-100 text-sky-700' },
  { value: 'foreclosure', label: 'Foreclosure', color: 'bg-rose-100 text-rose-700' },
  { value: 'taxlien', label: 'Tax Lien', color: 'bg-amber-100 text-amber-700' },
  { value: 'outofstate', label: 'Out of State', color: 'bg-emerald-100 text-emerald-700' },
]

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-slate-100 text-slate-600' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { value: 'interested', label: 'Interested', color: 'bg-green-100 text-green-700' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-100 text-red-700' },
  { value: 'closed', label: 'Closed', color: 'bg-purple-100 text-purple-700' },
]

const SENDER_CONFIG = {
  yourName: 'Dylan Bennett',
  yourCompany: 'ABC Real Estate',
  yourPhone: '(302) 922-4238'
}

function App() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [notification, setNotification] = useState(null)
  const [sendingBulk, setSendingBulk] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, total: 0 })
  const [emailStats, setEmailStats] = useState({ totalSent: 0 })
  const [sendingId, setSendingId] = useState(null)

  useEffect(() => { 
    fetchContacts()
    fetchEmailStats()
  }, [])

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
      if (!res.ok) throw new Error('Failed to fetch')
      setContacts(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmailStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/email-stats`)
      if (res.ok) setEmailStats(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  const notify = (message, type = 'success') => setNotification({ message, type })

  const handleSendBulkEmails = async (csvData) => {
    setSendingBulk(true)
    setBulkProgress({ sent: 0, total: csvData.length })

    try {
      const res = await fetch(`${API_URL}/api/send-bulk-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: csvData, ...SENDER_CONFIG })
      })
      
      const result = await res.json()
      setBulkProgress({ sent: result.sent, total: csvData.length })
      notify(`Successfully sent ${result.sent} emails` + (result.failed > 0 ? `. ${result.failed} failed.` : ''))
      fetchEmailStats()
    } catch (err) {
      notify('Error sending emails: ' + err.message, 'error')
    } finally {
      setSendingBulk(false)
      setShowImportModal(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return
    await fetch(`${API_URL}/api/contacts/${id}`, { method: 'DELETE' })
    await fetchContacts()
    notify('Contact deleted')
  }

  const handleSave = async (data) => {
    const url = editingContact ? `${API_URL}/api/contacts/${editingContact.id}` : `${API_URL}/api/contacts`
    await fetch(url, {
      method: editingContact ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    await fetchContacts()
    setShowModal(false)
    setEditingContact(null)
    notify(editingContact ? 'Contact updated' : 'Contact added')
  }

  const handleSendEmail = async (contact) => {
    setSendingId(contact.id)
    try {
      const res = await fetch(`${API_URL}/api/contacts/${contact.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SENDER_CONFIG)
      })
      const result = await res.json()
      if (result.success) {
        notify(`Email sent to ${contact.email}`)
        fetchContacts()
        fetchEmailStats()
      } else {
        notify(result.error || 'Failed to send email', 'error')
      }
    } catch (err) {
      notify('Error: ' + err.message, 'error')
    } finally {
      setSendingId(null)
    }
  }

  const filtered = contacts.filter(c => {
    const search = !searchTerm || [c.name, c.firstName, c.lastName, c.email, c.address].some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()))
    return search && (!filterType || c.type === filterType) && (!filterStatus || c.status === filterStatus)
  })

  const getTypeInfo = (type) => LEAD_TYPES.find(t => t.value === type?.toLowerCase()) || { label: type || 'Unknown', color: 'bg-slate-100 text-slate-600' }
  const getStatusInfo = (status) => STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
  const getName = (c) => c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{SENDER_CONFIG.yourCompany}</h1>
                <p className="text-sm text-slate-500">Lead Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Import & Send
              </button>
              <button
                onClick={() => { setEditingContact(null); setShowModal(true) }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Contact
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {sendingBulk && (
        <div className="bg-slate-900 text-white px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Sending emails: {bulkProgress.sent} of {bulkProgress.total}</span>
            <div className="flex-1 bg-slate-700 rounded-full h-1.5">
              <div className="bg-white rounded-full h-1.5 transition-all duration-300" style={{ width: `${(bulkProgress.sent / bulkProgress.total) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
          {notification.message}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Emails Sent</p>
                <p className="text-3xl font-semibold text-slate-900 mt-1">{emailStats.totalSent}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Contacts</p>
                <p className="text-3xl font-semibold text-slate-900 mt-1">{contacts.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Interested Leads</p>
                <p className="text-3xl font-semibold text-slate-900 mt-1">{contacts.filter(c => c.status === 'interested').length}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
              <option value="">All Types</option>
              {LEAD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Contacts</h2>
            <p className="text-sm text-slate-500 mt-0.5">Leads who have responded to your outreach</p>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Loading contacts...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p className="text-sm font-medium text-slate-900">No contacts found</p>
              <p className="text-sm text-slate-500 mt-1">{contacts.length === 0 ? 'Contacts will appear here when added via the Chrome extension' : 'Try adjusting your search or filters'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Contact</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Property</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Added</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{getName(c)}</p>
                      <p className="text-sm text-slate-500">{c.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{c.address || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getTypeInfo(c.type).color}`}>{getTypeInfo(c.type).label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getStatusInfo(c.status).color}`}>{getStatusInfo(c.status).label}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleSendEmail(c)} disabled={sendingId === c.id} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50" title="Send email">
                          {sendingId === c.id ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>}
                        </button>
                        <button onClick={() => { setEditingContact(c); setShowModal(true) }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showModal && <ContactModal contact={editingContact} onSave={handleSave} onClose={() => { setShowModal(false); setEditingContact(null) }} />}
      {showImportModal && <ImportModal onSend={handleSendBulkEmails} onClose={() => setShowImportModal(false)} />}
    </div>
  )
}

function ContactModal({ contact, onSave, onClose }) {
  const [form, setForm] = useState({
    firstName: contact?.firstName || '', lastName: contact?.lastName || '',
    email: contact?.email || '', phone: contact?.phone || '',
    address: contact?.address || '', type: contact?.type || '',
    status: contact?.status || 'interested', notes: contact?.notes || ''
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{contact ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...form, name: `${form.firstName} ${form.lastName}`.trim() }) }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Property Address</label>
            <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lead Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                {LEAD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">{contact ? 'Save Changes' : 'Add Contact'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ImportModal({ onSend, onClose }) {
  const [data, setData] = useState([])
  const [fileName, setFileName] = useState('')
  const fileRef = useRef()

  const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, '').replace(/\s+/g, ''))
    
    // Map common header variations
    const map = { 
      firstname: 'firstName', first_name: 'firstName', first: 'firstName',
      lastname: 'lastName', last_name: 'lastName', last: 'lastName',
      fullname: 'fullName', full_name: 'fullName', name: 'fullName',
      email: 'email', emailaddress: 'email', e_mail: 'email',
      phone: 'phone', phonenumber: 'phone', telephone: 'phone', cell: 'phone', mobile: 'phone',
      address: 'address', propertyaddress: 'address', property: 'address', streetaddress: 'address',
      type: 'type', leadtype: 'type', category: 'type'
    }
    const mapped = headers.map(h => map[h] || h)
    
    return lines.slice(1).filter(l => l.trim()).map(line => {
      // Handle commas inside parentheses (for phone numbers) and quotes
      const vals = []
      let current = ''
      let inParens = false
      let inQuotes = false
      for (const char of line) {
        if (char === '"' && !inParens) inQuotes = !inQuotes
        if (char === '(' && !inQuotes) inParens = true
        if (char === ')' && !inQuotes) inParens = false
        if (char === ',' && !inParens && !inQuotes) {
          vals.push(current.trim().replace(/^["']|["']$/g, ''))
          current = ''
        } else {
          current += char
        }
      }
      vals.push(current.trim().replace(/^["']|["']$/g, ''))
      
      const row = {}
      mapped.forEach((h, i) => { if (vals[i]) row[h] = vals[i] })
      
      // Split full name into firstName and lastName if needed
      if (row.fullName && !row.firstName) {
        const nameParts = row.fullName.trim().split(' ')
        row.firstName = nameParts[0] || ''
        row.lastName = nameParts.slice(1).join(' ') || ''
        row.name = row.fullName
      }
      
      // Build name from parts if we have them
      if (!row.name && (row.firstName || row.lastName)) {
        row.name = `${row.firstName || ''} ${row.lastName || ''}`.trim()
      }
      
      // Handle type - normalize if present, leave empty if not
      if (row.type) {
        const typeMap = { divorce: 'divorce', probate: 'probate', foreclosure: 'foreclosure', 'taxlien': 'taxlien', 'tax lien': 'taxlien', 'outofstate': 'outofstate', 'out of state': 'outofstate', 'outofsate': 'outofstate' }
        row.type = typeMap[row.type.toLowerCase()] || ''
      }
      
      return row
    }).filter(r => r.email || r.phone) // Keep if has email OR phone
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setData(parseCSV(ev.target.result))
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Import & Send Emails</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600">Upload a CSV file to send emails directly. Contacts are not saved to your CRM — only leads who respond and are added via the Chrome extension will appear in your contacts list.</p>
          </div>
          <input type="file" ref={fileRef} accept=".csv" onChange={handleFile} className="hidden" />
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 transition-colors">
            <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            {fileName ? <p className="text-sm font-medium text-slate-900">{fileName}</p> : <p className="text-sm text-slate-500">Click to upload CSV file</p>}
            {data.length > 0 && <p className="text-sm text-slate-500 mt-1">{data.length} contacts ready</p>}
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-700 mb-1">Flexible columns:</p>
            <p className="text-xs text-slate-500">Name, First Name, Last Name, Email, Phone, Address, Type</p>
            <p className="text-xs text-slate-400 mt-1">All fields optional except email or phone</p>
          </div>
          {data.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Name</th><th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Contact</th><th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Type</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.slice(0, 3).map((r, i) => <tr key={i}><td className="px-4 py-2 text-slate-900">{r.firstName || ''} {r.lastName || ''}</td><td className="px-4 py-2 text-slate-500">{r.email || r.phone || '—'}</td><td className="px-4 py-2 text-slate-500">{r.type || 'Not set'}</td></tr>)}
                </tbody>
              </table>
              {data.length > 3 && <p className="text-center text-xs text-slate-400 py-2 bg-slate-50">+{data.length - 3} more</p>}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={() => onSend(data)} disabled={data.length === 0} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">Send {data.length || ''} Emails</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

export default App
