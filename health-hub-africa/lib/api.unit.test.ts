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
      json: () => Promise.resolve({ id: 'appt_1', hhaRef: 'APT-2026-000999' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await appointments.create({
      appointmentType: 'virtual',
      scheduledAt: new Date().toISOString(),
      durationMinutes: 30,
    })

    expect(result.hhaRef).toBe('APT-2026-000999')
  })
})

// Regression coverage for: every successful booking showed the generic
// "Failed to request appointment" toast (and never the success modal) even
// though the appointment was saved. POST /appointments returns the bare
// appointment — AppointmentsController passes AppointmentsService.create()'s
// result straight through and no interceptor wraps it in { data } — but the
// client was typed { data: Appointment } and the booking handler read
// `res.data.hhaRef`. `res.data` is undefined, so that line threw a plain
// TypeError AFTER the write succeeded. It slipped through because request<T>
// takes T on trust: a wrong envelope in the type is invisible to tsc until a
// caller dereferences it. This pins the real contract so that shape
// (`.data.hhaRef`) can no longer compile.
describe('appointments — response contract', () => {
  beforeEach(() => {
    document.cookie = 'hha_at=test-token'
  })

  afterEach(() => {
    document.cookie = 'hha_at=; Max-Age=0; Path=/'
    vi.unstubAllGlobals()
  })

  it('create resolves to the bare appointment the API returns, not a { data } envelope', async () => {
    const apiBody = { id: 'appt_2', hhaRef: 'APT-2026-000106', status: 'requested' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve(apiBody),
    }))

    const appointment = await appointments.create({
      appointmentType: 'virtual',
      scheduledAt: new Date().toISOString(),
      durationMinutes: 30,
    })

    expect(appointment.hhaRef).toBe('APT-2026-000106')
    expect('data' in appointment).toBe(false)
  })

  it('get resolves to the bare appointment too (same controller contract)', async () => {
    const apiBody = { id: 'appt_3', hhaRef: 'APT-2026-000107', status: 'confirmed' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(apiBody),
    }))

    const appointment = await appointments.get('appt_3')

    expect(appointment.hhaRef).toBe('APT-2026-000107')
  })
})
