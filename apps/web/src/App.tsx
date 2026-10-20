import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { Camera, CheckCircle2, ChevronRight, ClipboardList, Compass, LifeBuoy, LoaderCircle, LogOut, MapPin, MessageCircle, ShieldCheck, Waves } from 'lucide-react'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { LanguageProvider, LanguageSwitch, Txt, useLanguage, useText } from './i18n'
import 'leaflet/dist/leaflet.css'
import './styles.css'

type Category = 'flooding' | 'potholes' | 'fallen_trees' | 'uncollected_garbage' | 'damaged_signage'
type Status = 'Pending' | 'Under Verification' | 'Accepted' | 'In Progress' | 'Resolved' | 'Rejected'
type User = { id: string; email: string; role: 'resident' | 'staff' | 'administrator' }
type Event = { id?: string; to_status?: Status; created_at?: string; note?: string }
type Action = { id: string; kind: 'action' | 'coordination'; note: string; created_at: string }
type Duplicate = { id: string; candidate_report_id: string; score: number; decision: 'pending' | 'confirmed' | 'rejected' }
type DuplicateResult = { embedding_available: boolean; suggestions: Duplicate[]; manual_review_required: boolean }
type Report = { id: string; status: Status; resident_category: Category; model_category?: Category | null; verified_category?: Category | null; description?: string | null; latitude?: number; longitude?: number; created_at?: string; events?: Event[]; actions?: Action[] }
type Prediction = { prediction_available: boolean; model_category: Category | null; confidence: number | null }
type Notice = { id: string; report_id: string; status: Status; created_at: string; read_at: string | null }
const categories: { value: Category; label: string }[] = [
  { value: 'flooding', label: 'Flooding' }, { value: 'potholes', label: 'Potholes' },
  { value: 'fallen_trees', label: 'Fallen trees' }, { value: 'uncollected_garbage', label: 'Uncollected garbage' },
  { value: 'damaged_signage', label: 'Damaged signage' },
]
const label = (category?: Category | null) => categories.find(item => item.value === category)?.label ?? 'Not set'
function DateText({ value }: { value: string }) { const { language } = useLanguage(); return <>{new Date(value).toLocaleString(language === 'fil' ? 'fil-PH' : 'en-PH')}</> }

function csrfToken() {
  const cookie = document.cookie.split('; ').find(part => part.startsWith('csrf_token='))
  return cookie ? decodeURIComponent(cookie.slice(11)) : ''
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.method && init.method !== 'GET' && csrfToken()) headers.set('X-CSRF-Token', csrfToken())
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetch(`/api${path}`, { ...init, credentials: 'include', headers })
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    throw new Error(typeof problem?.detail === 'string' ? problem.detail : `Request failed (${response.status})`)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

function Auth({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(false)
  useEffect(() => {
    void api<{ enabled: boolean }>('/auth/google/config').then(config => setGoogleEnabled(config.enabled)).catch(() => {})
    const errors: Record<string, string> = {
      google_cancelled: 'Google sign-in was cancelled. Try again or use your password.',
      google_invalid_state: 'Google sign-in expired. Please try again.',
      google_failed: 'Google sign-in is unavailable right now. Try again or use your password.',
      google_email_unverified: 'Use a verified Google email address to sign in.',
      google_account_exists: 'This email already has an account. Sign in with your password.',
      google_resident_only: 'Google sign-in is available for resident accounts only.',
    }
    const code = new URLSearchParams(window.location.search).get('auth_error')
    if (code && errors[code]) { setError(errors[code]); window.history.replaceState(null, '', window.location.pathname) }
  }, [])
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { onLogin(await api<User>(`/auth/${mode}`, { method: 'POST', body: JSON.stringify({ email, password }) })) }
    catch (caught) { setError((caught as Error).message) } finally { setBusy(false) }
  }
  return <main className="auth-shell"><div className="auth-intro"><div className="brand-mark"><Waves size={25} /></div><span className="eyebrow"><Txt>Your barangay, better connected</Txt></span><h1><Txt>Community concerns, </Txt><em><Txt>clearly reported.</Txt></em></h1><p><Txt>Share what you see, pin where it happened, and follow every report from submission to resolution.</Txt></p><div className="auth-points"><span><Camera size={18} /> <Txt>Photo guided reports</Txt></span><span><MapPin size={18} /> <Txt>Precise locations</Txt></span><span><ShieldCheck size={18} /> <Txt>Barangay verified</Txt></span></div></div><form className="auth-card" onSubmit={submit}><LanguageSwitch /><span className="eyebrow">BarangAI Watch</span><h2><Txt>{mode === 'login' ? 'Welcome back' : 'Create an account'}</Txt></h2><p><Txt>{mode === 'login' ? 'Sign in to track concerns in your community.' : 'Join your barangay reporting channel.'}</Txt></p><label><Txt>Email address</Txt><Input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label><label><Txt>Password</Txt><Input type="password" required minLength={mode === 'register' ? 12 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <p className="alert error" role="alert"><Txt>{error}</Txt></p>}<Button variant="default" className="button primary" type="submit" disabled={busy}><Txt>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</Txt> <ChevronRight size={17} /></Button>{googleEnabled && <a className="button outline google-sign-in" href="/api/auth/google/start"><Txt>Continue with Google</Txt></a>}<button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}><Txt>{mode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}</Txt></button></form></main>
}

function MapPicker({ latitude, longitude, onPick }: { latitude: number | null; longitude: number | null; onPick: (lat: number, lng: number) => void }) {
  const t = useText()
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!element) return
    let alive = true
    let dispose = () => {}
    void import('leaflet').then(L => {
      if (!alive) return
      const center: [number, number] = [latitude ?? 14.3269, longitude ?? 120.9364]
      const map = L.map(element, { zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView(center, latitude === null ? 12 : 16, { animate: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
      const pin = L.circleMarker(center, { radius: 9, color: '#075d79', fillColor: '#0b83a5', fillOpacity: 1 }).addTo(map)
      map.on('click', event => { pin.setLatLng(event.latlng); onPick(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6))) })
      dispose = () => { map.stop(); map.remove() }
    })
    return () => { alive = false; dispose() }
    // Create a fresh map when the picker opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element])
  return <div ref={setElement} className="location-map" role="application" aria-label={t('Click the map to adjust the report pin')} />
}

function ReportForm({ onCreated }: { onCreated: () => void }) {
  const t = useText()
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [category, setCategory] = useState<Category | ''>('')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!photo || typeof URL.createObjectURL !== 'function') return
    const url = URL.createObjectURL(photo); setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])
  useEffect(() => {
    if (!photo) return
    const controller = new AbortController()
    const form = new FormData(); form.set('image', photo)
    void api<Prediction>('/reports/predict', { method: 'POST', body: form, signal: controller.signal })
      .then(result => { setPrediction(result); if (result.model_category) setCategory(current => current || result.model_category!) })
      .catch(() => { if (!controller.signal.aborted) setPrediction({ prediction_available: false, model_category: null, confidence: null }) })
    return () => controller.abort()
  }, [photo])
  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhoto(null); setPreview(''); setCategory(''); setPrediction(null); setMessage(''); setError('')
    // Reset native inputs so selecting the same photo again still fires change.
    event.target.value = ''
    if (/\.hei[cf]$/i.test(file.name) || ['image/heic', 'image/heif'].includes(file.type)) {
      setError('HEIC photos are not supported. Choose JPG, PNG, or WebP, or take a new photo.'); return
    }
    const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name))
    if (!supported) { setError('Choose a JPG, PNG, or WebP photo.'); return }
    if (file.size > 5_000_000) { setError('Photo is too large. Choose a photo of 5 MB or less.'); return }
    setPhoto(file)
  }
  function useLocation() {
    if (!navigator.geolocation) { setError('GPS is unavailable. Enter coordinates or place a pin on the map.'); return }
    navigator.geolocation.getCurrentPosition(position => { setLatitude(position.coords.latitude.toFixed(6)); setLongitude(position.coords.longitude.toFixed(6)); setError('') }, () => setError('Location access was unavailable. Enter coordinates or place a pin on the map.'), { enableHighAccuracy: true, timeout: 10000 })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('')
    if (!photo || !category) { setError('Add a photo and category.'); return }
    const lat = Number(latitude), lng = Number(longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) { setError('Enter valid coordinates.'); return }
    const form = new FormData()
    form.set('image', photo); form.set('resident_category', category); form.set('latitude', latitude); form.set('longitude', longitude)
    if (description.trim()) form.set('description', description.trim())
    setBusy(true)
    try { await api<Report>('/reports', { method: 'POST', body: form }); setPhoto(null); setPreview(''); setPrediction(null); setCategory(''); setDescription(''); setLatitude(''); setLongitude(''); setShowMap(false); setMessage('Report submitted. Barangay personnel will review it.'); onCreated() }
    catch (caught) { setError((caught as Error).message) } finally { setBusy(false) }
  }
  return <section className="panel report-panel"><div className="section-heading"><div><span className="eyebrow"><Txt>New concern</Txt></span><h2><Txt>Make a report</Txt></h2></div><span className="step-pill"><Txt>01 / Submit</Txt></span></div><p className="section-copy"><Txt>A clear photo and accurate location help barangay personnel verify the concern.</Txt></p><form className="report-form" onSubmit={submit}><fieldset className="photo-picker"><legend><Txt>Incident photo</Txt></legend><div className="photo-options"><label><Txt>Choose photo</Txt><input className="photo-input" type="file" aria-label={t('Incident photo · Choose photo')} accept="image/jpeg,image/png,image/webp" required={!photo} onChange={selectPhoto} /></label><label><Txt>Take photo</Txt><input className="photo-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={selectPhoto} /></label></div><small><Txt>JPG, PNG, or WebP, up to 5 MB. Avoid faces and license plates.</Txt></small>{photo && <p className="selected-photo" role="status"><CheckCircle2 size={16} /><span><Txt>Selected photo:</Txt> {photo.name}</span></p>}</fieldset>{preview && <img className="photo-preview" src={preview} alt={t('Preview of incident photo')} />}<div className="manual-banner"><Compass size={18} /><span>{prediction?.model_category ? <><strong><Txt>AI suggests</Txt> <Txt>{label(prediction.model_category)}</Txt></strong><br /><Txt>Review or change this category before submitting.</Txt></> : prediction?.prediction_available ? <><strong><Txt>AI is uncertain</Txt></strong><br /><Txt>Choose the category yourself. Barangay personnel will verify it.</Txt></> : <><strong><Txt>AI classification unavailable</Txt></strong><br /><Txt>Choose the category yourself. Barangay personnel will verify it.</Txt></>}</span></div><label><Txt>Incident category</Txt><select required value={category} onChange={event => setCategory(event.target.value as Category | '')}><option value=""><Txt>Select a category</Txt></option>{categories.map(item => <option key={item.value} value={item.value}><Txt>{item.label}</Txt></option>)}</select></label><label><Txt>Description (optional)</Txt><textarea rows={3} maxLength={1000} placeholder={t('What happened? Add details the photo may not show.')} value={description} onChange={event => setDescription(event.target.value)} /></label><div className="location-heading"><div><strong><Txt>Incident location</Txt></strong><span><Txt>Use GPS, move a map pin, or enter coordinates.</Txt></span></div><div className="button-row"><Button variant="outline" className="button outline" type="button" onClick={useLocation}><MapPin size={16} /> <Txt>Use GPS</Txt></Button><Button variant="outline" className="button outline" type="button" onClick={() => setShowMap(!showMap)}><Txt>{showMap ? 'Hide map' : 'Adjust pin on map'}</Txt></Button></div></div>{showMap && <MapPicker latitude={latitude ? Number(latitude) : null} longitude={longitude ? Number(longitude) : null} onPick={(lat, lng) => { setLatitude(String(lat)); setLongitude(String(lng)) }} />}<div className="coordinate-grid"><label><Txt>Latitude</Txt><Input type="number" step="any" min="-90" max="90" required value={latitude} onChange={event => setLatitude(event.target.value)} placeholder="14.326900" /></label><label><Txt>Longitude</Txt><Input type="number" step="any" min="-180" max="180" required value={longitude} onChange={event => setLongitude(event.target.value)} placeholder="120.936400" /></label></div>{error && <p className="alert error" role="alert"><Txt>{error}</Txt></p>}{message && <p className="alert success" role="status"><CheckCircle2 size={18} /><Txt>{message}</Txt></p>}<Button variant="default" className="button primary" type="submit" disabled={busy}><Txt>{busy ? 'Submitting…' : 'Submit report'}</Txt> <ChevronRight size={17} /></Button></form></section>
}

function ReportList({ reports, staff, onSelect }: { reports: Report[]; staff: boolean; onSelect: (report: Report) => void }) {
  return <section className="panel list-panel"><div className="section-heading"><div><span className="eyebrow"><Txt>{staff ? 'Barangay desk' : 'Your updates'}</Txt></span><h2><Txt>{staff ? 'Reports to review' : 'My reports'}</Txt></h2></div><ClipboardList size={23} className="muted-icon" /></div>{reports.length === 0 ? <div className="empty-state"><ClipboardList size={30} /><strong><Txt>No reports yet</Txt></strong><span><Txt>{staff ? 'New resident reports will appear here.' : 'Submitted concerns and updates will appear here.'}</Txt></span></div> : <div className="report-list">{reports.map(report => <article className="report-row" key={report.id}><div className="report-row-main"><strong><Txt>{label(report.resident_category)}</Txt></strong><span className="status"><Txt>{report.status}</Txt></span></div><p>{report.description || <><Txt>Report</Txt> {report.id.slice(0, 8)}</>}</p><div className="report-row-foot"><small>{report.created_at ? <DateText value={report.created_at} /> : `ID ${report.id.slice(0, 8)}`}</small><button type="button" onClick={() => onSelect(report)}><Txt>{staff ? 'Review report' : 'View history'}</Txt> <ChevronRight size={15} /></button></div></article>)}</div>}</section>
}

function ReportDetail({ report, staff, onClose, onUpdated }: { report: Report; staff: boolean; onClose: () => void; onUpdated: () => void }) {
  const t = useText()
  const [detail, setDetail] = useState(report)
  const [imageError, setImageError] = useState(false)
  const [verified, setVerified] = useState<Category>(report.verified_category ?? report.resident_category)
  const [note, setNote] = useState('')
  const [actionKind, setActionKind] = useState<'action' | 'coordination'>('action')
  const [actionNote, setActionNote] = useState('')
  const [duplicates, setDuplicates] = useState<DuplicateResult | null>(null)
  const [duplicateNote, setDuplicateNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setImageError(false)
    void api<Report>(`/reports/${report.id}`).then(setDetail).catch(caught => setError((caught as Error).message))
    if (staff) void api<DuplicateResult>(`/reports/${report.id}/duplicates`).then(setDuplicates).catch(caught => setError((caught as Error).message))
  }, [report.id, staff])
  const actions: { label: string; status: Status }[] = detail.status === 'Pending' ? [{ label: 'Start verification', status: 'Under Verification' }] : detail.status === 'Under Verification' ? [{ label: 'Accept report', status: 'Accepted' }, { label: 'Reject report', status: 'Rejected' }] : detail.status === 'Accepted' ? [{ label: 'Mark in progress', status: 'In Progress' }] : detail.status === 'In Progress' ? [{ label: 'Mark resolved', status: 'Resolved' }] : []
  async function transition(status: Status) {
    setBusy(true); setError('')
    try { await api<Report>(`/reports/${report.id}/status`, { method: 'POST', body: JSON.stringify({ status, ...(status === 'Accepted' ? { verified_category: verified } : {}), ...(note.trim() ? { note: note.trim() } : {}) }) }); setDetail(await api<Report>(`/reports/${report.id}`)); setNote(''); onUpdated() }
    catch (caught) { setError((caught as Error).message) } finally { setBusy(false) }
  }
  async function logAction(event: FormEvent) {
    event.preventDefault(); if (!actionNote.trim()) return
    setBusy(true); setError('')
    try {
      await api<Action>(`/reports/${report.id}/actions`, { method: 'POST', body: JSON.stringify({ kind: actionKind, note: actionNote.trim() }) })
      setDetail(await api<Report>(`/reports/${report.id}`)); setActionNote(''); onUpdated()
    } catch (caught) { setError((caught as Error).message) } finally { setBusy(false) }
  }
  async function refreshDuplicates() {
    setBusy(true); setError('')
    try { setDuplicates(await api<DuplicateResult>(`/reports/${report.id}/duplicates/generate`, { method: 'POST' })) }
    catch (caught) { setError((caught as Error).message) } finally { setBusy(false) }
  }
  async function decideDuplicate(item: Duplicate, decision: 'confirmed' | 'rejected') {
    setBusy(true); setError('')
    try {
      await api<Duplicate>(`/duplicates/${item.id}/decision`, { method: 'POST', body: JSON.stringify({ decision, ...(duplicateNote.trim() ? { note: duplicateNote.trim() } : {}) }) })
      setDuplicates(await api<DuplicateResult>(`/reports/${report.id}/duplicates`)); setDuplicateNote('')
    } catch (caught) { setError((caught as Error).message) } finally { setBusy(false) }
  }
  return <div className="detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="detail-sheet" role="dialog" aria-modal="true" aria-label={t('Report details')}>
      <div className="detail-top"><span className="eyebrow"><Txt>Report</Txt> {report.id.slice(0, 8)}</span><button type="button" onClick={onClose} aria-label={t('Close details')}>×</button></div>
      <h2><Txt>{label(detail.resident_category)}</Txt></h2><span className="status"><Txt>{detail.status}</Txt></span>
      {!imageError && <img className="detail-photo" src={`/api/reports/${report.id}/image`} alt={t('Submitted incident')} onError={() => setImageError(true)} />}
      {imageError && <p className="alert error" role="alert"><Txt>The photo could not be loaded. Close and reopen the report to try again.</Txt></p>}
      <div className="detail-meta"><div><small><Txt>Resident category</Txt></small><strong><Txt>{label(detail.resident_category)}</Txt></strong></div><div><small><Txt>AI suggestion</Txt></small><strong><Txt>{label(detail.model_category)}</Txt></strong></div><div><small><Txt>Verified category</Txt></small><strong><Txt>{label(detail.verified_category)}</Txt></strong></div></div>
      {detail.description && <p>{detail.description}</p>}
      {detail.latitude != null && detail.longitude != null && <p className="coordinates"><MapPin size={16} /> {detail.latitude}, {detail.longitude}</p>}
      <h3><Txt>Status history</Txt></h3><ol className="timeline">{(detail.events ?? [{ to_status: detail.status, created_at: detail.created_at }]).map((event, index) => <li key={event.id ?? index}><strong><Txt>{event.to_status ?? 'Update'}</Txt></strong><small>{event.created_at ? <DateText value={event.created_at} /> : t('Recorded')}</small>{event.note && <p>{event.note}</p>}</li>)}</ol>
      {detail.actions && detail.actions.length > 0 && <><h3><Txt>Action log</Txt></h3><ol className="timeline">{detail.actions.map(action => <li key={action.id}><strong><Txt>{action.kind === 'coordination' ? 'External coordination' : 'Staff action'}</Txt></strong><small>{<DateText value={action.created_at} />}</small><p>{action.note}</p></li>)}</ol></>}
      {staff && actions.length > 0 && <div className="staff-actions"><h3><Txt>Change status</Txt></h3>{detail.status === 'Under Verification' && <label><Txt>Verified category</Txt><select value={verified} onChange={event => setVerified(event.target.value as Category)}>{categories.map(item => <option key={item.value} value={item.value}><Txt>{item.label}</Txt></option>)}</select></label>}<label><Txt>Status note (optional)</Txt><textarea rows={2} value={note} onChange={event => setNote(event.target.value)} /></label><div className="button-row">{actions.map(action => <button className={`button ${action.status === 'Rejected' ? 'outline' : 'primary'}`} key={action.status} type="button" disabled={busy} onClick={() => transition(action.status)}><Txt>{action.label}</Txt></button>)}</div></div>}
      {staff && <form className="staff-actions" onSubmit={logAction}><h3><Txt>Document work</Txt></h3><label><Txt>Record type</Txt><select value={actionKind} onChange={event => setActionKind(event.target.value as typeof actionKind)}><option value="action"><Txt>Staff action</Txt></option><option value="coordination"><Txt>External coordination</Txt></option></select></label><label><Txt>Note</Txt><textarea required rows={3} maxLength={2000} value={actionNote} onChange={event => setActionNote(event.target.value)} placeholder={t('What was done, or which office was contacted?')} /></label><Button variant="outline" className="button outline" type="submit" disabled={busy}><Txt>Save action</Txt></Button></form>}
      {staff && <section className="staff-actions"><h3><Txt>Potential duplicates</Txt></h3>{duplicates?.embedding_available === false ? <p className="section-copy"><Txt>Duplicate suggestions unavailable. Review nearby reports manually until a validated image embedding model is connected.</Txt></p> : duplicates?.embedding_available ? <><p className="section-copy"><Txt>Suggestions need a staff decision. Original submissions remain separate.</Txt></p><Button variant="outline" className="button outline" type="button" disabled={busy} onClick={refreshDuplicates}><Txt>Check for suggestions</Txt></Button>{duplicates.suggestions.length === 0 && <p className="section-copy"><Txt>No suggestions found.</Txt></p>}{duplicates.suggestions.map(item => <div className="duplicate-row" key={item.id}><strong><Txt>Report</Txt> {item.candidate_report_id.slice(0, 8)}</strong><small><Txt>Similarity score</Txt> {item.score.toFixed(2)} · <Txt>{item.decision}</Txt></small>{item.decision === 'pending' && <><label><Txt>Decision note (optional)</Txt><Input maxLength={2000} value={duplicateNote} onChange={event => setDuplicateNote(event.target.value)} /></label><div className="button-row"><Button variant="default" className="button primary" type="button" disabled={busy} onClick={() => decideDuplicate(item, 'confirmed')}><Txt>Confirm same incident</Txt></Button><Button variant="outline" className="button outline" type="button" disabled={busy} onClick={() => decideDuplicate(item, 'rejected')}><Txt>Not duplicate</Txt></Button></div></>}</div>)}</> : <p className="section-copy"><Txt>Loading duplicate review…</Txt></p>}</section>}
      {error && <p className="alert error" role="alert"><Txt>{error}</Txt></p>}
    </section>
  </div>
}

function Chat({ reports }: { reports: Report[] }) {
  const t = useText()
  const { language: interfaceLanguage } = useLanguage()
  const [message, setMessage] = useState('')
  const [reportId, setReportId] = useState('')
  const [language, setLanguage] = useState<'en' | 'fil' | 'taglish'>('en')
  useEffect(() => setLanguage(interfaceLanguage), [interfaceLanguage])
  const [messages, setMessages] = useState<{ from: 'you' | 'assistant'; text: string }[]>([])
  const [busy, setBusy] = useState(false)
  async function send(event: FormEvent) {
    event.preventDefault(); if (!message.trim()) return
    const text = message.trim(); setMessages(current => [...current, { from: 'you', text }]); setMessage(''); setBusy(true)
    try { const answer = await api<{ reply?: string; response?: string; message?: string }>('/chat', { method: 'POST', body: JSON.stringify({ message: text, language, ...(reportId ? { report_id: reportId } : {}) }) }); setMessages(current => [...current, { from: 'assistant', text: answer.reply ?? answer.response ?? answer.message ?? t('I could not answer that request.') }]) }
    catch { setMessages(current => [...current, { from: 'assistant', text: t('Chat guidance is unavailable right now. You can still submit and track reports here.') }]) }
    finally { setBusy(false) }
  }
  return <section className="panel chat-panel"><div className="section-heading"><div><span className="eyebrow"><Txt>Need help?</Txt></span><h2><Txt>Ask BarangAI</Txt></h2></div><MessageCircle size={23} className="muted-icon" /></div><p className="section-copy"><Txt>Get reporting guidance in English, Filipino, or Taglish.</Txt></p><div className="chat-transcript" aria-live="polite">{messages.length === 0 ? <div className="chat-empty"><LifeBuoy size={24} /><span><Txt>Try asking: “How do I report flooding?”</Txt></span></div> : messages.map((item, index) => <div className={`chat-bubble ${item.from}`} key={index}>{item.text}</div>)}</div><form className="chat-form" onSubmit={send}><label htmlFor="chat-report"><Txt>Report to track (optional)</Txt></label><select id="chat-report" value={reportId} onChange={event => setReportId(event.target.value)}><option value=""><Txt>General guidance</Txt></option>{reports.map(report => <option key={report.id} value={report.id}><Txt>{label(report.resident_category)}</Txt> · {report.id.slice(0, 8)}</option>)}</select><div className="chat-controls"><label className="sr-only" htmlFor="chat-language"><Txt>Language</Txt></label><select id="chat-language" value={language} onChange={event => setLanguage(event.target.value as typeof language)}><option value="en">English</option><option value="fil">Filipino</option><option value="taglish">Taglish</option></select><label className="sr-only" htmlFor="chat-message"><Txt>Message</Txt></label><Input id="chat-message" value={message} onChange={event => setMessage(event.target.value)} placeholder={t('Type your question…')} /><Button variant="default" className="button primary" type="submit" disabled={busy || !message.trim()}><Txt>Send</Txt></Button></div></form></section>
}

function StaffMap({ reports }: { reports: Report[] }) {
  const t = useText()
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!element) return
    let alive = true
    let dispose = () => {}
    void import('leaflet').then(L => {
      if (!alive) return
      const points = reports.filter(report => Number.isFinite(report.latitude) && Number.isFinite(report.longitude))
      const map = L.map(element, { zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView([14.3269, 120.9364], 12, { animate: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
      for (const report of points) L.circleMarker([report.latitude!, report.longitude!], { radius: 7, color: report.status === 'Resolved' ? '#428567' : '#075d79', fillOpacity: .8 }).addTo(map)
      if (points.length === 1) map.setView([points[0].latitude!, points[0].longitude!], 14, { animate: false })
      if (points.length > 1) map.fitBounds(points.map(report => [report.latitude!, report.longitude!] as [number, number]), { padding: [20, 20], maxZoom: 15, animate: false })
      dispose = () => { map.stop(); map.remove() }
    })
    return () => { alive = false; dispose() }
  }, [element, reports])
  return <section className="panel map-panel"><h2><Txt>Incident map</Txt></h2><p className="section-copy"><Txt>Locations from the current filters. Open a report to see details.</Txt></p><div ref={setElement} className="location-map" role="img" aria-label={`${t('Incident map')}: ${reports.length}`} /></section>
}

function StaffOverview({ reports, visible, status, category, onStatus, onCategory }: {
  reports: Report[]; visible: Report[]; status: string; category: string;
  onStatus: (value: string) => void; onCategory: (value: string) => void
}) {
  const t = useText()
  const { language } = useLanguage()
  const active = reports.filter(report => !['Resolved', 'Rejected'].includes(report.status)).length
  const pending = reports.filter(report => report.status === 'Pending').length
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index))
    return { label: day.toLocaleDateString(language === 'fil' ? 'fil-PH' : 'en-PH', { weekday: 'short' }), count: reports.filter(report => report.created_at && new Date(report.created_at).toDateString() === day.toDateString()).length }
  })
  const maxDay = Math.max(1, ...days.map(day => day.count))
  return <section className="panel operations-panel"><div className="section-heading"><div><span className="eyebrow"><Txt>Barangay desk</Txt></span><h2><Txt>Operations overview</Txt></h2></div><ClipboardList size={23} className="muted-icon" /></div><div className="overview-stats"><div><strong>{reports.length}</strong><span><Txt>Total reports</Txt></span></div><div><strong>{active}</strong><span><Txt>Active</Txt></span></div><div><strong>{pending}</strong><span><Txt>Pending review</Txt></span></div></div><div className="overview-filters"><label><Txt>Filter by status</Txt><select value={status} onChange={event => onStatus(event.target.value)}><option value=""><Txt>All statuses</Txt></option>{(['Pending', 'Under Verification', 'Accepted', 'In Progress', 'Resolved', 'Rejected'] as Status[]).map(item => <option key={item} value={item}><Txt>{item}</Txt></option>)}</select></label><label><Txt>Filter by category</Txt><select value={category} onChange={event => onCategory(event.target.value)}><option value=""><Txt>All categories</Txt></option>{categories.map(item => <option key={item.value} value={item.value}><Txt>{item.label}</Txt></option>)}</select></label></div><p className="filter-count">{visible.length} {t('of')} {reports.length} {t('reports')}</p><div className="overview-breakdown"><div><h3><Txt>Category distribution</Txt></h3>{categories.map(item => <div className="category-count" key={item.value}><span><Txt>{item.label}</Txt></span><strong>{reports.filter(report => report.resident_category === item.value).length}</strong></div>)}</div><div><h3><Txt>Last 7 days</Txt></h3><div className="trend-bars" aria-label={t('Last 7 days')}>{days.map((day, index) => <div key={index}><span style={{ height: `${Math.max(4, day.count / maxDay * 82)}px` }} /><small>{day.label}</small></div>)}</div></div></div></section>
}

function Notifications({ reports, onSelect }: { reports: Report[]; onSelect: (report: Report) => void }) {
  const t = useText()
  const [items, setItems] = useState<Notice[]>([])
  useEffect(() => {
    let active = true
    const load = () => { void api<Notice[]>('/notifications').then(result => { if (active) setItems(result) }).catch(() => {}) }
    load(); window.addEventListener('focus', load)
    return () => { active = false; window.removeEventListener('focus', load) }
  }, [])
  async function markRead(item: Notice) {
    try {
      const saved = await api<Notice>(`/notifications/${item.id}/read`, { method: 'POST' })
      setItems(current => current.map(entry => entry.id === saved.id ? saved : entry))
    } catch { /* Keep unread so the resident can retry. */ }
  }
  const unread = items.filter(item => !item.read_at).length
  return <section className="panel notifications-panel"><div className="section-heading"><div><span className="eyebrow"><Txt>Report updates</Txt></span><h2><Txt>Your notifications</Txt></h2></div><span className="step-pill">{unread} {t('unread')}</span></div>{items.length === 0 ? <p className="section-copy"><Txt>No updates yet.</Txt></p> : <div className="notification-list">{items.map(item => <article className={item.read_at ? 'notification-row' : 'notification-row unread'} key={item.id}><strong><Txt>{item.status}</Txt></strong><small>{t('Report')} {item.report_id.slice(0, 8)} · {<DateText value={item.created_at} />}</small><div className="button-row">{reports.find(report => report.id === item.report_id) && <button type="button" onClick={() => onSelect(reports.find(report => report.id === item.report_id)!)}><Txt>View report</Txt></button>}{!item.read_at && <button type="button" onClick={() => void markRead(item)}><Txt>Mark read</Txt></button>}</div></article>)}</div>}</section>
}

function AppContent() {
  const t = useText()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])
  const [selected, setSelected] = useState<Report | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { void api<User>('/auth/me').then(setUser).catch(() => {}).finally(() => setLoading(false)) }, [])
  useEffect(() => { if (user) void api<Report[]>('/reports').then(setReports).catch(caught => setError((caught as Error).message)) }, [user])
  function reload() { void api<Report[]>('/reports').then(setReports).catch(caught => setError((caught as Error).message)) }
  async function logout() { try { await api<void>('/auth/logout', { method: 'POST' }); setUser(null); setReports([]); setSelected(null) } catch (caught) { setError((caught as Error).message) } }
  if (loading) return <div className="loading-screen"><LoaderCircle className="spin" size={30} /><span><Txt>Opening BarangAI Watch…</Txt></span></div>
  if (!user) return <Auth onLogin={setUser} />
  const staff = user.role === 'staff' || user.role === 'administrator'
  const filteredReports = reports.filter(report => (!statusFilter || report.status === statusFilter) && (!categoryFilter || report.resident_category === categoryFilter))
  return <div className="app-shell"><header className="site-header"><div className="header-inner"><div className="brand"><div className="brand-mark"><Waves size={20} /></div><span>BarangAI <strong>Watch</strong></span></div><div className="header-actions"><LanguageSwitch /><span className="role-badge"><Txt>{staff ? 'Barangay desk' : 'Resident portal'}</Txt></span><button className="logout" type="button" aria-label={t('Sign out')} onClick={logout}><LogOut size={16} /> <span><Txt>Sign out</Txt></span></button></div></div></header><main className="page-content"><div className="page-intro"><div><span className="eyebrow"><Txt>Barangay incident reporting</Txt></span><h1><Txt>{staff ? 'Community reports' : 'Keep your community in view.'}</Txt></h1><p><Txt>{staff ? 'Review, verify, and update every concern with a clear record of action.' : 'See a concern? Share a photo and location. Your barangay will take it from there.'}</Txt></p></div><div className="intro-icon">{staff ? <ShieldCheck size={33} /> : <MapPin size={33} />}</div></div>{error && <p className="alert error" role="alert"><Txt>{error}</Txt></p>}{staff && <StaffOverview reports={reports} visible={filteredReports} status={statusFilter} category={categoryFilter} onStatus={setStatusFilter} onCategory={setCategoryFilter} />}<div className="content-grid">{staff ? <><ReportList reports={filteredReports} staff onSelect={setSelected} /><aside className="side-stack"><StaffMap reports={filteredReports} /><div className="helper-panel"><ShieldCheck size={22} /><h3><Txt>Human verification</Txt></h3><p><Txt>AI and resident categories are suggestions. Barangay personnel confirm each report before action.</Txt></p></div></aside></> : <><ReportForm onCreated={reload} /><aside className="side-stack"><Notifications reports={reports} onSelect={setSelected} /><ReportList reports={reports} staff={false} onSelect={setSelected} /><Chat reports={reports} /></aside></>}</div><footer className="site-footer"><Txt>BarangAI Watch · Reports are reviewed by authorized barangay personnel.</Txt></footer></main>{selected && <ReportDetail report={selected} staff={staff} onClose={() => setSelected(null)} onUpdated={reload} />}</div>
}

export default function App() { return <LanguageProvider><AppContent /></LanguageProvider> }
