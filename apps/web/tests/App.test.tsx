import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'

// Map lifecycle is covered in maps.test.tsx. Keep lazy imports inside this test's lifetime.
vi.mock('leaflet', () => ({
  map: () => {
    const map = { setView: () => map, fitBounds: vi.fn(), on: vi.fn(), stop: vi.fn(), remove: vi.fn() }
    return map
  },
  tileLayer: () => ({ addTo: vi.fn() }),
  circleMarker: () => ({ addTo: () => ({ setLatLng: vi.fn() }) }),
}))

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

describe('resident reporting', () => {
  it('shows a model suggestion while allowing a different resident category', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/me')) return Response.json({ id: 'r1', email: 'resident@example.test', role: 'resident' })
      if (url.endsWith('/reports/predict')) return Response.json({ prediction_available: true, model_category: 'potholes', confidence: 0.91 })
      if (url.endsWith('/reports')) return Response.json([])
      throw Error(`unexpected ${url}`)
    }))
    render(<App />)
    fireEvent.change(await screen.findByLabelText(/incident photo/i), { target: { files: [new File(['test'], 'road.jpg', { type: 'image/jpeg' })] } })
    expect(await screen.findByText(/AI suggests Potholes/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/incident category/i)).toHaveValue('potholes')
    fireEvent.change(screen.getByLabelText(/incident category/i), { target: { value: 'flooding' } })
    expect(screen.getByLabelText(/incident category/i)).toHaveValue('flooding')
  })

  it('requires a resident-selected category when AI is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/me')) return new Response(JSON.stringify({ id: 'resident-1', email: 'resident@example.test', role: 'resident' }), { status: 200 })
      if (url.endsWith('/reports')) return new Response(JSON.stringify([]), { status: 200 })
      throw new Error(`unexpected ${url}`)
    }))
    render(<App />)
    expect(await screen.findByText(/AI classification unavailable/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/incident category/i)).toBeRequired()
    expect(screen.getByLabelText(/incident photo/i)).toBeRequired()
    expect(screen.getByLabelText(/incident photo/i)).not.toHaveAttribute('capture')
  })

  it.each(['Incident photo · Choose photo', 'Take photo'])('submits a corrected category and photo from %s', async (picker) => {
    const requests: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      requests.push({ url, init })
      if (url.endsWith('/auth/me')) return Response.json({ id: 'r1', email: 'resident@example.test', role: 'resident' })
      if (url.endsWith('/reports') && init?.method === 'POST') return Response.json({ id: 'new', status: 'Pending' })
      if (url.endsWith('/reports')) return Response.json([])
      throw Error(`unexpected ${url}`)
    }))
    render(<App />)
    await screen.findByText(/AI classification unavailable/i)
    fireEvent.change(screen.getByLabelText(picker), { target: { files: [new File(['test'], 'road.jpg', { type: 'image/jpeg' })] } })
    expect(screen.getByLabelText(/incident photo/i)).not.toBeRequired()
    fireEvent.change(screen.getByLabelText(/incident category/i), { target: { value: 'potholes' } })
    fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '14.3' } })
    fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '120.9' } })
    fireEvent.submit(screen.getByRole('button', { name: /submit report/i }).closest('form')!)
    await waitFor(() => expect(requests.some(request => request.init?.method === 'POST' && request.url.endsWith('/reports'))).toBe(true))
    const body = requests.find(request => request.init?.method === 'POST' && request.url.endsWith('/reports'))?.init?.body as FormData
    expect(body.get('resident_category')).toBe('potholes')
    expect(body.get('latitude')).toBe('14.3')
    expect(body.get('longitude')).toBe('120.9')
    expect(body.get('image')).toBeInstanceOf(File)
    expect((body.get('image') as File).name).toBe('road.jpg')
    expect(screen.queryByText('road.jpg')).not.toBeInTheDocument()
  })


  it.each([
    ['phone.heic', 'image/heic', 4, 'HEIC photos are not supported. Choose JPG, PNG, or WebP, or take a new photo.'],
    ['large.jpg', 'image/jpeg', 5_000_001, 'Photo is too large. Choose a photo of 5 MB or less.'],
  ])('rejects %s before prediction or submission', async (name, type, bytes, message) => {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url)
      if (url.endsWith('/auth/me')) return Response.json({ id: 'r1', email: 'resident@example.test', role: 'resident' })
      return Response.json([])
    }))
    render(<App />)
    const input = await screen.findByLabelText(/incident photo/i)
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(bytes)], name, { type })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(calls.some(url => url.endsWith('/reports/predict'))).toBe(false)
    expect(input).toBeRequired()
  })

  it('offers camera capture independently from existing photo selection', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/auth/me')
      ? Response.json({ id: 'r1', email: 'resident@example.test', role: 'resident' }) : Response.json([])))
    render(<App />)
    expect(await screen.findByLabelText('Take photo')).toHaveAttribute('capture', 'environment')
    expect(screen.getByLabelText(/incident photo/i)).not.toHaveAttribute('capture')
  })

  it('lets staff review a report and send a permitted status transition', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init })
      if (url.endsWith('/auth/me')) return Response.json({ id: 's1', email: 'staff@example.test', role: 'staff' })
      if (url.endsWith('/reports/rep1/status')) return Response.json({ id: 'rep1', status: 'Under Verification' })
      if (url.endsWith('/reports/rep1/duplicates')) return Response.json({ embedding_available: false, suggestions: [], manual_review_required: true })
      if (url.endsWith('/reports/rep1')) return Response.json({ id: 'rep1', status: 'Pending', resident_category: 'flooding', events: [] })
      if (url.endsWith('/reports')) return Response.json([{ id: 'rep1', status: 'Pending', resident_category: 'flooding' }])
      throw Error(`unexpected ${url}`)
    }))
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /review report/i }))
    expect(await screen.findByText(/duplicate suggestions unavailable/i)).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: /start verification/i }))
    await waitFor(() => expect(calls.some(call => call.url.endsWith('/reports/rep1/status') && call.init?.method === 'POST')).toBe(true))
    const body = JSON.parse(String(calls.find(call => call.url.endsWith('/reports/rep1/status'))?.init?.body))
    expect(body.status).toBe('Under Verification')
  })

  it('shows backend history and records coordination and duplicate decisions', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init })
      if (url.endsWith('/auth/me')) return Response.json({ id: 's1', email: 'staff@example.test', role: 'staff' })
      if (url.endsWith('/reports/rep2/duplicates')) return Response.json({ embedding_available: true, suggestions: [{ id: 'dup1', candidate_report_id: 'rep1', score: 0.91, decision: 'pending' }], manual_review_required: true })
      if (url.endsWith('/duplicates/dup1/decision')) return Response.json({ id: 'dup1', decision: 'confirmed' })
      if (url.endsWith('/reports/rep2/actions')) return Response.json({ id: 'action1', kind: 'coordination', note: 'Called office' })
      if (url.endsWith('/reports/rep2')) return Response.json({ id: 'rep2', status: 'Resolved', resident_category: 'potholes', events: [{ id: 'event1', to_status: 'Resolved', created_at: '2026-10-14T00:00:00Z' }], actions: [] })
      if (url.endsWith('/reports')) return Response.json([{ id: 'rep2', status: 'Resolved', resident_category: 'potholes' }])
      throw Error(`unexpected ${url}`)
    }))
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /review report/i }))
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByText('Resolved', { selector: 'strong' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/record type/i), { target: { value: 'coordination' } })
    fireEvent.change(screen.getByLabelText(/^note$/i), { target: { value: 'Called office' } })
    fireEvent.submit(screen.getByRole('button', { name: /save action/i }).closest('form')!)
    await waitFor(() => expect(calls.some(call => call.url.endsWith('/reports/rep2/actions') && call.init?.method === 'POST')).toBe(true))
    const action = JSON.parse(String(calls.find(call => call.url.endsWith('/reports/rep2/actions') && call.init?.method === 'POST')?.init?.body))
    expect(action).toEqual({ kind: 'coordination', note: 'Called office' })
    await waitFor(() => expect(screen.getByRole('button', { name: /confirm same incident/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /confirm same incident/i }))
    await waitFor(() => expect(calls.some(call => call.url.endsWith('/duplicates/dup1/decision') && call.init?.method === 'POST')).toBe(true))
  })
})

describe('staff overview', () => {
  it('shows counts and filters the review list by status', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/me')) return Response.json({ id: 's1', email: 'staff@example.test', role: 'staff' })
      if (url.endsWith('/reports')) return Response.json([
        { id: 'r1', status: 'Pending', resident_category: 'flooding', latitude: 14.5, longitude: 121, created_at: '2026-10-14T03:00:00Z' },
        { id: 'r2', status: 'Resolved', resident_category: 'potholes', latitude: 14.6, longitude: 121.1, created_at: '2026-10-13T03:00:00Z' },
      ])
      throw Error(`unexpected ${url}`)
    }))
    render(<App />)
    expect(await screen.findByText('Operations overview')).toBeInTheDocument()
    expect(await screen.findAllByRole('button', { name: /review report/i })).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'Pending' } })
    expect(screen.getAllByRole('button', { name: /review report/i })).toHaveLength(1)
    expect(screen.getByText('1 of 2 reports')).toBeInTheDocument()
  })
})

describe('resident notifications', () => {
  it('shows unread status changes and marks them read', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(`${init?.method ?? 'GET'} ${url}`)
      if (url.endsWith('/auth/me')) return Response.json({ id: 'r1', email: 'resident@example.test', role: 'resident' })
      if (url.endsWith('/notifications/n1/read')) return Response.json({ id: 'n1', report_id: 'rep1', status: 'Under Verification', created_at: '2026-10-14T03:00:00Z', read_at: '2026-10-14T03:10:00Z' })
      if (url.endsWith('/notifications')) return Response.json([{ id: 'n1', report_id: 'rep1', status: 'Under Verification', created_at: '2026-10-14T03:00:00Z', read_at: null }])
      if (url.endsWith('/reports')) return Response.json([])
      throw Error(`unexpected ${url}`)
    }))
    render(<App />)
    expect(await screen.findByText('Under Verification')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }))
    await waitFor(() => expect(calls.some(call => call === 'POST /api/notifications/n1/read')).toBe(true))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark read' })).not.toBeInTheDocument())
  })
})

describe('interface language', () => {
  it('switches resident controls to Filipino', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/me')) return Response.json({ id: 'r1', email: 'resident@example.test', role: 'resident' })
      if (url.endsWith('/notifications') || url.endsWith('/reports')) return Response.json([])
      throw Error(`unexpected ${url}`)
    }))
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Filipino interface' }))
    expect(screen.getByRole('heading', { name: 'Gumawa ng ulat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ipasa ang ulat/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mag-sign out' })).toHaveAttribute('aria-label', 'Mag-sign out')
  })
})

describe('optional Google sign-in', () => {
  it.each([true, false])('only offers Google when configured: %s', async enabled => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/auth/google/config')
      ? Response.json({ enabled }) : new Response('{}', { status: 401 })))
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome back' })
    if (enabled) expect(await screen.findByRole('link', { name: 'Continue with Google' })).toHaveAttribute('href', '/api/auth/google/start')
    else expect(screen.queryByRole('link', { name: 'Continue with Google' })).not.toBeInTheDocument()
  })
})

describe('localized feedback', () => {
  it('translates duplicate review labels and reports an unavailable photograph', async () => {
    localStorage.setItem('barangai-language', 'fil')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/me')) return Response.json({ id: 's1', email: 'staff@example.test', role: 'staff' })
      if (url.endsWith('/reports/rep1/duplicates')) return Response.json({ embedding_available: true, suggestions: [{ id: 'dup1', candidate_report_id: 'other', score: .91, decision: 'pending' }], manual_review_required: true })
      const report = { id: 'rep1', status: 'Pending', resident_category: 'flooding', events: [] }
      return Response.json(url.endsWith('/reports') ? [report] : report)
    }))
    render(<App />)
    expect(await screen.findByText('Ulat rep1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Suriin ang ulat' }))
    expect(await screen.findByText(/Antas ng pagkakahawig 0.91/)).toHaveTextContent('Naghihintay ng pasiya')
    fireEvent.error(screen.getByAltText('Naipasang insidente'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Hindi maipakita ang larawan. Isara at buksan muli ang ulat upang subukan ulit.')
  })

  it('shows a Filipino login error', async () => {
    localStorage.setItem('barangai-language', 'fil')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/auth/google/config')
      ? Response.json({ enabled: false }) : Response.json({ detail: 'Invalid credentials' }, { status: 401 })))
    render(<App />)
    fireEvent.change(await screen.findByLabelText('Email address'), { target: { value: 'demo@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'incorrect' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Mag-sign in' }).closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('Hindi tama ang email o password.')
  })
})
