import { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const LEAD_TYPES = [
  { value: 'divorce', label: 'Divorce', color: 'bg-purple-100 text-purple-800' },
  { value: 'probate', label: 'Probate', color: 'bg-blue-100 text-blue-800' },
  { value: 'foreclosure', label: 'Foreclosure', color: 'bg-red-100 text-red-800' },
  { value: 'taxlien', label: 'Tax Lien', color: 'bg-orange-100 text-orange-800' },
  { value: 'outofstate', label: 'Out of State', color: 'bg-green-100 text-green-800' },
]

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-gray-100 text-gray-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { value: 'interested', label: 'Interested', color: 'bg-green-100 text-green-800' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-100 text-red-800' },
  { value: 'closed', label: 'Closed', color: 'bg-purple-100 text-purple-800' },
]

const SENDER_CONFIG = {
  yourName: 'Dylan Bennett',
  yourCompany: 'ABC Real Estate',
  yourPhone: '(302) 922-4238'
}

function App() {
  const [contacts, setContacts] = useState([])  // Leads from database (people who replied)
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

  const showNotification = (message, type = 'success') => setNotification({ message, type })

  // Send bulk emails from CSV (does NOT save to database)
  const handleSendBulkEmails = async (csvData) => {
    setSendingBulk(true)
    setBulkProgress({ sent: 0, total: csvData.length })

    try {
      const res = await fetch(`${API_URL}/api/send-bulk-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: csvData,
          ...SENDER_CONFIG
        })
      })
      
      const result = await res.json()
      setBulkProgress({ sent: result.sent, total: csvData.length })
      showNotification(`Sent ${result.sent} emails${result.failed > 0 ? `, ${result.failed} failed` : ''}`)
      fetchEmailStats()
    } catch (err) {
      showNotification('Error sending emails: ' + err.message, 'error')
    } finally {
      setSendingBulk(false)
      setShowImportModal(false)
    }
  }

  const handleDeleteContact = async (id) => {
    if (!confirm('Delete this contact?')) return
    await fetch(`${API_URL}/api/contacts/${id}`, { method: 'DELETE' })
    await fetchContacts()
    showNotification('Contact deleted')
  }

  const handleSaveContact = async (data) => {
    const url = editingContact ? `${API_URL}/api/contacts/${editingContact.id}` : `${API_URL}/api/contacts`
    await fetch(url, {
      method: editingContact ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    await fetchContacts()
    setShowModal(false)
    setEditingContact(null)
    showNotification(editingContact ? 'Updated!' : 'Added!')
  }

  const handleSendEmail = async (contact) => {
    try {
      const res = await fetch(`${API_URL}/api/contacts/${contact.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SENDER_CONFIG)
      })
      const result = await res.json()
      if (result.success) {
        showNotification(`Email sent to ${contact.email}!`)
        fetchContacts()
        fetchEmailStats()
      } else {
        showNotification(result.error || 'Failed to send', 'error')
      }
    } catch (err) {
      showNotification('Error: ' + err.message, 'error')
    }
  }

  const filtered = contacts.filter(c => {
    const search = !searchTerm || [c.name, c.firstName, c.lastName, c.email, c.address].some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()))
    return search && (!filterType || c.type === filterType) && (!filterStatus || c.status === filterStatus)
  })

  const getTypeInfo = (type) => LEAD_TYPES.find(t => t.value === type?.toLowerCase()) || { label: type || 'Unknown', color: 'bg-gray-100 text-gray-800' }
  const getName = (c) => c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Real Estate CRM</h1>
            <p className="text-xs text-slate-500">{SENDER_CONFIG.yourCompany}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
              📧 Import & Send Emails
            </button>
            <button onClick={() => { setEditingContact(null); setShowModal(true) }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">+ Add Contact</button>
          </div>
        </div>
      </header>

      {sendingBulk && (
        <div className="bg-indigo-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <span>Sending emails... {bulkProgress.sent}/{bulkProgress.total}</span>
            <div className="flex-1 bg-indigo-400 rounded-full h-2">
              <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${(bulkProgress.sent / bulkProgress.total) * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white`}>
          {notification.message}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border">
            <p className="text-sm text-slate-500">Total Emails Sent</p>
            <p className="text-3xl font-bold text-green-600">{emailStats.totalSent}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border">
            <p className="text-sm text-slate-500">Leads in CRM</p>
            <p className="text-3xl font-bold text-indigo-600">{contacts.length}</p>
            <p className="text-xs text-slate-400">People who replied</p>
          </div>
          <div className="bg-white rounded-xl p-5 border">
            <p className="text-sm text-slate-500">Interested</p>
            <p className="text-3xl font-bold text-amber-600">{contacts.filter(c => c.status === 'interested').length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 mb-6 flex gap-4">
          <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="">All Types</option>
            {LEAD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Contacts Table - Only shows people added via Chrome extension */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-slate-50 border-b px-6 py-3">
            <h2 className="font-semibold text-slate-700">CRM Contacts (People Who Replied)</h2>
          </div>
          {loading ? <p className="p-8 text-center">Loading...</p> : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="mb-2">No contacts in CRM yet.</p>
              <p className="text-sm">When someone replies to your email, use the Chrome extension to add them here.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Address</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Added</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium">{getName(c)}</p>
                      <p className="text-sm text-slate-500">{c.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.address || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeInfo(c.type).color}`}>{getTypeInfo(c.type).label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_OPTIONS.find(s => s.value === c.status)?.color || 'bg-gray-100'}`}>
                        {STATUS_OPTIONS.find(s => s.value === c.status)?.label || c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleSendEmail(c)} className="p-2 hover:bg-indigo-50 rounded-lg" title="Send Email">📧</button>
                      <button onClick={() => { setEditingContact(c); setShowModal(true) }} className="p-2 hover:bg-amber-50 rounded-lg" title="Edit">✏️</button>
                      <button onClick={() => handleDeleteContact(c.id)} className="p-2 hover:bg-red-50 rounded-lg" title="Delete">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showModal && <ContactModal contact={editingContact} onSave={handleSaveContact} onClose={() => { setShowModal(false); setEditingContact(null) }} />}
      {showImportModal && <CSVImportModal onSend={handleSendBulkEmails} onClose={() => setShowImportModal(false)} />}
    </div>
  )
}

function ContactModal({ contact, onSave, onClose }) {
  const [form, setForm] = useState({
    firstName: contact?.firstName || '', lastName: contact?.lastName || '',
    email: contact?.email || '', phone: contact?.phone || '',
    address: contact?.address || '', type: contact?.type || 'outofstate',
    status: contact?.status || 'interested', notes: contact?.notes || ''
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-xl font-bold mb-4">{contact ? 'Edit Contact' : 'Add Contact'}</h2>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...form, name: `${form.firstName} ${form.lastName}`.trim() }) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="First Name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="px-4 py-2 border rounded-lg" />
            <input placeholder="Last Name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="px-4 py-2 border rounded-lg" />
          </div>
          <input placeholder="Email *" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          <input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="px-4 py-2 border rounded-lg">
              {LEAD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="px-4 py-2 border rounded-lg">
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg">{contact ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CSVImportModal({ onSend, onClose }) {
  const [data, setData] = useState([])
  const fileRef = useRef()

  const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    const map = { firstname: 'firstName', first_name: 'firstName', lastname: 'lastName', last_name: 'lastName', email: 'email', address: 'address', type: 'type', phone: 'phone' }
    const mapped = headers.map(h => map[h] || h)
    
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
      const row = {}
      mapped.forEach((h, i) => { if (vals[i]) row[h] = vals[i] })
      if (row.type) {
        const typeMap = { divorce: 'divorce', probate: 'probate', foreclosure: 'foreclosure', 'tax lien': 'taxlien', taxlien: 'taxlien', 'out of state': 'outofstate', outofstate: 'outofstate' }
        row.type = typeMap[row.type.toLowerCase()] || row.type.toLowerCase()
      }
      return row
    }).filter(r => r.email)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setData(parseCSV(ev.target.result))
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-xl font-bold mb-4">📧 Import CSV & Send Emails</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> Upload a CSV, and emails will be sent directly to everyone. 
            Contacts are NOT saved to your CRM - only people who reply and you add via the Chrome extension will appear in your CRM.
          </p>
        </div>

        <input type="file" ref={fileRef} accept=".csv" onChange={handleFile} className="hidden" />
        <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 mb-4">
          {data.length > 0 ? <p className="text-indigo-600 font-medium">{data.length} contacts ready to email</p> : <p className="text-slate-500">Click to upload CSV</p>}
        </div>

        <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm">
          <p className="font-medium">CSV columns: firstName, lastName, email, address, type</p>
          <p className="text-slate-500">Types: divorce, probate, foreclosure, taxlien, outofstate</p>
        </div>

        {data.length > 0 && (
          <div className="mb-4 max-h-40 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{r.firstName} {r.lastName}</td>
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2">{r.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 5 && <p className="text-center text-slate-400 text-xs py-2">+{data.length - 5} more</p>}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
          <button onClick={() => onSend(data)} disabled={data.length === 0} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
            Send {data.length} Emails
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
