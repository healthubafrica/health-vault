import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { track, pageView } from './client'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function lastSentBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const call = fetchMock.mock.calls.at(-1)
  return JSON.parse(call![1].body as string)
}

describe('analytics client — track()', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('sends a well-formed payload with a v4 eventId and web ingestion source', async () => {
    track('registration_complete')
    await vi.advanceTimersByTimeAsync(0)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/analytics/events')
    expect(init.keepalive).toBe(true)

    const body = lastSentBody(fetchMock)
    expect(body.eventType).toBe('registration_complete')
    expect(body.ingestionSource).toBe('web')
    expect(body.eventId).toMatch(UUID_RE)
    expect(body.anonymousVisitorId).toMatch(UUID_RE)
  })

  it('maps legacy snake_case field names onto first-class DTO columns', async () => {
    track('ui_click', { element_id: 'book_telecare_btn', feature_area: 'appointments', extra_thing: 'x' })
    await vi.advanceTimersByTimeAsync(0)

    const body = lastSentBody(fetchMock)
    expect(body.elementId).toBe('book_telecare_btn')
    expect(body.featureArea).toBe('appointments')
    expect((body.metadata as Record<string, unknown>).extra_thing).toBe('x')
    // Known fields must not also leak into the metadata bag.
    expect(body.metadata).not.toHaveProperty('element_id')
  })

  it('debounces a duplicate click on the same element within the debounce window', async () => {
    track('ui_click', { element_id: 'dup_btn' })
    track('ui_click', { element_id: 'dup_btn' })
    await vi.advanceTimersByTimeAsync(0)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not debounce the same element after the debounce window elapses', async () => {
    track('ui_click', { element_id: 'slow_btn' })
    await vi.advanceTimersByTimeAsync(0)
    vi.advanceTimersByTime(301)
    track('ui_click', { element_id: 'slow_btn' })
    await vi.advanceTimersByTimeAsync(0)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not debounce events with no elementId (e.g. page_view)', async () => {
    track('page_view', { pagePath: '/a' })
    track('page_view', { pagePath: '/b' })
    await vi.advanceTimersByTimeAsync(0)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('persists the same anonymous visitor id across calls', async () => {
    track('event_one', { element_id: 'visitor_id_probe_1' })
    await vi.advanceTimersByTimeAsync(0)
    const first = lastSentBody(fetchMock).anonymousVisitorId

    vi.advanceTimersByTime(1000)
    track('event_two', { element_id: 'visitor_id_probe_2' })
    await vi.advanceTimersByTimeAsync(0)
    const second = lastSentBody(fetchMock).anonymousVisitorId

    expect(second).toBe(first)
  })

  it('retries a network failure and eventually succeeds without the caller ever seeing it', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ ok: true, status: 204 })

    track('payment_success', { element_id: 'retry_probe' })
    await vi.advanceTimersByTimeAsync(0) // first attempt fails
    await vi.advanceTimersByTimeAsync(1000) // first backoff, second attempt succeeds

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 4xx rejection — the server has permanently rejected the payload', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400 })

    track('malformed_probe', { element_id: 'four_oh_four_probe' })
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(5000)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('carries the previous page path forward on the next pageView call', async () => {
    pageView('/dashboard')
    await vi.advanceTimersByTimeAsync(0)
    expect(lastSentBody(fetchMock).previousPagePath).toBeUndefined()

    pageView('/appointments')
    await vi.advanceTimersByTimeAsync(0)
    const body = lastSentBody(fetchMock)
    expect(body.pagePath).toBe('/appointments')
    expect((body.metadata as Record<string, unknown>).previousPagePath).toBe('/dashboard')
  })
})
