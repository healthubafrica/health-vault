import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ResetPasswordScreen from './reset-password';

jest.setTimeout(30000);

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: (...a: unknown[]) => mockReplace(...a) }),
  useLocalSearchParams: () => ({ email: 'ada@example.com' }),
}));
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ApiError: actual.ApiError, auth: { forgotPassword: jest.fn(), resetPassword: jest.fn() } };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { auth } = require('@/lib/api');

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    auth.forgotPassword.mockReset().mockResolvedValue({ message: 'ok' });
    auth.resetPassword.mockReset().mockResolvedValue({ message: 'ok' });
    mockReplace.mockReset();
  });

  it('requests a code, resets the password and returns to sign in', async () => {
    const r = render(<ResetPasswordScreen />);
    fireEvent.press(r.getByText('Send reset code'));
    await r.findByText('Reset password');
    expect(auth.forgotPassword).toHaveBeenCalledWith('ada@example.com');

    fireEvent.changeText(r.getByPlaceholderText('6-digit code'), '123456');
    fireEvent.changeText(r.getByPlaceholderText('New password'), 'Str0ng!Passw0rd');
    fireEvent.changeText(r.getByPlaceholderText('Confirm new password'), 'Str0ng!Passw0rd');
    fireEvent.press(r.getByText('Reset password'));

    await waitFor(() =>
      expect(auth.resetPassword).toHaveBeenCalledWith('ada@example.com', '123456', 'Str0ng!Passw0rd'),
    );
    fireEvent.press(await r.findByText('Back to sign in'));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('rejects a weak password without calling the API', async () => {
    const r = render(<ResetPasswordScreen />);
    fireEvent.press(r.getByText('Send reset code'));
    await r.findByText('Reset password');
    fireEvent.changeText(r.getByPlaceholderText('6-digit code'), '123456');
    fireEvent.changeText(r.getByPlaceholderText('New password'), 'short');
    fireEvent.press(r.getByText('Reset password'));
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });
});
