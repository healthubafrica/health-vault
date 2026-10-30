import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ProvidersService } from './providers.service';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { realPhotoResolvers } from '../storage/s3.test-helper';

function build() {
  const prisma: any = {
    provider: {
      findUnique: jest.fn().mockResolvedValue({
        id: '1', userId: 'prov-user', firstName: 'Ada', lastName: 'Obi', title: 'Dr.',
        profilePhotoUrl: null, user: { profilePhotoUrl: null },
      }),
      update: jest.fn().mockResolvedValue({ id: '1', userId: 'prov-user' }),
    },
    user: { update: jest.fn().mockResolvedValue({}) },
  };
  const openemr = { enqueueProviderSync: jest.fn().mockResolvedValue(undefined) };
  const s3 = { ...realPhotoResolvers(), withSignedPhoto: jest.fn(async (r: any) => r) };
  return { service: new ProvidersService(prisma, openemr as any, s3 as any), prisma };
}

const admin = { sub: 'admin-user', role: UserRole.admin } as any;
const owner = { sub: 'prov-user', role: UserRole.provider } as any;

// Same options as main.ts — unknown fields are rejected, not stripped.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const validate = (body: object) => pipe.transform(body, { type: 'body', metatype: UpdateProviderDto });

describe('UpdateProviderDto (admin Edit Profile payload)', () => {
  it('accepts title and specialization', async () => {
    await expect(validate({ title: 'Prof.', firstName: 'Ada', specialization: 'Cardiology' })).resolves.toBeDefined();
  });

  it('rejects the old specialty field instead of silently dropping it', async () => {
    await expect(validate({ specialty: 'Cardiology' })).rejects.toThrow();
  });
});

describe('ProvidersService.update title', () => {
  it('lets an admin change the title without clearing verification', async () => {
    const { service, prisma } = build();
    await service.update('1', { title: 'Nurse' } as UpdateProviderDto, admin);
    const data = prisma.provider.update.mock.calls[0][0].data;
    expect(data.title).toBe('Nurse');
    expect(data).not.toHaveProperty('verifiedAt');
  });

  it('refuses a title change from the provider themselves', async () => {
    const { service, prisma } = build();
    await expect(service.update('1', { title: 'Dr.' } as UpdateProviderDto, owner)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.provider.update).not.toHaveBeenCalled();
  });
});
