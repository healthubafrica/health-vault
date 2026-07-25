import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService.updateUserEmail', () => {
  const existingUser = { id: 'user-1', email: 'old@example.com', role: 'provider' };

  function buildService(
    findUniqueImpl?: (args: { where: { id?: string; email?: string } }) => unknown,
  ) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockImplementation(
          findUniqueImpl ??
            (({ where }: { where: { id?: string; email?: string } }) =>
              where.id === existingUser.id ? existingUser : null),
        ),
        update: jest.fn().mockResolvedValue({
          id: existingUser.id,
          email: 'new@example.com',
          role: existingUser.role,
        }),
      },
      userSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    const authService = {
      requestPasswordReset: jest.fn().mockResolvedValue({ message: 'ok' }),
    };

    const service = new AdminService(
      prisma as never,
      {} as never, // openemrQueue
      {} as never, // notificationsQueue
      {} as never, // redis
      {} as never, // openemrService
      {} as never, // notifications
      {} as never, // s3
      authService as never,
    );

    return { service, prisma, authService };
  }

  it('throws NotFoundException when the user does not exist', async () => {
    const { service } = buildService(() => null);
    await expect(service.updateUserEmail('missing', 'new@example.com')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws BadRequestException when the new email is already taken', async () => {
    const { service } = buildService(({ where }) =>
      where.id === existingUser.id
        ? existingUser
        : where.email === 'taken@example.com'
        ? { id: 'other-user' }
        : null,
    );
    await expect(
      service.updateUserEmail(existingUser.id, 'taken@example.com'),
    ).rejects.toThrow(BadRequestException);
  });

  it('no-ops without sending a reset code when the email is unchanged', async () => {
    const { service, prisma, authService } = buildService();
    const result = await service.updateUserEmail(existingUser.id, existingUser.email);

    expect(result).toEqual({
      data: { id: existingUser.id, email: existingUser.email, message: 'Email unchanged.' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(authService.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('updates the email, revokes sessions, and sends a reset code on the happy path', async () => {
    const { service, prisma, authService } = buildService();
    const result = await service.updateUserEmail(existingUser.id, 'new@example.com');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: existingUser.id },
      data: { email: 'new@example.com' },
      select: { id: true, email: true, role: true },
    });
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
      where: { userId: existingUser.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(authService.requestPasswordReset).toHaveBeenCalledWith('new@example.com');
    expect(result).toEqual({
      data: {
        id: existingUser.id,
        email: 'new@example.com',
        message: 'Email updated and password reset code sent.',
      },
    });
  });

  it('still reports success when the reset-code email fails to send', async () => {
    const { service, authService } = buildService();
    authService.requestPasswordReset.mockRejectedValue(new Error('SMTP down'));

    const result = await service.updateUserEmail(existingUser.id, 'new@example.com');
    expect(result.data.message).toBe('Email updated and password reset code sent.');
  });
});
