import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/app/App'

const exif = vi.hoisted(() => ({ gps: vi.fn() }))
vi.mock('exifr', () => ({ default: exif }))
vi.mock('leaflet', () => ({
  map: () => {
    const map = { setView: () => map, fitBounds: vi.fn(), on: vi.fn(), stop: vi.fn(), remove: vi.fn() }
    return map
  },
  tileLayer: () => ({ addTo: vi.fn() }),
  circleMarker: () => {
    const marker = { addTo: () => marker, setLatLng: vi.fn(), bindTooltip: vi.fn(), on: vi.fn() }
    return marker
  },
}))

const photo = () => new File(['test'], 'road.jpg', { type: 'image/jpeg' })
const next = () => fireEvent.click(screen.getByRole('button', { name: /^next/i }))

function serve(prediction: object, requests: Array<{ url: string; init?: RequestInit }> = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      requests.push({ url, init })
      if (url.endsWith('/auth/me')) return Response.json({ id: 'r1', email: 'resident@example.test', role: 'resident' })
      if (url.endsWith('/reports/predict')) return Response.json(prediction)
      if (url.includes('/geo/reverse')) return Response.json({ label: 'Mabini Street, Zone 1' })
      if (url.endsWith('/reports') && init?.method === 'POST') return Response.json({ id: 'new', status: 'Pending' })
      return Response.json([])
    }),
  )
  return requests
}

const nothing = { prediction_available: false, model_category: null, confidence: null, hazards: [] }

beforeEach(() => window.history.replaceState(null, '', '/report'))
afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
  vi.unstubAllGlobals()
  exif.gps.mockReset()
  localStorage.clear()
})

describe('location without typing', () => {
  it('takes the pin from the photo and shows its street name', async () => {
    exif.gps.mockResolvedValue({ latitude: 14.32941, longitude: 120.93672 })
    const requests = serve(nothing)
    render(<App />)
    fireEvent.change(await screen.findByLabelText(/incident photo/i), { target: { files: [photo()] } })
    await waitFor(() => expect(exif.gps).toHaveBeenCalled())
    next()
    expect(await screen.findByText('From your photo', { exact: false })).toBeInTheDocument()
    expect((await screen.findAllByText(/Mabini Street, Zone 1/, {}, { timeout: 3000 })).length).toBeGreaterThan(0)
    expect(requests.some(request => request.url.includes('/geo/reverse?lat=14.32941&lng=120.93672'))).toBe(true)
    next()
    fireEvent.click(await screen.findByRole('radio', { name: 'Potholes' }))
    next()
    fireEvent.click(await screen.findByRole('button', { name: /submit report/i }))
    await waitFor(() =>
      expect(requests.some(request => request.init?.method === 'POST' && request.url.endsWith('/reports'))).toBe(true),
    )
    const body = requests.find(request => request.init?.method === 'POST' && request.url.endsWith('/reports'))!.init!
      .body as FormData
    expect(body.get('latitude')).toBe('14.32941')
    expect(body.get('location_label')).toBeNull() // the server looks it up itself
  })

  it('falls back to the phone location when the photo has no GPS', async () => {
    exif.gps.mockResolvedValue(undefined)
    const getCurrentPosition = vi.fn(success => success({ coords: { latitude: 14.5, longitude: 121.01 } }))
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
    serve(nothing)
    render(<App />)
    fireEvent.change(await screen.findByLabelText(/incident photo/i), { target: { files: [photo()] } })
    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalled())
    next()
    expect(await screen.findByText('From your phone', { exact: false })).toBeInTheDocument()
  })

  it('stays quiet when the phone refuses location, and lets the resident set the pin', async () => {
    exif.gps.mockResolvedValue(undefined)
    const getCurrentPosition = vi.fn((_success, failure) => failure(new Error('denied')))
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
    serve(nothing)
    render(<App />)
    fireEvent.change(await screen.findByLabelText(/incident photo/i), { target: { files: [photo()] } })
    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^next/i })).toBeEnabled()
  })
})

describe('AI suggestions', () => {
  it('sends the interface language and flags a category the two models disagree on', async () => {
    localStorage.setItem('barangai-language', 'fil')
    exif.gps.mockResolvedValue(undefined)
    const requests = serve({
      prediction_available: true,
      model_category: 'potholes',
      confidence: 0.4,
      category_source: 'vision',
      needs_check: true,
      suggested_description: 'May malalim na lubak sa kalsada.',
      hazards: ['blocks_road'],
    })
    render(<App />)
    fireEvent.change(await screen.findByLabelText(/larawan ng insidente/i), { target: { files: [photo()] } })
    await waitFor(() => expect(requests.some(request => request.url.endsWith('/reports/predict'))).toBe(true))
    const form = requests.find(request => request.url.endsWith('/reports/predict'))!.init!.body as FormData
    expect(form.get('language')).toBe('fil')
    fireEvent.click(screen.getByRole('button', { name: /^susunod/i }))
    fireEvent.change(await screen.findByLabelText(/latitude/i), { target: { value: '14.3' } })
    fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '120.9' } })
    fireEvent.click(screen.getByRole('button', { name: /^susunod/i }))
    expect(await screen.findByText('Hindi tiyak ang AI · pakisuri')).toBeInTheDocument()
    expect(screen.getByText('Nakaharang sa daan')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('May malalim na lubak sa kalsada.')
  })

  it('shows the electrical safety note when the photo shows an electrical hazard', async () => {
    exif.gps.mockResolvedValue(undefined)
    serve({
      prediction_available: true,
      model_category: 'fallen_trees',
      confidence: 0.8,
      category_source: 'agreed',
      needs_check: false,
      suggested_description: 'A tree fell onto power lines.',
      hazards: ['electrical_hazard'],
    })
    render(<App />)
    fireEvent.change(await screen.findByLabelText(/incident photo/i), { target: { files: [photo()] } })
    expect(await screen.findByText(/AI suggests Fallen trees/i)).toBeInTheDocument()
    next()
    fireEvent.change(await screen.findByLabelText(/latitude/i), { target: { value: '14.3' } })
    fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '120.9' } })
    next()
    expect(await screen.findByRole('note')).toHaveTextContent(/do not touch the wire/i)
    expect(screen.getByRole('radio', { name: 'Fallen trees' })).toBeChecked()
  })
})

describe('uncertain suggestions', () => {
  it('keeps the closest category, asks to verify, and explains streetlights', async () => {
    exif.gps.mockResolvedValue(undefined)
    serve({
      prediction_available: true,
      model_category: 'broken_streetlights',
      confidence: 0.4,
      category_source: 'vision',
      needs_check: true,
      problem_seen: false,
      suggested_description: 'The AI is uncertain whether this photo shows a problem. Please check. A lamp post.',
      hazards: [],
    })
    render(<App />)
    fireEvent.change(await screen.findByLabelText(/incident photo/i), { target: { files: [photo()] } })
    expect(await screen.findByText('AI is uncertain')).toBeInTheDocument()
    next()
    fireEvent.change(await screen.findByLabelText(/latitude/i), { target: { value: '14.3' } })
    fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '120.9' } })
    next()
    expect(await screen.findByRole('radio', { name: 'Broken streetlights' })).toBeChecked()
    expect(screen.getAllByText('AI unsure · please check')).toHaveLength(2)
    expect(screen.getByText(/cannot show whether a light works/)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue(
      'The AI is uncertain whether this photo shows a problem. Please check. A lamp post.',
    )
  })
})
