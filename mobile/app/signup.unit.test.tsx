import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SignUpScreen from './signup';
import { ApiError, auth, patients, setAccessToken } from '@/lib/api';

const mockReplace = jest.fn();
const mockLogin = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn(), canGoBack: () => false }) }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
// These tests exercise form behavior; avoid loading the entire native icon catalog.
jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null, ArrowRight: () => null, Check: () => null,
  Eye: () => null, EyeOff: () => null, MailCheck: () => null,
}));
jest.mock('@/lib/stores/authStore', () => ({ useAuthStore: (select: any) => select({ login: mockLogin }) }));
jest.mock('@/lib/useCooldown', () => ({ useCooldown: () => ({ remaining: 60, start: jest.fn() }) }));
jest.mock('@/lib/api', () => ({
  ApiError: class extends Error { constructor(mockStatus: number, message: string) { super(message); Object.assign(this, { status: mockStatus }); } },
  auth: { register: jest.fn(), verifyOtp: jest.fn(), resendOtp: jest.fn() },
  patients: { getMyProfile: jest.fn(), create: jest.fn(), updateOnboardingProgress: jest.fn() },
  analytics: { track: jest.fn() }, setAccessToken: jest.fn(),
}));

const profile = { id: 'patient-1', user: { email: 'ada@example.com' }, firstName: 'Ada', lastName: 'Obi' };
type Screen = ReturnType<typeof render>;
function details(screen: Screen) {
  fireEvent.changeText(screen.getByLabelText('Full name'), 'Ada Obi');
  fireEvent.changeText(screen.getByLabelText('Date of birth'), '1992-07-14');
  fireEvent.press(screen.getByRole('radio', { name: 'Female' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Friend' }));
  fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
}
async function account(screen: Screen) {
  details(screen);
  fireEvent.changeText(screen.getByLabelText('Email address'), ' ada@example.com ');
  fireEvent.changeText(screen.getByLabelText('Phone number'), '08012345678');
  fireEvent.changeText(screen.getByLabelText('Create password'), 'Str0ng!Passw0rd');
  fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Str0ng!Passw0rd');
  fireEvent.press(screen.getByRole('button', { name: 'Send verification code' }));
  await screen.findByLabelText('Verification code');
}

describe('Create account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth.register as jest.Mock).mockResolvedValue({});
    (auth.verifyOtp as jest.Mock).mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });
    (patients.getMyProfile as jest.Mock).mockReset().mockResolvedValue({ data: profile });
    (patients.create as jest.Mock).mockReset().mockResolvedValue({ data: profile });
    (patients.updateOnboardingProgress as jest.Mock).mockResolvedValue({});
    mockLogin.mockResolvedValue(undefined);
  });

  it('validates details and preserves them when going back from the account step', () => {
    const screen = render(<SignUpScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your full name.');
    details(screen);
    fireEvent.changeText(screen.getByLabelText('Email address'), 'invalid');
    fireEvent.press(screen.getByRole('button', { name: 'Send verification code' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address.');
    expect(auth.register).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Previous step' }));
    expect(screen.getByLabelText('Full name')).toHaveDisplayValue('Ada Obi');
    expect(screen.getByRole('radio', { name: 'Friend' })).toBeChecked();
  });

  it('registers, requires consent, then creates a missing profile with the verified token', async () => {
    (patients.getMyProfile as jest.Mock).mockImplementation(async () => {
      expect(setAccessToken).toHaveBeenCalledWith('access');
      throw new ApiError(404, 'No profile');
    });
    const screen = render(<SignUpScreen />);
    await account(screen);
    expect(auth.register).toHaveBeenCalledWith('ada@example.com', 'Str0ng!Passw0rd', '+2348012345678', 'Ada Obi', 'friend');
    fireEvent.changeText(screen.getByLabelText('Verification code'), '12a3456');
    expect(screen.getByLabelText('Verification code')).toHaveDisplayValue('123456');
    fireEvent.press(screen.getByRole('button', { name: 'Verify & create account' }));
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Please agree to the Privacy Policy/);
    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByRole('button', { name: 'Verify & create account' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(patients.create).toHaveBeenCalledWith({ firstName: 'Ada', lastName: 'Obi', dateOfBirth: '1992-07-14', gender: 'Female', country: 'Nigeria' });
    expect(mockLogin).toHaveBeenCalledWith('access', 'refresh', expect.objectContaining({ id: 'patient-1' }));
  });

  it('reuses single-use verification tokens when profile loading needs a retry', async () => {
    (patients.getMyProfile as jest.Mock).mockRejectedValueOnce(new ApiError(503, 'Please retry.')).mockResolvedValue({ data: profile });
    const screen = render(<SignUpScreen />);
    await account(screen);
    fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByRole('button', { name: 'Verify & create account' }));
    await screen.findByRole('alert');
    expect(patients.create).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled();
    fireEvent.press(screen.getByRole('button', { name: 'Finish setup' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(auth.verifyOtp).toHaveBeenCalledTimes(1);
    expect(patients.getMyProfile).toHaveBeenCalledTimes(2);
  });

  it('keeps resend disabled during the cooldown and exposes each password visibility control', async () => {
    const screen = render(<SignUpScreen />);
    details(screen);
    fireEvent.press(screen.getByLabelText('Show create password'));
    expect(screen.getByLabelText('Create password').props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText('Confirm password').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Previous step' }));
    await account(screen);
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeDisabled();
    fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    expect(auth.resendOtp).not.toHaveBeenCalled();
  });
});
