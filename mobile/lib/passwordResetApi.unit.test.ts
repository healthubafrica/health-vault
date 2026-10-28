import { API_BASE, ApiError, auth, setAccessToken } from './api';

jest.mock('./analytics/client', () => ({}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

describe('Password reset API contract', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  beforeEach(() => {
    setAccessToken(null);
    global.fetch = fetchMock;
    fetchMock.mockReset().mockResolvedValue({ ok: true, status: 200, json: async () => ({ message: 'ok' }) });
  });
  afterAll(() => { global.fetch = originalFetch; setAccessToken(null); });

  it('requests recovery using the public forgot-password endpoint', async () => {
    await auth.forgotPassword('ada@example.com');
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/auth/forgot-password`, expect.objectContaining({
      method: 'POST', body: JSON.stringify({ email: 'ada@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('submits the reset code and password using the backend field names', async () => {
    await auth.resetPassword('ada@example.com', '123456', 'Str0ng!Passw0rd');
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/auth/reset-password`, expect.objectContaining({
      method: 'POST', body: JSON.stringify({ email: 'ada@example.com', otp: '123456', newPassword: 'Str0ng!Passw0rd' }),
    }));
  });

  it('surfaces public endpoint errors without trying to refresh a session', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Invalid or expired OTP' }) });
    await expect(auth.resetPassword('ada@example.com', '123456', 'Str0ng!Passw0rd')).rejects.toEqual(new ApiError(401, 'Invalid or expired OTP', { message: 'Invalid or expired OTP' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
