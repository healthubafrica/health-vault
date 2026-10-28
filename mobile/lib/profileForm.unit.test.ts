import { buildProfileUpdate, type ProfileForm } from './profileForm';

const form: ProfileForm = {
  firstName: ' Ada ', lastName: 'Obi', dateOfBirth: '1990-04-12', gender: 'Female', bloodType: 'O+',
  genotype: 'AS', height: '172', weight: '70,5', address: '1 Marina', city: 'Lagos', state: 'Lagos',
  country: 'Nigeria', nin: '',
};

describe('buildProfileUpdate', () => {
  it('builds the same fields the portal sends', () => {
    const res = buildProfileUpdate(form);
    expect(res).toEqual({
      ok: true,
      body: {
        firstName: 'Ada', lastName: 'Obi', dateOfBirth: '1990-04-12', gender: 'Female', bloodGroup: 'O_PLUS',
        genotype: 'AS', address: '1 Marina', city: 'Lagos', state: 'Lagos', country: 'Nigeria',
        medicalInfo: { heightCm: 172, weightKg: 70.5 },
      },
    });
  });

  it('sends null for cleared optional fields so they can be removed', () => {
    const res = buildProfileUpdate({ ...form, genotype: '', city: ' ', height: '', weight: '' });
    expect(res.ok && res.body).toMatchObject({ genotype: null, city: null, medicalInfo: { heightCm: null, weightKg: null } });
  });

  it.each([
    [{ firstName: '' }, /name/],
    [{ dateOfBirth: '12/04/1990' }, /YYYY-MM-DD/],
    [{ height: '5.8' }, /centimetres/],
    [{ weight: 'abc' }, /kilograms/],
  ])('rejects %p with a clear message', (patch, msg) => {
    const res = buildProfileUpdate({ ...form, ...patch });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(msg);
  });
});
