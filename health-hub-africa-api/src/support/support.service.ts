import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupportTicketStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateTicketDto, AddMessageDto, UpdateTicketStatusDto } from './dto/create-ticket.dto';

// TKT-YYYY-000001 sequential ticket ID
async function generateTicketId(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;
  const last = await prisma.supportTicket.findFirst({
    where: { ticketId: { startsWith: prefix } },
    orderBy: { ticketId: 'desc' },
    select: { ticketId: true },
  });
  const seq = last ? parseInt(last.ticketId.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(dto: CreateTicketDto, currentUser: JwtPayload) {
    const ticketId = await generateTicketId(this.prisma);

    return this.prisma.supportTicket.create({
      data: {
        ticketId,
        userId: currentUser.sub,
        subject: dto.subject,
        description: dto.description,
        category: dto.category,
        priority: dto.priority ?? 'normal',
        messages: {
          create: {
            senderId: currentUser.sub,
            message: dto.description,
          },
        },
      },
      include: { messages: true },
    });
  }

  async findAll(currentUser: JwtPayload) {
    const isAdmin = [UserRole.admin, UserRole.super_admin, UserRole.coordinator].includes(
      currentUser.role as UserRole,
    );

    return this.prisma.supportTicket.findMany({
      where: isAdmin ? {} : { userId: currentUser.sub },
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { sentAt: 'desc' }, take: 1 } },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { sentAt: 'asc' } } },
    });

    if (!ticket) throw new NotFoundException('Support ticket not found');

    const isAdmin = [UserRole.admin, UserRole.super_admin, UserRole.coordinator].includes(
      currentUser.role as UserRole,
    );
    if (!isAdmin && ticket.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }

    return ticket;
  }

  async addMessage(id: string, dto: AddMessageDto, currentUser: JwtPayload) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });

    if (!ticket) throw new NotFoundException('Support ticket not found');

    const isAdmin = [UserRole.admin, UserRole.super_admin, UserRole.coordinator].includes(
      currentUser.role as UserRole,
    );
    if (!isAdmin && ticket.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }

    // Re-open ticket if patient replies to a resolved one
    const shouldReopen =
      !isAdmin &&
      ticket.status === SupportTicketStatus.resolved;

    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          ticketId: id,
          senderId: currentUser.sub,
          message: dto.message,
          attachmentUrls: dto.attachmentKeys ?? [],
          isStaff: isAdmin,
        },
      }),
      ...(shouldReopen
        ? [
            this.prisma.supportTicket.update({
              where: { id },
              data: { status: SupportTicketStatus.open },
            }),
          ]
        : []),
    ]);

    return message;
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto, currentUser: JwtPayload) {
    const isAdmin = [UserRole.admin, UserRole.super_admin, UserRole.coordinator].includes(
      currentUser.role as UserRole,
    );
    if (!isAdmin) throw new ForbiddenException('Admin access required');

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: dto.status,
        assignedToId: dto.assignedToId,
        resolvedAt: dto.status === SupportTicketStatus.resolved ? new Date() : undefined,
      },
    });
  }
}
