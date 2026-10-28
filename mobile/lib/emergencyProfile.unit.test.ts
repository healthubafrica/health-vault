import * as SecureStore from 'expo-secure-store';
import { toEmergencySnapshot, saveEmergencyProfile } from './emergencyProfile';
import type { PatientProfile } from './api';

jest.mock('expo-secure-store', () => ({ setItemAsync: jest.fn(), getItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));

const profile = {
  firstName: 'Ada',
  lastName: 'Obi',
  bloodGroup: 'O_PLUS',
  medicalInfo: { allergies: ['Penicillin'], chronicConditions: [], activeMedications: ['x'.repeat(500)] },
  emergencyContacts: [{ fullName: 'Chidi', relationship: 'Brother', phone: '+2348000000000', isPrimary: true }],
} as unknown as PatientProfile;

describe('emergencyProfile', () => {
  it('keeps only the emergency fields, with nothing invented for empty ones', () => {
    const s = toEmergencySnapshot(profile);
    expect(s).toMatchObject({
      name: 'Ada Obi',
      bloodGroup: 'O+',
      allergies: 'Penicillin',
      chronicConditions: null,
      contact: { name: 'Chidi', phone: '+2348000000000', relationship: 'Brother' },
    });
  });

  it('clips long lists before storing so the value fits SecureStore', async () => {
    await saveEmergencyProfile(profile);
    const stored = JSON.parse((SecureStore.setItemAsync as jest.Mock).mock.calls[0][1]);
    expect(stored.medications.length).toBeLessThanOrEqual(300);
    expect(stored.allergies).toBe('Penicillin');
  });
});
