import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookAppointmentStep2Screen from './book-appointment-step2';
import BookAppointmentStep3Screen from './book-appointment-step3';
import BookAppointmentStep4Screen from './book-appointment-step4';
import { ApiError } from '@/lib/api';
import { BOOKING_DURATION_MINUTES } from '@/lib/booking';

// The first test cold-loads a large screen; give slow CI/dev machines headroom.
jest.setTimeout(30000);

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/components/TopHeaderEmergency', () => () => null);
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ApiError: actual.ApiError,
    analytics: { track: jest.fn() },
    generateIdempotencyKey: () => 'idem-key-1',
    appointments: {
      listProviders: jest.fn(),
      getSlots: jest.fn(),
      create: jest.fn(),
      getSchedulingPolicy: jest.fn(),
      facilities: jest.fn(),
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { appointments } = require('@/lib/api');

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const provider = {
  id: 'prov-1',
  firstName: 'Ada',
  lastName: 'Okafor',
  title: 'Dr.',
  specialty: 'General Practice',
  isAvailable: true,
};

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockParams = {};
  appointments.listProviders.mockReset();
  appointments.getSlots.mockReset();
  appointments.create.mockReset();
  appointments.facilities.mockReset().mockResolvedValue([{ id: 'fac-1', name: 'Lekki Partner Clinic', city: 'Lagos' }]);
  appointments.getSchedulingPolicy.mockReset().mockResolvedValue({
    cancellationWindowHours: 12,
    rescheduleWindowHours: 12,
    selfServiceEnabled: true,
  });
});

describe('Step 2 — choose clinician', () => {
  beforeEach(() => {
    mockParams = { serviceId: 'telecare', serviceName: 'TeleCare', serviceType: 'TeleCare' };
  });

  it('lists the providers the API returns', async () => {
    appointments.listProviders.mockResolvedValue([provider]);
    const { findByText } = renderWithClient(<BookAppointmentStep2Screen />);

    expect(await findByText('Dr. Ada Okafor')).toBeTruthy();
    expect(appointments.listProviders).toHaveBeenCalledWith('TeleCare');
  });

  it('renders a rating that arrives as a string (Prisma Decimal) instead of crashing', async () => {
    appointments.listProviders.mockResolvedValue([{ ...provider, rating: '4.5' }]);
    const { findByText } = renderWithClient(<BookAppointmentStep2Screen />);

    expect(await findByText('4.5')).toBeTruthy();
  });

  it('shows the real error and a retry — not "No clinicians available" — when the request fails', async () => {
    appointments.listProviders.mockRejectedValue(new ApiError(500, 'Server exploded'));
    const { findByText, queryByText } = renderWithClient(<BookAppointmentStep2Screen />);

    expect(await findByText(/Server exploded/)).toBeTruthy();
    expect(queryByText('No clinicians available')).toBeNull();
  });

  it('retries the request when "Try again" is pressed', async () => {
    appointments.listProviders.mockRejectedValueOnce(new ApiError(500, 'Server exploded'));
    appointments.listProviders.mockResolvedValue([provider]);
    const { findByText } = renderWithClient(<BookAppointmentStep2Screen />);

    fireEvent.press(await findByText('Try again'));

    expect(await findByText('Dr. Ada Okafor')).toBeTruthy();
    expect(appointments.listProviders).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state only when the API genuinely returns no providers', async () => {
    appointments.listProviders.mockResolvedValue([]);
    const { findByText } = renderWithClient(<BookAppointmentStep2Screen />);

    expect(await findByText('No clinicians available')).toBeTruthy();
  });
});

describe('No provider chosen (the care team assigns one, like the web portal)', () => {
  beforeEach(() => {
    mockParams = { serviceId: 'telecare', serviceName: 'TeleCare', serviceType: 'TeleCare' };
  });

  it('lets the patient continue from step 2 without picking anyone, even when no providers are listed', async () => {
    appointments.listProviders.mockResolvedValue([]);
    const { findByText } = renderWithClient(<BookAppointmentStep2Screen />);

    fireEvent.press(await findByText('Continue to Date & Time'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const { pathname, params } = mockPush.mock.calls[0][0];
    expect(pathname).toBe('/book-appointment-step3');
    expect(params.providerId).toBe('');
  });

  it('still lets the patient continue when the provider list fails to load', async () => {
    appointments.listProviders.mockRejectedValue(new ApiError(500, 'boom'));
    const { findByText } = renderWithClient(<BookAppointmentStep2Screen />);

    await findByText('Try again');
    fireEvent.press(await findByText('Continue to Date & Time'));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('step 3 merges every provider’s slots when none is chosen', async () => {
    const a = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const b = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
    appointments.getSlots.mockResolvedValue([
      { providerId: 'p1', providerName: 'A', slots: [a] },
      { providerId: 'p2', providerName: 'B', slots: [b] },
    ]);
    mockParams = { ...mockParams, providerId: '' };
    const label = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
    const { findByText } = renderWithClient(<BookAppointmentStep3Screen />);

    expect(await findByText(label(a))).toBeTruthy();
    expect(await findByText(label(b))).toBeTruthy();
  });

  it('step 3 offers requested times when nobody has a schedule, so booking is never blocked', async () => {
    appointments.getSlots.mockResolvedValue([]);
    mockParams = { ...mockParams, providerId: '' };
    const { findByText } = renderWithClient(<BookAppointmentStep3Screen />);

    expect(await findByText(/No fixed schedule for this day/)).toBeTruthy();
  });

  it('step 4 books without a providerId and says a clinician will be assigned', async () => {
    mockParams = {
      serviceId: 'telecare', serviceName: 'TeleCare', serviceType: 'TeleCare', providerId: '', providerName: '',
      consultationFormat: 'video', scheduledAtIso: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    };
    appointments.create.mockResolvedValue({ hhaRef: 'APT-2026-000003' });
    const { findByText } = renderWithClient(<BookAppointmentStep4Screen />);

    fireEvent.press(await findByText('Confirm appointment'));

    await waitFor(() => expect(appointments.create).toHaveBeenCalled());
    expect(appointments.create.mock.calls[0][0]).not.toHaveProperty('providerId');
    expect(await findByText(/A clinician will be assigned/)).toBeTruthy();
  });
});

describe('Step 3 — choose a slot', () => {
  const slotIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const slotLabel = new Date(slotIso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

  beforeEach(() => {
    mockParams = {
      serviceId: 'telecare',
      serviceName: 'TeleCare',
      serviceType: 'TeleCare',
      providerId: 'prov-1',
      providerName: 'Dr. Ada Okafor',
      providerSpecialty: 'General Practice',
      providerInitials: 'AO',
    };
  });

  it('asks for slots at the same length it later books, so a slot is never longer than its window', async () => {
    appointments.getSlots.mockResolvedValue([{ providerId: 'prov-1', providerName: 'Dr', slots: [slotIso] }]);
    renderWithClient(<BookAppointmentStep3Screen />);

    await waitFor(() => expect(appointments.getSlots).toHaveBeenCalled());
    expect(appointments.getSlots.mock.calls[0][0]).toMatchObject({
      serviceType: 'TeleCare',
      providerId: 'prov-1',
      durationMinutes: BOOKING_DURATION_MINUTES,
    });
  });

  it('shows the real error and a retry when slots fail to load', async () => {
    appointments.getSlots.mockRejectedValue(new ApiError(503, 'Scheduling is unavailable'));
    const { findByText, queryByText } = renderWithClient(<BookAppointmentStep3Screen />);

    expect(await findByText(/Scheduling is unavailable/)).toBeTruthy();
    expect(queryByText(/No slots available this day/)).toBeNull();
  });

  it('forwards the chosen slot and duration to step 4 with no invented provider or fee defaults', async () => {
    appointments.getSlots.mockResolvedValue([{ providerId: 'prov-1', providerName: 'Dr', slots: [slotIso] }]);
    const { findByText } = renderWithClient(<BookAppointmentStep3Screen />);

    fireEvent.press(await findByText(slotLabel));
    fireEvent.press(await findByText('Continue to Summary'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const { pathname, params } = mockPush.mock.calls[0][0];
    expect(pathname).toBe('/book-appointment-step4');
    expect(params).toMatchObject({ providerId: 'prov-1', scheduledAtIso: slotIso, serviceType: 'TeleCare' });
    expect(JSON.stringify(params)).not.toMatch(/Naledi|15,000/);
  });

  it('drops the selected slot when the date changes, so a stale slot can never be booked', async () => {
    appointments.getSlots.mockResolvedValue([{ providerId: 'prov-1', providerName: 'Dr', slots: [slotIso] }]);
    const { findByText, getAllByText } = renderWithClient(<BookAppointmentStep3Screen />);

    fireEvent.press(await findByText(slotLabel));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    fireEvent.press(getAllByText(String(tomorrow.getDate()))[0]);
    fireEvent.press(await findByText('Continue to Summary'));

    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('Step 3 — in-person services need a facility', () => {
  const slotIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const slotLabel = new Date(slotIso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

  beforeEach(() => {
    mockParams = { serviceId: 'care-test', serviceName: 'CareTest', serviceType: 'CareTest', providerId: 'prov-1', providerName: 'Dr. Ada Okafor' };
    appointments.getSlots.mockResolvedValue([{ providerId: 'prov-1', providerName: 'Dr', slots: [slotIso] }]);
  });

  it('will not continue until a facility is chosen, then forwards it', async () => {
    const { findByText } = renderWithClient(<BookAppointmentStep3Screen />);

    fireEvent.press(await findByText(slotLabel));
    fireEvent.press(await findByText('Continue to Summary'));
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.press(await findByText('Lekki Partner Clinic'));
    fireEvent.press(await findByText('Continue to Summary'));
    expect(mockPush.mock.calls[0][0].params).toMatchObject({
      consultationFormat: 'in_person',
      facilityId: 'fac-1',
      facilityName: 'Lekki Partner Clinic',
    });
  });

  it('keeps TeleCare video-only with no facility picker', async () => {
    mockParams = { ...mockParams, serviceId: 'telecare', serviceName: 'TeleCare', serviceType: 'TeleCare' };
    const { queryByText, findByText } = renderWithClient(<BookAppointmentStep3Screen />);

    await findByText(slotLabel);
    expect(queryByText('CHOOSE A FACILITY')).toBeNull();
    expect(appointments.facilities).not.toHaveBeenCalled();
  });
});

describe('Step 4 — confirm booking', () => {
  const scheduledAtIso = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  beforeEach(() => {
    mockParams = {
      serviceId: 'telecare',
      serviceName: 'TeleCare',
      serviceType: 'TeleCare',
      providerId: 'prov-1',
      providerName: 'Dr. Ada Okafor',
      providerSpecialty: 'General Practice',
      providerInitials: 'AO',
      consultationFormat: 'video',
      appointmentDate: 'Fri, 12 Oct',
      appointmentTime: '09:00 am',
      scheduledAtIso,
      reason: 'Headache',
    };
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => (Alert.alert as jest.Mock).mockRestore());

  it('books with the same duration the slots were generated for, and an idempotency key', async () => {
    appointments.create.mockResolvedValue({ hhaRef: 'APT-2026-000001' });
    const { findByText } = renderWithClient(<BookAppointmentStep4Screen />);

    fireEvent.press(await findByText('Confirm appointment'));

    await waitFor(() => expect(appointments.create).toHaveBeenCalled());
    const [payload, key] = appointments.create.mock.calls[0];
    expect(payload).toMatchObject({
      appointmentType: 'virtual',
      serviceType: 'TeleCare',
      scheduledAt: scheduledAtIso,
      durationMinutes: BOOKING_DURATION_MINUTES,
      providerId: 'prov-1',
      chiefComplaint: 'Headache',
    });
    expect(payload.notes).toBeUndefined();
    expect(key).toBe('idem-key-1');
    expect(await findByText(/APT-2026-000001/)).toBeTruthy();
  });

  it('does not show an invented price or claim a payment that is never taken', async () => {
    const { findByText, queryByText } = renderWithClient(<BookAppointmentStep4Screen />);

    await findByText('Confirm appointment');
    expect(queryByText(/₦/)).toBeNull();
    expect(queryByText(/Consultation Fee/)).toBeNull();
    expect(queryByText(/Flutterwave/)).toBeNull();
    expect(queryByText(/money-back/i)).toBeNull();
  });

  it("shows the real cancellation window from the backend's scheduling policy", async () => {
    const { findByText } = renderWithClient(<BookAppointmentStep4Screen />);

    expect(await findByText(/12 hours before/)).toBeTruthy();
  });

  it('books an in-person visit at the chosen facility', async () => {
    mockParams = { ...mockParams, serviceType: 'CareTest', serviceName: 'CareTest', consultationFormat: 'in_person', facilityId: 'fac-1', facilityName: 'Lekki Partner Clinic' };
    appointments.create.mockResolvedValue({ hhaRef: 'APT-2026-000002' });
    const { findByText } = renderWithClient(<BookAppointmentStep4Screen />);

    fireEvent.press(await findByText('Confirm appointment'));

    await waitFor(() => expect(appointments.create).toHaveBeenCalled());
    expect(appointments.create.mock.calls[0][0]).toMatchObject({
      appointmentType: 'in_person',
      serviceType: 'CareTest',
      facilityId: 'fac-1',
    });
  });

  it('tells the patient when the booking fails instead of faking a confirmation', async () => {
    appointments.create.mockRejectedValue(new ApiError(409, 'This provider is already booked for the selected time.'));
    const { findByText, queryByText } = renderWithClient(<BookAppointmentStep4Screen />);

    fireEvent.press(await findByText('Confirm appointment'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Booking failed', 'This provider is already booked for the selected time.'),
    );
    expect(queryByText('Appointment Booked!')).toBeNull();
  });
});
