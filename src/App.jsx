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

const PIPELINE_STAGES = [
  { value: 'new', label: 'New Leads', color: 'bg-slate-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { value: 'interested', label: 'Interested', color: 'bg-amber-500' },
  { value: 'negotiating', label: 'Negotiating', color: 'bg-purple-500' },
  { value: 'closed', label: 'Closed', color: 'bg-green-500' },
]

const SENDER_CONFIG = {
  yourName: 'Dylan Bennett',
  yourCompany: 'ABC Real Estate',
  yourPhone: '(302) 922-4238'
}

function App() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('pipeline')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [notification, setNotification] = useState(null)
  const [sendingBulk, setSendingBulk] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, total: 0 })
  const [emailStats, setEmailStats] = useState({ totalSent: 0 })
  const [draggedContact, setDraggedContact] = useState(null)
  const [followUps, setFollowUps] = useState([])
  const [sendingFollowUps, setSendingFollowUps] = useState(false)

  useEffect(() => { 
    fetchContacts()
    fetchEmailStats()
    fetchFollowUps()
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

  const fetchFollowUps = async () => {
    try {
      const res = await fetch(`${API_URL}/api/follow-ups`)
      if (res.ok) setFollowUps(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendFollowUps = async () => {
    if (!confirm(`Send follow-up emails to ${followUps.length} contacts who haven't replied?`)) return
    setSendingFollowUps(true)
    try {
      const res = await fetch(`${API_URL}/api/send-follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SENDER_CONFIG)
      })
      const result = await res.json()
      notify(`Sent ${result.sent} follow-up emails` + (result.failed > 0 ? `. ${result.failed} failed.` : ''))
      fetchFollowUps()
      fetchEmailStats()
    } catch (err) {
      notify('Error: ' + err.message, 'error')
    } finally {
      setSendingFollowUps(false)
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
      notify(`Sent ${result.sent} emails` + (result.failed > 0 ? `. ${result.failed} failed.` : ''))
      fetchEmailStats()
      fetchFollowUps()
    } catch (err) {
      notify('Error: ' + err.message, 'error')
    } finally {
      setSendingBulk(false)
      setShowImportModal(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return
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

  const handleUpdateStatus = async (id, status) => {
    await fetch(`${API_URL}/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    await fetchContacts()
  }

  const handleDragStart = (e, contact) => {
    setDraggedContact(contact)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => e.preventDefault()

  const handleDrop = async (e, newStatus) => {
    e.preventDefault()
    if (draggedContact && draggedContact.status !== newStatus) {
      await handleUpdateStatus(draggedContact.id, newStatus)
      notify(`Moved to ${PIPELINE_STAGES.find(s => s.value === newStatus)?.label}`)
    }
    setDraggedContact(null)
  }

  const filtered = contacts.filter(c => {
    const match = !searchTerm || [c.name, c.firstName, c.lastName, c.email, c.address, c.phone].some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()))
    return match && (!filterType || c.type === filterType)
  })

  const getContactsByStatus = (status) => filtered.filter(c => (c.status || 'new') === status)
  const getTypeInfo = (type) => LEAD_TYPES.find(t => t.value === type?.toLowerCase()) || LEAD_TYPES[0]
  const getName = (c) => c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900">{SENDER_CONFIG.yourCompany}</h1>
                <p className="text-xs text-slate-500">Lead Pipeline</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setView('pipeline')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'pipeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Pipeline</button>
              <button onClick={() => setView('table')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Table</button>
              <button onClick={() => setView('followups')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'followups' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                Follow-ups {followUps.length > 0 && <span className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{followUps.length}</span>}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setShowImportModal(true)} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                Import
              </button>
              <button onClick={() => { setEditingContact(null); setShowModal(true) }} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add
              </button>
            </div>
          </div>
        </div>
      </header>

      {sendingBulk && (
        <div className="bg-slate-900 text-white px-6 py-2">
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Sending: {bulkProgress.sent}/{bulkProgress.total}</span>
            <div className="flex-1 bg-slate-700 rounded-full h-1.5">
              <div className="bg-white rounded-full h-1.5 transition-all" style={{ width: `${(bulkProgress.sent / bulkProgress.total) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
          {notification.message}
        </div>
      )}

      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Emails Sent:</span>
            <span className="text-sm font-semibold text-slate-900">{emailStats.totalSent}</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Total Leads:</span>
            <span className="text-sm font-semibold text-slate-900">{contacts.length}</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="relative w-64">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white">
            <option value="">All Types</option>
            {LEAD_TYPES.filter(t => t.value).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <main className="p-4">
        {view === 'pipeline' && (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map(stage => (
              <div key={stage.value} className="flex-1 min-w-[240px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.value)}>
                <div className={`${stage.color} rounded-t-lg px-4 py-2 flex items-center justify-between`}>
                  <h3 className="text-sm font-semibold text-white">{stage.label}</h3>
                  <span className="text-xs font-medium text-white/80 bg-white/20 px-2 py-0.5 rounded-full">{getContactsByStatus(stage.value).length}</span>
                </div>
                <div className="bg-slate-50 border border-t-0 border-slate-200 rounded-b-lg min-h-[calc(100vh-240px)] p-2 space-y-2">
                  {loading ? (
                    <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>
                  ) : getContactsByStatus(stage.value).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No leads</div>
                  ) : (
                    getContactsByStatus(stage.value).map(contact => (
                      <div key={contact.id} draggable onDragStart={(e) => handleDragStart(e, contact)} className="bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{getName(contact)}</p>
                            <p className="text-xs text-slate-500 truncate">{contact.email || contact.phone || '—'}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <button onClick={() => { setEditingContact(contact); setShowModal(true) }} className="p-1 text-slate-400 hover:text-slate-600"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg></button>
                            <button onClick={() => handleDelete(contact.id)} className="p-1 text-slate-400 hover:text-red-600"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                          </div>
                        </div>
                        {contact.address && <p className="text-xs text-slate-500 truncate mb-2">{contact.address}</p>}
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getTypeInfo(contact.type).color}`}>{getTypeInfo(contact.type).label}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'table' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Contact</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Phone</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Property</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{getName(c)}</p>
                      <p className="text-sm text-slate-500">{c.email || '—'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{c.address || '—'}</td>
                    <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getTypeInfo(c.type).color}`}>{getTypeInfo(c.type).label}</span></td>
                    <td className="px-6 py-4">
                      <select value={c.status || 'new'} onChange={(e) => handleUpdateStatus(c.id, e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 bg-white">
                        {PIPELINE_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditingContact(c); setShowModal(true) }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg></button>
                        <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-slate-500">No contacts found</div>}
          </div>
        )}

        {view === 'followups' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Follow-ups Needed</h2>
                <p className="text-sm text-slate-500">People who were emailed but haven't replied</p>
              </div>
              <button onClick={handleSendFollowUps} disabled={followUps.length === 0 || sendingFollowUps} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50">
                {sendingFollowUps ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg> Send All ({followUps.length})</>
                )}
              </button>
            </div>
            {followUps.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm font-medium text-slate-900">All caught up!</p>
                <p className="text-sm text-slate-500">No pending follow-ups</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Contact</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Property</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Times Emailed</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Last Emailed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {followUps.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">{f.name || '—'}</p>
                        <p className="text-sm text-slate-500">{f.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{f.address || '—'}</td>
                      <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getTypeInfo(f.type).color}`}>{getTypeInfo(f.type).label}</span></td>
                      <td className="px-6 py-4"><span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{f.email_count}x</span></td>
                      <td className="px-6 py-4 text-sm text-slate-500">{f.sent_at ? new Date(f.sent_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
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
    status: contact?.status || 'new', notes: contact?.notes || ''
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{contact ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...form, name: `${form.firstName} ${form.lastName}`.trim() }) }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">First Name</label><input type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label><input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Property Address</label><input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">{LEAD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">{PIPELINE_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Add notes..." /></div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">{contact ? 'Save' : 'Add'}</button>
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
    const map = { firstname: 'firstName', first_name: 'firstName', lastname: 'lastName', last_name: 'lastName', fullname: 'fullName', full_name: 'fullName', name: 'fullName', email: 'email', emailaddress: 'email', phone: 'phone', phonenumber: 'phone', telephone: 'phone', cell: 'phone', mobile: 'phone', address: 'address', propertyaddress: 'address', type: 'type', leadtype: 'type' }
    const mapped = headers.map(h => map[h] || h)
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = []
      let current = '', inParens = false, inQuotes = false
      for (const char of line) {
        if (char === '"' && !inParens) inQuotes = !inQuotes
        if (char === '(' && !inQuotes) inParens = true
        if (char === ')' && !inQuotes) inParens = false
        if (char === ',' && !inParens && !inQuotes) { vals.push(current.trim().replace(/^["']|["']$/g, '')); current = '' }
        else current += char
      }
      vals.push(current.trim().replace(/^["']|["']$/g, ''))
      const row = {}
      mapped.forEach((h, i) => { if (vals[i]) row[h] = vals[i] })
      if (row.fullName && !row.firstName) { const parts = row.fullName.trim().split(' '); row.firstName = parts[0] || ''; row.lastName = parts.slice(1).join(' ') || ''; row.name = row.fullName }
      if (!row.name && (row.firstName || row.lastName)) row.name = `${row.firstName || ''} ${row.lastName || ''}`.trim()
      if (row.type) { const typeMap = { divorce: 'divorce', probate: 'probate', foreclosure: 'foreclosure', taxlien: 'taxlien', 'tax lien': 'taxlien', outofstate: 'outofstate', 'out of state': 'outofstate' }; row.type = typeMap[row.type.toLowerCase()] || '' }
      return row
    }).filter(r => r.email || r.phone)
  }

  const handleFile = (e) => { const file = e.target.files[0]; if (!file) return; setFileName(file.name); const reader = new FileReader(); reader.onload = (ev) => setData(parseCSV(ev.target.result)); reader.readAsText(file) }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Import & Send</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">Upload CSV to send emails. Only contacts with emails will receive messages.</p>
          <input type="file" ref={fileRef} accept=".csv" onChange={handleFile} className="hidden" />
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400">
            <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            {fileName ? <p className="text-sm font-medium text-slate-900">{fileName}</p> : <p className="text-sm text-slate-500">Click to upload CSV</p>}
            {data.length > 0 && <p className="text-sm text-slate-500 mt-1">{data.length} contacts ready</p>}
          </div>
          {data.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Name</th><th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Contact</th><th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Type</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{data.slice(0, 3).map((r, i) => <tr key={i}><td className="px-4 py-2">{r.firstName} {r.lastName}</td><td className="px-4 py-2 text-slate-500">{r.email || r.phone}</td><td className="px-4 py-2 text-slate-500">{r.type || '—'}</td></tr>)}</tbody>
              </table>
              {data.length > 3 && <p className="text-center text-xs text-slate-400 py-2 bg-slate-50">+{data.length - 3} more</p>}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={() => onSend(data)} disabled={!data.length} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50">Send {data.length} Emails</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
