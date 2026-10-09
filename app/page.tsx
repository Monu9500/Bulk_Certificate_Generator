'use client'

import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { ArrowDownToLine, Award, Check, FileUp, LoaderCircle, Plus, Wifi, X } from 'lucide-react'

type Recipient = { name: string; email: string }
type Job = {
  job_id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  total_recipients: number
  processed_count: number
  success_count: number
  failure_count: number
}
type Result = {
  recipient_id: string
  name: string
  email: string
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
  download_url: string | null
  error_message: string | null
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')
const today = new Date().toISOString().slice(0, 10)

export default function Page() {
  const [eventName, setEventName] = useState('')
  const [issueDate, setIssueDate] = useState(today)
  const [recipients, setRecipients] = useState<Recipient[]>([{ name: '', email: '' }])
  const [job, setJob] = useState<Job | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [apiOnline, setApiOnline] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`${API_URL}/health`)
      .then((response) => {
        if (active) setApiOnline(response.ok)
      })
      .catch(() => {
        if (active) setApiOnline(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!job || job.status === 'COMPLETED' || job.status === 'FAILED') return
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/api/jobs/${job.job_id}`)
        if (!response.ok) throw new Error('Could not check generation progress.')
        const latest: Job = await response.json()
        if (active) setJob(latest)
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Could not check generation progress.')
      }
    }, 900)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [job])

  useEffect(() => {
    if (!job || (job.status !== 'COMPLETED' && job.status !== 'FAILED')) return
    let active = true
    fetch(`${API_URL}/api/jobs/${job.job_id}/results`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load certificate results.')
        return response.json()
      })
      .then((data: { results: Result[] }) => {
        if (active) setResults(data.results)
      })
      .catch((fetchError: unknown) => {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Could not load certificate results.')
      })
    return () => {
      active = false
    }
  }, [job])

  function updateRecipient(index: number, field: keyof Recipient, value: string) {
    setRecipients((current) => current.map((recipient, row) => row === index ? { ...recipient, [field]: value } : recipient))
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const lines = (await file.text()).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      const imported = lines.map((line) => {
        const [name = '', email = ''] = line.split(',').map((value) => value.trim().replace(/^"|"$/g, ''))
        return { name, email }
      }).filter((row, index) => !(index === 0 && /name/i.test(row.name) && /email/i.test(row.email)))
      if (!imported.length) throw new Error('No recipient rows found in that CSV.')
      setRecipients(imported)
      setError('')
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Could not read that CSV file.')
    }
    event.target.value = ''
  }

  async function submitJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setJob(null)
    setResults([])
    try {
      const response = await fetch(`${API_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_name: eventName.trim(), issue_date: issueDate, recipients }),
      })
      const data = await response.json()
      if (!response.ok) {
        const detail = Array.isArray(data.detail) ? data.detail.map((item: { msg: string }) => item.msg).join(' ') : data.detail
        throw new Error(detail || 'Could not create the certificate job.')
      }
      setJob({ ...data, processed_count: 0, success_count: 0, failure_count: 0 })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not connect to the certificate API.')
    } finally {
      setBusy(false)
    }
  }

  const progress = job ? Math.round((job.processed_count / Math.max(job.total_recipients, 1)) * 100) : 0

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Certwork home">
          <span className="brand-mark"><Award size={21} strokeWidth={1.8} /></span>
          <span>certwork<span className="brand-period">.</span></span>
        </a>
        <div className={`api-status ${apiOnline ? 'online' : ''}`} aria-live="polite">
          <span className="status-dot" />
          <span>{apiOnline ? 'API connected' : 'API offline'}</span>
        </div>
      </header>

      <section className="intro" id="top">
        <div className="intro-copy">
          <p className="eyebrow">CERTIFICATE STUDIO <span> / </span> NEW BATCH</p>
          <h1>Make recognition<br /><em>worth keeping.</em></h1>
          <p className="intro-note">Create a batch, add your recipients, and send every name a certificate of their own.</p>
        </div>
        <div className="certificate-art" aria-hidden="true">
          <div className="art-sheet">
            <span className="art-rule" />
            <Award size={38} strokeWidth={1.2} />
            <span className="art-caption">CERTIFICATE<br />OF ACHIEVEMENT</span>
            <span className="art-line" />
            <span className="art-seal">CW</span>
          </div>
          <span className="art-index">NO. 001 — READY TO ISSUE</span>
        </div>
      </section>

      <div className="workspace">
        <form className="batch-form" onSubmit={submitJob}>
          <section className="form-section">
            <div className="section-heading">
              <span className="step-number">01</span>
              <div><h2>Batch details</h2><p>Set the occasion and issue date.</p></div>
            </div>
            <div className="field-grid">
              <label className="field event-field">
                <span>EVENT OR COURSE NAME</span>
                <input value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="e.g. Product Design Intensive" minLength={2} maxLength={150} required />
              </label>
              <label className="field date-field">
                <span>ISSUE DATE</span>
                <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
              </label>
            </div>
          </section>

          <section className="form-section recipients-section">
            <div className="section-heading recipients-heading">
              <span className="step-number">02</span>
              <div><h2>Recipients <span className="count-pill">{recipients.length}</span></h2><p>Add people individually or import a CSV.</p></div>
              <label className="import-button">
                <FileUp size={16} /> Import CSV
                <input type="file" accept=".csv,text/csv" onChange={importCsv} />
              </label>
            </div>
            <div className="recipient-table">
              <div className="recipient-labels"><span>FULL NAME</span><span>EMAIL ADDRESS</span><span aria-label="Actions" /></div>
              {recipients.map((recipient, index) => (
                <div className="recipient-row" key={index}>
                  <label className="sr-only" htmlFor={`name-${index}`}>Recipient {index + 1} name</label>
                  <input id={`name-${index}`} value={recipient.name} onChange={(event) => updateRecipient(index, 'name', event.target.value)} placeholder="Full name" minLength={2} maxLength={120} required />
                  <label className="sr-only" htmlFor={`email-${index}`}>Recipient {index + 1} email</label>
                  <input id={`email-${index}`} type="email" value={recipient.email} onChange={(event) => updateRecipient(index, 'email', event.target.value)} placeholder="name@example.com" required />
                  <button className="icon-button remove-button" type="button" aria-label={`Remove recipient ${index + 1}`} title="Remove recipient" disabled={recipients.length === 1} onClick={() => setRecipients((current) => current.filter((_, row) => row !== index))}><X size={17} /></button>
                </div>
              ))}
              <button className="add-recipient" type="button" onClick={() => setRecipients((current) => [...current, { name: '', email: '' }])}><Plus size={16} /> Add another recipient</button>
            </div>
          </section>

          {error && <div className="error-message" role="alert"><span>{error}</span><button className="icon-button" type="button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
          <div className="form-footer">
            <p>Up to 1,000 recipients per batch</p>
            <button className="submit-button" type="submit" disabled={busy || !apiOnline}>
              {busy ? <LoaderCircle size={17} className="spin" /> : <Award size={17} />}
              {busy ? 'Starting batch…' : 'Generate certificates'}
            </button>
          </div>
          {!apiOnline && <p className="connection-hint"><Wifi size={14} /> Start the FastAPI server at {API_URL} to generate a batch.</p>}
        </form>

        <aside className="batch-panel" aria-live="polite">
          <div className="panel-topline"><span>LIVE BATCH</span><span className="panel-marker">{job ? `#${job.job_id.slice(0, 6).toUpperCase()}` : '—'}</span></div>
          {!job ? (
            <div className="empty-state">
              <div className="empty-icon"><Award size={23} strokeWidth={1.5} /></div>
              <h2>Your batch<br />will appear here.</h2>
              <p>Once you generate certificates, progress and download links will show up in this panel.</p>
              <div className="empty-rule"><span /></div>
              <span className="empty-footnote">READY WHEN YOU ARE</span>
            </div>
          ) : (
            <div className="job-content">
              <div className="job-state"><span className={`job-indicator ${job.status.toLowerCase()}`} />{job.status === 'COMPLETED' ? 'Batch complete' : job.status === 'FAILED' ? 'Batch finished with errors' : 'Creating certificates'}<span className="job-percent">{progress}%</span></div>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
              <div className="progress-count"><strong>{job.processed_count}</strong> of {job.total_recipients} processed</div>
              <div className="result-summary"><div><strong>{job.success_count}</strong><span>Ready</span></div><div><strong>{job.failure_count}</strong><span>Failed</span></div></div>
              <div className="results-list">
                <div className="results-title">RECIPIENT RESULTS</div>
                {results.map((result) => (
                  <div className="result-row" key={result.recipient_id}>
                    <span className={`result-check ${result.status === 'SUCCESS' ? 'success' : 'failed'}`}>{result.status === 'SUCCESS' ? <Check size={13} /> : <X size={13} />}</span>
                    <span className="result-person"><strong>{result.name}</strong><small>{result.email}</small></span>
                    {result.download_url ? <a className="download-link" href={result.download_url} aria-label={`Download certificate for ${result.name}`} title={`Download ${result.name}'s certificate`}><ArrowDownToLine size={17} /></a> : <span className="failed-tag">Failed</span>}
                  </div>
                ))}
                {results.length === 0 && job.status !== 'COMPLETED' && job.status !== 'FAILED' && <div className="results-loading"><LoaderCircle size={15} className="spin" /> Preparing recipient files</div>}
              </div>
            </div>
          )}
          <div className="panel-bottom"><span>PDF</span><span>LANDSCAPE · A4</span></div>
        </aside>
      </div>

      <footer className="page-footer"><span>CERTWORK <span className="brand-period">.</span></span><span>Made for moments that matter.</span><a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">API documentation <ArrowDownToLine size={13} /></a></footer>
    </main>
  )
}
