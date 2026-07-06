import type { PrismaService } from '../prisma/prisma.service';

export const SCHEDULING_POLICY_ID = '00000000-0000-0000-0000-000000000001';

export const DEFAULT_SCHEDULING_POLICY = {
  cancellationWindowHours: 24,
  rescheduleWindowHours: 24,
  selfServiceEnabled: true,
} as const;

export interface SchedulingPolicyValues {
  cancellationWindowHours: number;
  rescheduleWindowHours: number;
  selfServiceEnabled: boolean;
}

/**
 * Reads the singleton scheduling policy row, falling back to defaults if it
 * hasn't been seeded yet (avoids a hard dependency on seed/migration order).
 */
export async function getSchedulingPolicy(prisma: PrismaService): Promise<SchedulingPolicyValues> {
  const row = await prisma.schedulingPolicy.findUnique({ where: { id: SCHEDULING_POLICY_ID } });
  if (!row) return { ...DEFAULT_SCHEDULING_POLICY };
  return {
    cancellationWindowHours: row.cancellationWindowHours,
    rescheduleWindowHours: row.rescheduleWindowHours,
    selfServiceEnabled: row.selfServiceEnabled,
  };
}
