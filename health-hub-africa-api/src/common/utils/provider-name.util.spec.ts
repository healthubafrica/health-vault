import { normalizeProviderName, buildProviderDisplayName } from './provider-name.util';

describe('normalizeProviderName', () => {
  it('leaves a clean name and title unchanged', () => {
    expect(normalizeProviderName('Jane', 'Smith', 'Dr.')).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('does not misread a name that merely starts with title-like letters', () => {
    // "Drew" starts with "Dr" but must never be read as a title prefix.
    expect(normalizeProviderName('Drew', 'Barrymore', 'Dr.')).toEqual({
      firstName: 'Drew',
      lastName: 'Barrymore',
      title: 'Dr.',
    });
  });

  it('strips a title embedded in firstName into the title field', () => {
    expect(normalizeProviderName('Dr. Jane', 'Smith', undefined)).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('strips a title embedded in lastName into the title field', () => {
    expect(normalizeProviderName('Jane', 'Dr. Smith', undefined)).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('prefers an explicit, already-clean title over one embedded in the name', () => {
    expect(normalizeProviderName('Prof. Jane', 'Smith', 'Dr.')).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('collapses a duplicated title string ("Dr. Dr." -> "Dr.")', () => {
    expect(normalizeProviderName('Jane', 'Smith', 'Dr. Dr.')).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('collapses a title repeated inside firstName ("Dr. Dr. Jane")', () => {
    expect(normalizeProviderName('Dr. Dr. Jane', 'Smith', undefined)).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('returns empty title when nothing is supplied and nothing is embedded', () => {
    expect(normalizeProviderName('Jane', 'Smith', undefined)).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: '',
    });
  });

  it.each([
    ['Prof. Jane', 'Prof.'],
    ['Mr. Jane', 'Mr.'],
    ['Mrs. Jane', 'Mrs.'],
    ['Ms. Jane', 'Ms.'],
    ['Miss Jane', 'Miss'],
    ['Dr Jane', 'Dr.'], // no period, space-only separator
  ])('recognizes "%s" as title %s', (rawFirstName, expectedTitle) => {
    const result = normalizeProviderName(rawFirstName, 'Smith', undefined);
    expect(result.title).toBe(expectedTitle);
    expect(result.firstName).toBe('Jane');
  });
});

describe('buildProviderDisplayName', () => {
  it('joins title, firstName, and lastName with single spaces', () => {
    expect(buildProviderDisplayName({ title: 'Dr.', firstName: 'Jane', lastName: 'Smith' })).toBe(
      'Dr. Jane Smith',
    );
  });

  it('omits the title segment when title is missing', () => {
    expect(buildProviderDisplayName({ title: null, firstName: 'Jane', lastName: 'Smith' })).toBe(
      'Jane Smith',
    );
  });
});
