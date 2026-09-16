import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appointments, ApiError } from './api'

// Regression coverage for: a request can succeed server-side (res.ok, e.g.
// 201) but have its connection cut while the body is still streaming — most
// commonly during an ECS deployment swapping the container mid-response.
// Before the fix, res.json() on the success path wasn't wrapped in a
// try/catch, so the resulting parse error was a plain (non-ApiError)
// exception. Screens branch on `e instanceof ApiError` to decide between a
// specific message and a generic "Failed to X" fallback — so this bypassed
// the accurate copy and told users the request failed outright, even though
// the server had already committed it (confirmed in production: the
// appointment was created, notifications sent, but the UI showed "Failed to
// request appointment").
describe('api request layer — dropped response after a success status', () => {
  beforeEach(() => {
    document.cookie = 'hha_at=test-token'
  })

  afterEach(() => {
    document.cookie = 'hha_at=; Max-Age=0; Path=/'
    vi.unstubAllGlobals()
  })

  it('throws an ApiError (not a raw parse exception) when the body fails to parse after a 2xx status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    })
    vi.stubGlobal('fetch', fetchMock)

    const call = appointments.create({
      appointmentType: 'virtual',
      scheduledAt: new Date().toISOString(),
      durationMinutes: 30,
    })

    await expect(call).rejects.toBeInstanceOf(ApiError)
  })

  it('gives an accurate "may have gone through" message, not the network-unreachable one', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    })
    vi.stubGlobal('fetch', fetchMock)

    try {
      await appointments.create({
        appointmentType: 'virtual',
        scheduledAt: new Date().toISOString(),
        durationMinutes: 30,
      })
      expect.unreachable('expected appointments.create to throw')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      const message = (e as ApiError).message
      expect(message).toMatch(/may have gone through/i)
      expect(message).not.toMatch(/can't reach the server/i)
    }
  })

  it('still returns parsed data on a clean success response (no regression)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ data: { id: 'appt_1', hhaRef: 'APT-2026-000999' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await appointments.create({
      appointmentType: 'virtual',
      scheduledAt: new Date().toISOString(),
      durationMinutes: 30,
    })

    expect(result.data.hhaRef).toBe('APT-2026-000999')
  })
})
