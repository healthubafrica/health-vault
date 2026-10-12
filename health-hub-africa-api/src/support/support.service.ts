import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Gender, UserRole } from '@prisma/client';
import { SupportTicketStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateTicketDto, AddMessageDto, UpdateTicketStatusDto } from './dto/create-ticket.dto';

const ADMIN_ROLES: UserRole[] = [UserRole.admin, UserRole.super_admin, UserRole.coordinator];

// TKT-YYYY-000001 sequential ticket reference
async function generateTicketRef(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;
  const last = await prisma.supportTicket.findFirst({
    where: { hhaRef: { startsWith: prefix } },
    orderBy: { hhaRef: 'desc' },
    select: { hhaRef: true },
  });
  const seq = last ? parseInt(last.hhaRef.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

const PERSON_SELECT = {
  email: true,
  profilePhotoUrl: true,
  patient: { select: { firstName: true, lastName: true, gender: true, profilePhotoUrl: true } },
  provider: { select: { firstName: true, lastName: true, gender: true, profilePhotoUrl: true } },
} as const;

type PersonRow = {
  email: string;
  profilePhotoUrl: string | null;
  patient: { firstName: string; lastName: string; gender: Gender; profilePhotoUrl: string | null } | null;
  provider: { firstName: string; lastName: string; gender: Gender | null; profilePhotoUrl: string | null } | null;
};

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  // Ticket people carry just enough for an avatar: signed photo (patient row
  // wins, like the rest of the app) and the patient's gender. Raw stored
  // photo URLs never leave the service.
  private async shapePerson(u: PersonRow | null) {
    if (!u) return u;
    const { profilePhotoUrl, patient, provider, ...rest } = u;
    return {
      ...rest,
      patient: patient ? { firstName: patient.firstName, lastName: patient.lastName, gender: patient.gender } : null,
      provider: provider ? { firstName: provider.firstName, lastName: provider.lastName, gender: provider.gender } : null,
      profilePhotoUrl: await this.s3.signStoredUrl(
        patient?.profilePhotoUrl || provider?.profilePhotoUrl || profilePhotoUrl,
      ),
    };
  }

  async createTicket(dto: CreateTicketDto, currentUser: JwtPayload) {
    const hhaRef = await generateTicketRef(this.prisma);

    // The ticket itself has no description column — the description becomes
    // the opening message of the thread.
    return this.prisma.supportTicket.create({
      data: {
        hhaRef,
        submittedBy: currentUser.sub,
        patientId: currentUser.patientId ?? null,
        subject: dto.subject,
        category: dto.category ?? 'general',
        priority: dto.priority ?? 'normal',
        messages: {
          create: {
            senderId: currentUser.sub,
            body: dto.description,
          },
        },
      },
      include: { messages: { where: { isInternal: false } } },
    });
  }

  async findAll(currentUser: JwtPayload, status?: string) {
    const isAdmin = ADMIN_ROLES.includes(currentUser.role as UserRole);
    const statusFilter = status ? { status } : {};

    const tickets = await this.prisma.supportTicket.findMany({
      where: isAdmin
        ? statusFilter
        : { submittedBy: currentUser.sub, ...statusFilter },
      orderBy: { updatedAt: 'desc' },
      include: {
        submitter: {
          select: PERSON_SELECT,
        },
        assignee: {
          select: PERSON_SELECT,
        },
        _count: { select: { messages: isAdmin ? true : { where: { isInternal: false } } } },
      },
    });

    return Promise.all(
      tickets.map(async (t) => {
        const submitter = await this.shapePerson(t.submitter);
        return {
          ...t,
          submitter,
          assignee: await this.shapePerson(t.assignee),
          // Flat avatar fields for list rows (photo already signed above).
          userProfilePhotoUrl: submitter?.profilePhotoUrl ?? null,
          userGender: submitter?.patient?.gender ?? null,
        };
      }),
    );
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const isAdmin = ADMIN_ROLES.includes(currentUser.role as UserRole);
    // Internal staff notes never reach non-staff callers.
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          ...(isAdmin ? {} : { where: { isInternal: false } }),
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Support ticket not found');

    if (!isAdmin && ticket.submittedBy !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }

    return ticket;
  }

  async addMessage(id: string, dto: AddMessageDto, currentUser: JwtPayload) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, submittedBy: true, status: true },
    });

    if (!ticket) throw new NotFoundException('Support ticket not found');

    const isAdmin = ADMIN_ROLES.includes(currentUser.role as UserRole);
    if (!isAdmin && ticket.submittedBy !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }

    // Re-open ticket if patient replies to a resolved one
    const shouldReopen = !isAdmin && ticket.status === SupportTicketStatus.resolved;

    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          ticketId: id,
          senderId: currentUser.sub,
          body: dto.message,
          attachmentUrl: dto.attachmentKeys?.[0],
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
    const isAdmin = ADMIN_ROLES.includes(currentUser.role as UserRole);
    if (!isAdmin) throw new ForbiddenException('Admin access required');

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: dto.status,
        assignedTo: dto.assignedToId,
        resolvedAt: dto.status === SupportTicketStatus.resolved ? new Date() : undefined,
        closedAt: dto.status === SupportTicketStatus.closed ? new Date() : undefined,
      },
    });
  }
}
