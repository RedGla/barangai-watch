import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../src/app/App'

const maps = vi.hoisted(() => ({ instances: [] as any[] }))
vi.mock('leaflet', () => ({
  map: vi.fn((_element, options) => {
    const lifecycle: string[] = []
    const instance = {
      options,
      lifecycle,
      setView: vi.fn(function () {
        return instance
      }),
      fitBounds: vi.fn(),
      on: vi.fn(),
      stop: vi.fn(() => lifecycle.push('stop')),
      remove: vi.fn(() => lifecycle.push('remove')),
    }
    maps.instances.push(instance)
    return instance
  }),
  tileLayer: () => ({ addTo: vi.fn() }),
  circleMarker: () => {
    const marker = { addTo: () => marker, setLatLng: vi.fn(), bindTooltip: vi.fn(), on: vi.fn() }
    return marker
  },
}))
afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
  maps.instances.length = 0
  vi.unstubAllGlobals()
  localStorage.clear()
})

it('stops staff maps before replacing or removing them and avoids zoom transitions', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/auth/me')
        ? Response.json({ id: 's1', email: 'staff@example.test', role: 'staff' })
        : Response.json([
            { id: 'a', status: 'Pending', resident_category: 'flooding', latitude: 14.3, longitude: 120.9 },
            { id: 'b', status: 'Resolved', resident_category: 'flooding', latitude: 14.4, longitude: 121 },
          ]),
    ),
  )
  window.history.replaceState(null, '', '/desk/map')
  render(<App />)
  await screen.findByLabelText('Filter by status')
  await waitFor(() => expect(maps.instances.some(map => map.fitBounds.mock.calls.length)).toBe(true))
  const active = maps.instances[maps.instances.length - 1]
  expect(active.options).toMatchObject({ zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false })
  expect(active.fitBounds.mock.calls[0][1]).toMatchObject({ animate: false })
  fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'Pending' } })
  await waitFor(() => expect(active.lifecycle).toEqual(['stop', 'remove']))
  const replacement = maps.instances[maps.instances.length - 1]
  cleanup()
  expect(replacement.lifecycle).toEqual(['stop', 'remove'])
})

it('opens and closes a resident map without leaving animated transitions', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/auth/me')
        ? Response.json({ id: 'r1', email: 'resident@example.test', role: 'resident' })
        : Response.json([]),
    ),
  )
  window.history.replaceState(null, '', '/report')
  render(<App />)
  fireEvent.change(await screen.findByLabelText(/incident photo/i), {
    target: { files: [new File(['x'], 'road.jpg', { type: 'image/jpeg' })] },
  })
  fireEvent.click(screen.getByRole('button', { name: /^next/i }))
  fireEvent.click(await screen.findByRole('button', { name: 'Adjust pin on map' }))
  await waitFor(() => expect(maps.instances.length).toBe(1))
  const map = maps.instances[0]
  expect(map.options).toMatchObject({ zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false })
  fireEvent.click(screen.getByRole('button', { name: 'Hide map' }))
  expect(map.lifecycle).toEqual(['stop', 'remove'])
})
