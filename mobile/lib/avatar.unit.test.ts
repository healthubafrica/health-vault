import { genderArt, initialsOf, fullName, providerAvatarProps } from './avatar';

describe('genderArt', () => {
  it.each([
    ['Male', 'male'],
    ['male', 'male'],
    ['Female', 'female'],
    ['female', 'female'],
    ['Other', 'neutral'],
    ['other', 'neutral'],
    ['Prefer_not_to_say', 'neutral'],
    ['Prefer not to say', 'neutral'],
  ])('%s -> %s', (input, art) => {
    expect(genderArt(input)).toBe(art);
  });

  it.each([[null], [undefined], [''], ['unknown']])('%p -> null', (input) => {
    expect(genderArt(input as string | null | undefined)).toBeNull();
  });
});

describe('initialsOf', () => {
  it('uses first and last word', () => {
    expect(initialsOf('ada lovelace byron')).toBe('AB');
  });
  it('handles one-word, empty and nullish names', () => {
    expect(initialsOf('Ada')).toBe('A');
    expect(initialsOf('')).toBe('');
    expect(initialsOf('   ')).toBe('');
    expect(initialsOf(null)).toBe('');
    expect(initialsOf(undefined)).toBe('');
  });
  it('skips a leading title', () => {
    expect(initialsOf('Dr. Ngozi Okafor')).toBe('NO');
    expect(initialsOf('Dr Ngozi')).toBe('N');
  });
});

describe('fullName', () => {
  it('joins present parts', () => {
    expect(fullName('Ada', 'Obi')).toBe('Ada Obi');
    expect(fullName('Ada', undefined)).toBe('Ada');
    expect(fullName(null, null)).toBe('');
  });
});

describe('providerAvatarProps', () => {
  it('maps photo, gender and full name', () => {
    expect(
      providerAvatarProps({ firstName: 'Ada', lastName: 'Obi', profilePhotoUrl: 'https://x/a.jpg', gender: 'Female' }),
    ).toEqual({ uri: 'https://x/a.jpg', gender: 'Female', name: 'Ada Obi' });
  });
  it('degrades when photo and gender are absent', () => {
    expect(providerAvatarProps({ firstName: 'Ada', lastName: 'Obi' })).toEqual({
      uri: undefined,
      gender: undefined,
      name: 'Ada Obi',
    });
  });
  it('handles a missing provider', () => {
    expect(providerAvatarProps(null)).toEqual({ uri: undefined, gender: undefined, name: '' });
  });
});
