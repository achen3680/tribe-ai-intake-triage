import { useCallback, useEffect, useRef, useState } from 'react'

type Tags = {
  industry: string
  budget: string
  timeline: string
}

type Intake = {
  id: number
  title: string
  description: string
  budget_range: string
  timeline: string
  industry: string
  created_at: string
  summary: string | null
  tags: Tags | null
  risks: string[] | null
  triage_status: 'complete' | 'unavailable'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(value))
}

function formatTag(value: string) {
  return value.replaceAll('-', ' ')
}

function Icon({ name, size = 20 }: { name: 'grid' | 'arrow' | 'close' | 'refresh' | 'search' | 'spark'; size?: number }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    arrow: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
    close: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.9-3" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.9 3" /><path d="M20 20v-4h-4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
    spark: <><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z" /><path d="m19 18 .6 1.4L21 20l-1.4.6L19 22l-.6-1.4L17 20l1.4-.6L19 18Z" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function App() {
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastSelectedRef = useRef<HTMLButtonElement | null>(null)

  const loadIntakes = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/intakes', { signal })
      if (!response.ok) throw new Error(`Request failed (${response.status})`)
      const data: Intake[] = await response.json()
      if (!Array.isArray(data)) throw new Error('Unexpected response')
      setIntakes(data.sort((a, b) => b.id - a.id))
    } catch (cause) {
      if (signal?.aborted) return
      setError(cause instanceof Error ? cause.message : 'Could not load intakes')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadIntakes(controller.signal)
    return () => controller.abort()
  }, [loadIntakes])

  useEffect(() => {
    if (selectedId === null) return
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedId(null)
        lastSelectedRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  const visibleIntakes = intakes.filter((intake) =>
    [intake.title, intake.description, intake.industry, intake.summary ?? '']
      .some((value) => value.toLowerCase().includes(query.trim().toLowerCase())),
  )
  const selected = intakes.find((intake) => intake.id === selectedId)

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand-mark" aria-label="Tribe AI"><span>t</span><span className="brand-dot">.</span></div>
        <div className="nav-item active" aria-current="page" title="Intakes"><Icon name="grid" size={19} /><span>Intakes</span></div>
        <div className="sidebar-spacer" />
        <div className="sidebar-caption">INTAKE<br />WORKSPACE</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>Intakes</strong></div>
          <div className="topbar-label"><span className="live-dot" /> Intake overview</div>
        </header>

        <div className="page-content">
          <section className="page-heading" aria-labelledby="page-title">
            <div>
              <div className="eyebrow">PROJECT PIPELINE <span className="eyebrow-line" /></div>
              <h1 id="page-title">Intakes<span className="heading-period">.</span></h1>
              <p>A clear view of every opportunity coming through the door.</p>
            </div>
            <div className="heading-meta"><span>ALL RECORDS</span><strong>{loading ? '—' : intakes.length.toString().padStart(2, '0')}</strong></div>
          </section>

          <section className="list-section" aria-label="All intakes">
            <div className="section-toolbar">
              <div className="section-title"><span className="section-indicator" />All intakes <span className="record-count">{intakes.length}</span></div>
              <div className="toolbar-actions">
                <label className="search-field"><Icon name="search" size={17} /><span className="sr-only">Search intakes</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search intakes" type="search" /></label>
                <button className="icon-button" type="button" onClick={() => void loadIntakes()} aria-label="Refresh intakes" title="Refresh intakes"><Icon name="refresh" size={18} /></button>
              </div>
            </div>

            {loading ? (
              <div className="state-panel" role="status"><div className="loading-spinner" /><h2>Loading intakes</h2><p>Getting the latest records from the workspace.</p></div>
            ) : error ? (
              <div className="state-panel" role="alert"><div className="state-symbol">!</div><h2>Intakes couldn’t load</h2><p>Check that the API is running, then try again. {error}</p><button className="primary-button" onClick={() => void loadIntakes()}>Try again <Icon name="arrow" size={17} /></button></div>
            ) : intakes.length === 0 ? (
              <div className="state-panel"><div className="state-symbol">0</div><h2>No intakes yet</h2><p>New submissions will appear here as soon as they’re saved.</p></div>
            ) : visibleIntakes.length === 0 ? (
              <div className="state-panel"><div className="state-symbol"><Icon name="search" size={23} /></div><h2>No matching intakes</h2><p>Try a different title, description, or industry.</p><button className="text-button" onClick={() => setQuery('')}>Clear search</button></div>
            ) : (
              <div className="intake-list">
                <div className="list-header"><span>OPPORTUNITY</span><span>INDUSTRY</span><span>DATE ADDED</span><span>TRIAGE</span><span /></div>
                {visibleIntakes.map((intake) => (
                  <button className="intake-row" type="button" key={intake.id} onClick={(event) => { lastSelectedRef.current = event.currentTarget; setSelectedId(intake.id) }} aria-label={`View ${intake.title}`}>
                    <span className="opportunity-cell"><span className="intake-title">{intake.title}</span><span className="intake-excerpt">{intake.summary || intake.description}</span></span>
                    <span className="industry-cell">{intake.industry}</span>
                    <span className="date-cell">{formatDate(intake.created_at)}</span>
                    <span className={`status-badge ${intake.triage_status === 'complete' ? 'status-complete' : 'status-pending'}`}><span />{intake.triage_status === 'complete' ? 'Triaged' : 'Needs review'}</span>
                    <span className="row-arrow"><Icon name="arrow" size={18} /></span>
                  </button>
                ))}
              </div>
            )}
          </section>
          <footer className="page-footer"><span>TRIBE AI <span className="footer-separator">/</span> INTAKE WORKSPACE</span><span>{visibleIntakes.length} {visibleIntakes.length === 1 ? 'record' : 'records'} shown</span></footer>
        </div>
      </main>

      {selected && <div className="drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null) }}>
        <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
          <div className="drawer-top"><span>INTAKE / {String(selected.id).padStart(3, '0')}</span><button ref={closeButtonRef} className="icon-button" type="button" aria-label="Close details" onClick={() => { setSelectedId(null); lastSelectedRef.current?.focus() }}><Icon name="close" size={20} /></button></div>
          <div className="drawer-content">
            <div className="drawer-eyebrow">OPPORTUNITY DETAILS</div>
            <h2 id="detail-title">{selected.title}</h2>
            <div className="drawer-subline">Added {formatDate(selected.created_at)} <span>·</span> {selected.industry}</div>
            <div className="detail-divider" />
            <section className="detail-section"><h3>Description</h3><p>{selected.description}</p></section>
            <div className="detail-facts"><div><span>BUDGET RANGE</span><strong>{selected.budget_range}</strong></div><div><span>TIMELINE</span><strong>{selected.timeline}</strong></div></div>
            <section className="detail-section ai-section"><h3><Icon name="spark" size={18} /> AI summary</h3><p>{selected.summary || 'AI triage is unavailable for this intake. The submitted details are still saved.'}</p></section>
            {selected.tags && <section className="detail-section"><h3>Classification</h3><div className="tags"><span>{formatTag(selected.tags.industry)}</span><span>{formatTag(selected.tags.budget)} budget</span><span>{formatTag(selected.tags.timeline)} timeline</span></div></section>}
            {selected.risks && selected.risks.length > 0 && <section className="detail-section"><h3>Risks to review</h3><ul className="risk-list">{selected.risks.map((risk, index) => <li key={`${index}-${risk}`}>{risk}</li>)}</ul></section>}
          </div>
        </aside>
      </div>}
    </div>
  )
}

export default App
