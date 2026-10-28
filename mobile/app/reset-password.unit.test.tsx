import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import ResetPasswordScreen from './reset-password';
import { ApiError, auth } from '@/lib/api';

jest.setTimeout(30000);

const mockReplace = jest.fn();
let mockEmailParam: string | string[] = 'ada@example.com';
jest.mock('expo-router', () => ({
  useRouter: () => ({ canGoBack: () => false, replace: mockReplace }),
  useLocalSearchParams: () => ({ email: mockEmailParam }),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null, ArrowRight: () => null, Check: () => null, KeyRound: () => null,
  Mail: () => null, Eye: () => null, EyeOff: () => null,
  ShieldCheck: () => null, Sparkles: () => null,
}));
jest.mock('@/lib/api', () => ({
  ApiError: class extends Error { constructor(mockStatus: number, message: string) { super(message); Object.assign(this, { status: mockStatus }); } },
  auth: { forgotPassword: jest.fn(), resetPassword: jest.fn() },
}));

type Screen = ReturnType<typeof render>;
const password = 'Str0ng!Passw0rd';
async function request(screen: Screen) {
  fireEvent.press(screen.getByRole('button', { name: 'Send reset code' }));
  await screen.findByLabelText('Reset code');
}
function credentials(screen: Screen, code = '123456') {
  fireEvent.changeText(screen.getByLabelText('Reset code'), code);
  fireEvent.changeText(screen.getByLabelText('New password'), password);
  fireEvent.changeText(screen.getByLabelText('Confirm new password'), password);
}
async function cooldownEnds() {
  await act(async () => { jest.advanceTimersByTime(60_000); });
}

describe('Password recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-27T10:00:00Z'));
    jest.clearAllMocks();
    mockEmailParam = 'ada@example.com';
    (auth.forgotPassword as jest.Mock).mockReset().mockResolvedValue({ message: 'Generic success' });
    (auth.resetPassword as jest.Mock).mockReset().mockResolvedValue({ message: 'Password reset successful' });
  });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

  it('uses the login email, trims it, resets the password, and returns to sign in', async () => {
    mockEmailParam = ' ada@example.com ';
    const screen = render(<ResetPasswordScreen />);
    await request(screen);
    expect(auth.forgotPassword).toHaveBeenCalledWith('ada@example.com');
    expect(screen.getByText(/If an account exists/)).toBeTruthy();
    credentials(screen);
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    await screen.findByRole('button', { name: 'Back to sign in' });
    expect(auth.resetPassword).toHaveBeenCalledWith('ada@example.com', '123456', password);
    expect(screen.queryByLabelText('New password')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('rejects an empty or malformed email before making a request', () => {
    const screen = render(<ResetPasswordScreen />);
    fireEvent.changeText(screen.getByLabelText('Email address'), '');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset code' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the email address you signed up with.');
    fireEvent.changeText(screen.getByLabelText('Email address'), 'not-an-email');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset code' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(auth.forgotPassword).not.toHaveBeenCalled();
  });

  it('validates six digits, password rules, maximum length, and confirmation', async () => {
    const screen = render(<ResetPasswordScreen />);
    await request(screen);
    credentials(screen, '12345');
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the six-digit code from your email.');
    fireEvent.changeText(screen.getByLabelText('Reset code'), '12a3456');
    expect(screen.getByLabelText('Reset code')).toHaveDisplayValue('123456');
    fireEvent.changeText(screen.getByLabelText('New password'), 'short');
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 12 characters/);
    fireEvent.changeText(screen.getByLabelText('New password'), `${password}${'a'.repeat(73)}`);
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Maximum 72 characters/);
    fireEvent.changeText(screen.getByLabelText('New password'), password);
    fireEvent.changeText(screen.getByLabelText('Confirm new password'), `${password}!`);
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Your passwords do not match/);
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('recovers from a failed request and prevents duplicate requests while sending', async () => {
    (auth.forgotPassword as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const screen = render(<ResetPasswordScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Send reset code' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(/Check your connection/);
    let resolveRequest!: (value: object) => void;
    (auth.forgotPassword as jest.Mock).mockReturnValueOnce(new Promise(resolve => { resolveRequest = resolve; }));
    fireEvent.press(screen.getByRole('button', { name: 'Send reset code' }));
    fireEvent.press(screen.getByRole('button', { name: 'Sending code' }));
    expect(auth.forgotPassword).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Sending code' })).toBeDisabled();
    await act(async () => { resolveRequest({}); });
    expect(screen.getByLabelText('Reset code')).toBeTruthy();
  });

  it('keeps an expired-code error recoverable and resends a new code after the cooldown', async () => {
    (auth.resetPassword as jest.Mock).mockRejectedValueOnce(new ApiError(400, 'Invalid or expired OTP'));
    const screen = render(<ResetPasswordScreen />);
    await request(screen);
    credentials(screen);
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(/That code is invalid or has expired/);
    expect(screen.getByRole('button', { name: 'Resend reset code' })).toBeDisabled();
    fireEvent.press(screen.getByRole('button', { name: 'Resend reset code' }));
    expect(auth.forgotPassword).toHaveBeenCalledTimes(1);
    await cooldownEnds();
    fireEvent.press(screen.getByRole('button', { name: 'Resend reset code' }));
    await screen.findByText(/a new code is on its way/);
    expect(auth.forgotPassword).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Reset code')).toHaveDisplayValue('');
    expect(screen.getByLabelText('New password')).toHaveDisplayValue(password);
    fireEvent.changeText(screen.getByLabelText('Reset code'), '654321');
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    await screen.findByRole('button', { name: 'Back to sign in' });
    expect(auth.resetPassword).toHaveBeenLastCalledWith('ada@example.com', '654321', password);
  });

  it('shows resend failures without losing the form and allows retrying the resend', async () => {
    const screen = render(<ResetPasswordScreen />);
    await request(screen);
    credentials(screen);
    await cooldownEnds();
    (auth.forgotPassword as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    fireEvent.press(screen.getByRole('button', { name: 'Resend reset code' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Reset code')).toHaveDisplayValue('123456');
    expect(screen.getByLabelText('New password')).toHaveDisplayValue(password);
    expect(screen.getByRole('button', { name: 'Resend reset code' })).toBeEnabled();
    fireEvent.press(screen.getByRole('button', { name: 'Resend reset code' }));
    await screen.findByText(/a new code is on its way/);
  });

  it('lets users correct the email and clears the previous code and passwords', async () => {
    const screen = render(<ResetPasswordScreen />);
    await request(screen);
    credentials(screen);
    fireEvent.press(screen.getByRole('button', { name: 'Use a different email' }));
    fireEvent.changeText(screen.getByLabelText('Email address'), 'obi@example.com');
    await request(screen);
    expect(screen.getByLabelText('Reset code')).toHaveDisplayValue('');
    expect(screen.getByLabelText('New password')).toHaveDisplayValue('');
    credentials(screen);
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    await screen.findByRole('button', { name: 'Back to sign in' });
    expect(auth.resetPassword).toHaveBeenCalledWith('obi@example.com', '123456', password);
  });

  it('exposes independent visibility controls and prevents duplicate reset submissions', async () => {
    const screen = render(<ResetPasswordScreen />);
    await request(screen);
    credentials(screen);
    fireEvent.press(screen.getByLabelText('Show new password'));
    expect(screen.getByLabelText('New password').props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText('Confirm new password').props.secureTextEntry).toBe(true);
    let resolveReset!: (value: object) => void;
    (auth.resetPassword as jest.Mock).mockReturnValueOnce(new Promise(resolve => { resolveReset = resolve; }));
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    fireEvent.press(screen.getByRole('button', { name: 'Resetting password' }));
    fireEvent.press(screen.getByRole('button', { name: 'Use a different email' }));
    expect(auth.resetPassword).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Resetting password' })).toBeDisabled();
    await act(async () => { resolveReset({}); });
    await screen.findByRole('button', { name: 'Back to sign in' });
  });

  it('shows a useful rate-limit error and keeps the email available', async () => {
    (auth.forgotPassword as jest.Mock).mockRejectedValueOnce(new ApiError(429, 'ThrottlerException'));
    const screen = render(<ResetPasswordScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Send reset code' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('Too many attempts. Please wait a minute before trying again.');
    expect(screen.getByLabelText('Email address')).toHaveDisplayValue('ada@example.com');
  });

  it('handles repeated query parameters safely and supports a direct-link return to sign in', () => {
    mockEmailParam = ['ada@example.com', 'obi@example.com'];
    const screen = render(<ResetPasswordScreen />);
    expect(screen.getByLabelText('Email address')).toHaveDisplayValue('');
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
