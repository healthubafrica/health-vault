import { AuthController } from './auth.controller';

describe('AuthController profile photo endpoints', () => {
  const base = 'https://b.s3/';
  const make = (existing: string[] = []) => {
    const authService = {
      clearProfilePhoto: jest.fn().mockResolvedValue(undefined),
      getStoredPhotoUrls: jest.fn().mockResolvedValue(existing),
      setProfilePhoto: jest.fn(async (_u: string, url: string) => ({ profilePhotoUrl: url })),
    };
    const s3 = {
      publicUrlFor: jest.fn((k: string) => `${base}${k}`),
      canonicalPhotoUrl: jest.fn((u: string) => u.split('?')[0]),
      resolvePhotoInput: jest.fn((input: string, _o: string, ex: string[]) =>
        ex.includes(input.split('?')[0]) ? undefined : input.split('?')[0]),
      signStoredUrl: jest.fn(async (u: string) => `signed:${u}`),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };
    return { authService, s3, controller: new AuthController(authService as any, s3 as any) };
  };

  it('clears the active reference and never deletes the stored object', async () => {
    const { controller, s3, authService } = make([`${base}profile-photos/u1/a.jpg`]);
    const res = await controller.clearProfilePhoto({ sub: 'u1' } as any);
    expect(res).toEqual({ profilePhotoUrl: null });
    expect(authService.clearProfilePhoto).toHaveBeenCalledWith('u1');
    expect(s3.deleteObject).not.toHaveBeenCalled();
  });

  it('setProfilePhoto re-submitting the current value (signed) is accepted and keeps the canonical value', async () => {
    const stored = `${base}profile-photos/u1/a.jpg`;
    const { controller, authService, s3 } = make([stored]);
    const res = await controller.setProfilePhoto({ profilePhotoUrl: `${stored}?sig=1` } as any, { sub: 'u1' } as any);
    expect(authService.setProfilePhoto).toHaveBeenCalledWith('u1', stored);
    expect(res).toEqual({ profilePhotoUrl: `signed:${stored}` });
    expect(s3.deleteObject).not.toHaveBeenCalled();
  });
});
