import { S3Service } from './s3.service';

const mockGetSignedUrl = jest.fn();
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

const USER = '11111111-1111-1111-1111-111111111111';

function build() {
  const config = {
    get: jest.fn((k: string, d?: string) => (k === 'AWS_REGION' ? 'af-south-1' : d)),
    getOrThrow: jest.fn().mockReturnValue('hha-bucket'),
  };
  return new S3Service(config as any);
}

describe('S3Service avatar signing', () => {
  beforeEach(() => mockGetSignedUrl.mockReset().mockResolvedValue('https://signed.example/x'));

  it('signs bucket avatar URLs with a single 1-hour expiry', async () => {
    const s3 = build();
    const url = s3.publicUrlFor(`profile-photos/${USER}/a.webp`);
    await expect(s3.signStoredUrl(url)).resolves.toBe('https://signed.example/x');
    expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 3600 });
  });

  it('passes external URLs through unchanged', async () => {
    const s3 = build();
    await expect(s3.signStoredUrl('https://cdn.example/a.png')).resolves.toBe('https://cdn.example/a.png');
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it('still signs legacy-format bucket photos that are not profile-photos/<uuid>/...', async () => {
    const s3 = build();
    for (const key of ['avatars/old-user.png', 'profile-photos/not-a-uuid/My Photo.jpg', 'uploads/2024/a/b.jpeg']) {
      mockGetSignedUrl.mockClear();
      await expect(s3.signStoredUrl(s3.publicUrlFor(key))).resolves.toBe('https://signed.example/x');
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    }
  });

  it('refuses keys that escape the bucket', async () => {
    const s3 = build();
    await expect(s3.signStoredUrl(s3.publicUrlFor('a/../../etc'))).resolves.toBeNull();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  describe('resolvePhotoInput', () => {
    const OTHER = '22222222-2222-2222-2222-222222222222';
    it('accepts an unchanged stored value, raw or signed, without requiring the owner prefix', () => {
      const s3 = build();
      const legacy = s3.publicUrlFor('avatars/old.png');
      expect(s3.resolvePhotoInput(legacy, USER, [legacy])).toBeUndefined();
      expect(s3.resolvePhotoInput(`${legacy}?X-Amz-Signature=z`, USER, [legacy])).toBeUndefined();
    });
    it('accepts a new value under the owner folder and strips any signature', () => {
      const s3 = build();
      const own = s3.publicUrlFor(`profile-photos/${USER}/n.webp`);
      expect(s3.resolvePhotoInput(`${own}?sig=1`, USER, [])).toBe(own);
    });
    it('rejects a new value outside the owner folder', () => {
      const s3 = build();
      expect(() => s3.resolvePhotoInput(s3.publicUrlFor(`profile-photos/${OTHER}/x.webp`), USER, [])).toThrow();
      expect(() => s3.resolvePhotoInput('https://tracker.example/p.png', USER, [])).toThrow();
    });
    it('ignores empty input', () => {
      expect(build().resolvePhotoInput('', USER, [])).toBeUndefined();
    });
  });

  describe('withSignedPhoto', () => {
    it('returns a copy with the photo signed and other fields untouched', async () => {
      const s3 = build();
      const row = { id: 'p1', profilePhotoUrl: s3.publicUrlFor(`profile-photos/${USER}/a.webp`) };
      const out = await s3.withSignedPhoto(row);
      expect(out).toEqual({ id: 'p1', profilePhotoUrl: 'https://signed.example/x' });
      expect(row.profilePhotoUrl).toContain('hha-bucket');
    });

    it('passes null/undefined rows through', async () => {
      const s3 = build();
      await expect(s3.withSignedPhoto(null)).resolves.toBeNull();
      await expect(s3.withSignedPhoto(undefined)).resolves.toBeUndefined();
    });

    it('yields null photo when none stored', async () => {
      const s3 = build();
      await expect(s3.withSignedPhoto({ id: 'x', profilePhotoUrl: null })).resolves.toEqual({
        id: 'x',
        profilePhotoUrl: null,
      });
    });
  });
});
