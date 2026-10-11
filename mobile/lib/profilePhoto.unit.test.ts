import { uploadProfilePhoto, normaliseContentType } from './profilePhoto';

const mockUpload = jest.fn();
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 2048 }),
  uploadAsync: (...a: unknown[]) => mockUpload(...a),
  FileSystemUploadType: { BINARY_CONTENT: 0 },
}));
jest.mock('./api', () => ({
  patients: {
    getProfilePhotoUploadUrl: jest.fn(),
    processProfilePhoto: jest.fn(),
  },
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { patients } = require('./api');

describe('profile photo upload', () => {
  beforeEach(() => {
    mockUpload.mockReset().mockResolvedValue({ status: 200 });
    patients.getProfilePhotoUploadUrl.mockReset().mockResolvedValue({ uploadUrl: 'https://s3/put', objectKey: 'profile-photos/u/1.jpg' });
    patients.processProfilePhoto.mockReset().mockResolvedValue({ profilePhotoUrl: 'https://cdn/p.webp' });
  });

  it('presigns, PUTs the bytes, then processes', async () => {
    const url = await uploadProfilePhoto({ uri: 'file:///p.jpg', mimeType: 'image/jpeg', fileSize: 1000 });
    expect(patients.getProfilePhotoUploadUrl).toHaveBeenCalledWith({ contentType: 'image/jpeg', sizeBytes: 1000 });
    expect(mockUpload).toHaveBeenCalledWith(
      'https://s3/put',
      'file:///p.jpg',
      expect.objectContaining({ httpMethod: 'PUT', headers: { 'Content-Type': 'image/jpeg' } }),
    );
    expect(patients.processProfilePhoto).toHaveBeenCalledWith('profile-photos/u/1.jpg');
    expect(url).toBe('https://cdn/p.webp');
  });

  it('reads the size from disk when the picker omits it', async () => {
    await uploadProfilePhoto({ uri: 'file:///p.jpg' });
    expect(patients.getProfilePhotoUploadUrl).toHaveBeenCalledWith({ contentType: 'image/jpeg', sizeBytes: 2048 });
  });

  it('rejects oversized photos before any request', async () => {
    await expect(uploadProfilePhoto({ uri: 'x', fileSize: 11 * 1024 * 1024 })).rejects.toThrow('too large');
    expect(patients.getProfilePhotoUploadUrl).not.toHaveBeenCalled();
  });

  it('does not process when the S3 upload fails', async () => {
    mockUpload.mockResolvedValue({ status: 403 });
    await expect(uploadProfilePhoto({ uri: 'x', fileSize: 10 })).rejects.toThrow('upload failed');
    expect(patients.processProfilePhoto).not.toHaveBeenCalled();
  });

  it('falls back to jpeg for unsupported mime types', () => {
    expect(normaliseContentType('image/gif')).toBe('image/jpeg');
    expect(normaliseContentType('IMAGE/PNG')).toBe('image/png');
  });
});
