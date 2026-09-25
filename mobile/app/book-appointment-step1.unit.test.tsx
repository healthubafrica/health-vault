import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BookAppointmentStep1Screen from './book-appointment-step1';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: { preselect?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

describe('BookAppointmentStep1Screen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockParams = {};
  });

  it('shows step 1 of 4 progress', () => {
    const { getByText } = render(<BookAppointmentStep1Screen />);
    expect(getByText('Step 1 of 4: Select Service')).toBeTruthy();
  });

  it('continues with the default service (TeleCare) when nothing was preselected', () => {
    const { getByText } = render(<BookAppointmentStep1Screen />);
    fireEvent.press(getByText('Continue'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/book-appointment-step2',
      params: { serviceId: 'telecare', serviceName: 'TeleCare', serviceType: 'TeleCare' },
    });
  });

  it('continues with the service passed in via the preselect param', () => {
    mockParams = { preselect: 'care-test' };
    const { getByText } = render(<BookAppointmentStep1Screen />);
    fireEvent.press(getByText('Continue'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/book-appointment-step2',
      params: { serviceId: 'care-test', serviceName: 'CareTest', serviceType: 'CareTest' },
    });
  });

  it('switches selection when a different service card is pressed, then continues with it', () => {
    const { getByText } = render(<BookAppointmentStep1Screen />);
    fireEvent.press(getByText('Quick Care, Anytime, Anywhere')); // MinuteCare tagline
    fireEvent.press(getByText('Continue'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/book-appointment-step2',
      params: { serviceId: 'minute-care', serviceName: 'MinuteCare', serviceType: 'MinuteCare' },
    });
  });

  it('goes back on Cancel without pushing a new route', () => {
    const { getByText } = render(<BookAppointmentStep1Screen />);
    fireEvent.press(getByText('Cancel'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
