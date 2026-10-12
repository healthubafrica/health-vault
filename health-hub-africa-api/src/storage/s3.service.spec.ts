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

  it('passes external URLs through and nulls non-avatar bucket keys', async () => {
    const s3 = build();
    await expect(s3.signStoredUrl('https://cdn.example/a.png')).resolves.toBe('https://cdn.example/a.png');
    await expect(s3.signStoredUrl(s3.publicUrlFor('clinical/secret.pdf'))).resolves.toBeNull();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
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
