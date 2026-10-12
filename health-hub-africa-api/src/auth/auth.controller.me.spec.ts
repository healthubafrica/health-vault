import { AuthController } from './auth.controller';

describe('AuthController.getMe', () => {
  it('returns fullName, gender and a signed profilePhotoUrl alongside the existing fields', async () => {
    const authService = {
      getUserById: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        role: 'patient',
        fullName: 'Ada Obi',
        gender: 'Female',
        profilePhotoUrl: 'raw',
      }),
    };
    const s3 = { signStoredUrl: jest.fn().mockResolvedValue('signed') };
    const controller = new AuthController(authService as any, s3 as any);

    const res = await controller.getMe({ sub: 'u1' } as any);

    expect(res).toEqual({
      data: {
        id: 'u1',
        email: 'a@b.com',
        role: 'patient',
        fullName: 'Ada Obi',
        gender: 'Female',
        profilePhotoUrl: 'signed',
      },
    });
    expect(s3.signStoredUrl).toHaveBeenCalledWith('raw');
  });
});
