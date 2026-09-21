import { track, pageView } from './client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const mockSecureStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore.set(key, value);
    return Promise.resolve();
  }),
}));

function lastSentBody(fetchMock: jest.Mock): Record<string, unknown> {
  const call = fetchMock.mock.calls.at(-1);
  return JSON.parse(call![1].body as string);
}

describe('mobile analytics client — track()', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    mockSecureStore.clear();
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends a well-formed payload with a v4 eventId and mobile ingestion source', async () => {
    track('registration_complete');
    await jest.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/analytics/events');

    const body = lastSentBody(fetchMock);
    expect(body.eventType).toBe('registration_complete');
    expect(body.ingestionSource).toBe('mobile');
    expect(body.eventId).toMatch(UUID_RE);
    expect(body.anonymousVisitorId).toMatch(UUID_RE);
  });

  it('maps legacy snake_case field names onto first-class DTO columns', async () => {
    track('ui_click', { element_id: 'book_telecare_btn', feature_area: 'appointments', extra_thing: 'x' });
    await jest.advanceTimersByTimeAsync(0);

    const body = lastSentBody(fetchMock);
    expect(body.elementId).toBe('book_telecare_btn');
    expect(body.featureArea).toBe('appointments');
    expect((body.metadata as Record<string, unknown>).extra_thing).toBe('x');
    expect(body.metadata).not.toHaveProperty('element_id');
  });

  it('debounces a duplicate tap on the same element within the debounce window', async () => {
    track('ui_click', { element_id: 'dup_btn' });
    track('ui_click', { element_id: 'dup_btn' });
    await jest.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not debounce the same element after the debounce window elapses', async () => {
    track('ui_click', { element_id: 'slow_btn' });
    await jest.advanceTimersByTimeAsync(0);
    jest.advanceTimersByTime(301);
    track('ui_click', { element_id: 'slow_btn' });
    await jest.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not debounce events with no elementId (e.g. page_view)', async () => {
    track('page_view', { pagePath: '/a' });
    track('page_view', { pagePath: '/b' });
    await jest.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('persists the same anonymous visitor id across calls via SecureStore', async () => {
    track('event_one', { element_id: 'visitor_id_probe_1' });
    await jest.advanceTimersByTimeAsync(0);
    const first = lastSentBody(fetchMock).anonymousVisitorId;

    jest.advanceTimersByTime(1000);
    track('event_two', { element_id: 'visitor_id_probe_2' });
    await jest.advanceTimersByTimeAsync(0);
    const second = lastSentBody(fetchMock).anonymousVisitorId;

    expect(second).toBe(first);
  });

  it('retries a network failure and eventually succeeds without the caller ever seeing it', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ ok: true, status: 204 });

    track('payment_success', { element_id: 'retry_probe' });
    await jest.advanceTimersByTimeAsync(0); // first attempt fails
    await jest.advanceTimersByTimeAsync(1000); // first backoff, second attempt succeeds

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 4xx rejection — the server has permanently rejected the payload', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400 });

    track('malformed_probe', { element_id: 'four_oh_four_probe' });
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(5000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('carries the previous page path forward as metadata on the next pageView call', async () => {
    pageView('/dashboard');
    await jest.advanceTimersByTimeAsync(0);
    const firstMetadata = lastSentBody(fetchMock).metadata as Record<string, unknown> | undefined;
    expect(firstMetadata?.previousPagePath).toBeUndefined();

    pageView('/appointments');
    await jest.advanceTimersByTimeAsync(0);
    const body = lastSentBody(fetchMock);
    expect(body.pagePath).toBe('/appointments');
    expect((body.metadata as Record<string, unknown>).previousPagePath).toBe('/dashboard');
  });
});
