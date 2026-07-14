import { buildProfileData } from './providers.service';

describe('buildProfileData', () => {
  it('maps structured arrays straight through', () => {
    const result = buildProfileData({
      subSpecializations: ['Interventional Cardiology'],
      certifications: ['BLS', 'ACLS'],
      professionalMemberships: ['Nigerian Medical Association'],
      languages: ['English', 'Yoruba'],
      clinicalInterests: ['Heart failure'],
      consultationServices: ['Echocardiography'],
    });

    expect(result).toMatchObject({
      subspecialties: ['Interventional Cardiology'],
      certifications: ['BLS', 'ACLS'],
      professionalMemberships: ['Nigerian Medical Association'],
      languages: ['English', 'Yoruba'],
      clinicalInterests: ['Heart failure'],
      consultationServices: ['Echocardiography'],
    });
  });

  it('prefers qualificationsList over the legacy free-text string', () => {
    const result = buildProfileData({
      qualificationsList: ['MBBS', 'FMCP'],
      qualifications: 'ignored, because list wins',
    });
    expect(result.qualifications).toEqual(['MBBS', 'FMCP']);
  });

  it('splits legacy free-text qualifications on commas and newlines', () => {
    const result = buildProfileData({ qualifications: 'MBBS, FWACP\nPhD' });
    expect(result.qualifications).toEqual(['MBBS', 'FWACP', 'PhD']);
  });

  it('folds legacy office* fields into a single clinicAddress line', () => {
    const result = buildProfileData({
      officeAddress: '12 Marina Rd',
      officeCity: 'Lagos',
      officeState: 'Lagos',
      officeCountry: 'Nigeria',
    });
    expect(result.clinicAddress).toBe('12 Marina Rd, Lagos, Lagos, Nigeria');
  });

  it('lets an explicit clinicAddress win over legacy office fields', () => {
    const result = buildProfileData({
      clinicAddress: '5 Awolowo Way',
      officeAddress: 'legacy',
    });
    expect(result.clinicAddress).toBe('5 Awolowo Way');
  });

  it('maps currentHospital to clinicName when clinicName is absent', () => {
    const result = buildProfileData({ currentHospital: 'St. Nicholas Hospital' });
    expect(result.clinicName).toBe('St. Nicholas Hospital');
  });

  it('only includes keys that were provided (partial update safety)', () => {
    const result = buildProfileData({ bio: 'Hello' });
    expect(result).toEqual({ bio: 'Hello' });
    expect('languages' in result).toBe(false);
  });
});
