import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from './login';
import { auth, patients, setAccessToken } from '@/lib/api';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockLogin = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace, canGoBack: () => false }) }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/stores/authStore', () => ({ useAuthStore: (select: any) => select({ login: mockLogin }) }));
jest.mock('@/lib/api', () => ({
  auth: { login: jest.fn() }, patients: { getMyProfile: jest.fn() }, setAccessToken: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const profile = { id: 'patient-1', user: { email: 'ada@example.com' }, firstName: 'Ada', lastName: 'Obi' };
const fill = (screen: ReturnType<typeof render>) => {
  fireEvent.changeText(screen.getByLabelText('Email address'), ' ada@example.com ');
  fireEvent.changeText(screen.getByLabelText('Password'), 'test-password');
};

describe('Sign in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth.login as jest.Mock).mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });
    (patients.getMyProfile as jest.Mock).mockResolvedValue({ data: profile });
    mockLogin.mockResolvedValue(undefined);
  });

  it('validates missing and malformed credentials before contacting the API', () => {
    const screen = render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your email address and password.');
    fireEvent.changeText(screen.getByLabelText('Email address'), 'invalid');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address.');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('sets the access token before loading the profile and completes the session', async () => {
    (patients.getMyProfile as jest.Mock).mockImplementation(async () => {
      expect(setAccessToken).toHaveBeenCalledWith('access');
      return { data: profile };
    });
    const screen = render(<LoginScreen />);
    fill(screen);
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(auth.login).toHaveBeenCalledWith('ada@example.com', 'test-password');
    expect(mockLogin).toHaveBeenCalledWith('access', 'refresh', expect.objectContaining({ id: 'patient-1', firstName: 'Ada' }));
  });

  it('shows a recoverable error and clears the temporary token if profile loading fails', async () => {
    (patients.getMyProfile as jest.Mock).mockRejectedValue(new Error('offline'));
    const screen = render(<LoginScreen />);
    fill(screen);
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('We could not sign you in. Please try again.'));
    expect(setAccessToken).toHaveBeenLastCalledWith(null);
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('toggles password visibility and carries the email into password recovery', () => {
    const screen = render(<LoginScreen />);
    fill(screen);
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByLabelText('Show password'));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    fireEvent.press(screen.getByText('Forgot password?'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/reset-password', params: { email: 'ada@example.com' } });
  });
});
