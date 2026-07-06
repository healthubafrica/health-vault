-- Adds bookkeeping columns to appointments for patient self-service
-- cancel/reschedule (cancelledAt timestamp, previous slot, and reschedule
-- count), plus a singleton SchedulingPolicy table controlling the
-- self-service cancellation/reschedule windows.
ALTER TABLE "appointments" ADD COLUMN "cancelled_at" TIMESTAMP(3);
ALTER TABLE "appointments" ADD COLUMN "previous_scheduled_at" TIMESTAMP(3);
ALTER TABLE "appointments" ADD COLUMN "reschedule_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: HHA Scheduling Policy
-- Singleton row (fixed id) controlling patient self-service cancel/reschedule windows
CREATE TABLE "hha_scheduling_policy" (
    "id" UUID NOT NULL,
    "cancellation_window_hours" INTEGER NOT NULL DEFAULT 24,
    "reschedule_window_hours" INTEGER NOT NULL DEFAULT 24,
    "self_service_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hha_scheduling_policy_pkey" PRIMARY KEY ("id")
);
