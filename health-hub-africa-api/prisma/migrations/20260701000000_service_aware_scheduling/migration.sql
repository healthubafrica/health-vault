-- CreateTable: HHA Provider Service Groups
-- Links providers to service types with priority assignment (1=primary, 2=backup, 3=overflow)
CREATE TABLE "hha_provider_service_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hha_provider_service_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HHA Shift Templates
-- Defines recurring time-window patterns for a service on a specific day of week
CREATE TABLE "hha_shift_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hha_shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HHA Provider Shift Assignments
-- Assigns a provider (via service group) to a shift template for a date range
CREATE TABLE "hha_provider_shift_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_service_group_id" UUID NOT NULL,
    "shift_template_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hha_provider_shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hha_provider_service_groups_service_type_is_active_idx" ON "hha_provider_service_groups"("service_type", "is_active");
CREATE UNIQUE INDEX "hha_provider_service_groups_provider_id_service_type_key" ON "hha_provider_service_groups"("provider_id", "service_type");

CREATE INDEX "hha_shift_templates_service_type_is_active_idx" ON "hha_shift_templates"("service_type", "is_active");

CREATE UNIQUE INDEX "hha_provider_shift_assignments_provider_service_group_id_shift_template_id_key" ON "hha_provider_shift_assignments"("provider_service_group_id", "shift_template_id");

-- AddForeignKey
ALTER TABLE "hha_provider_service_groups" ADD CONSTRAINT "hha_provider_service_groups_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "hha_provider_shift_assignments" ADD CONSTRAINT "hha_provider_shift_assignments_provider_service_group_id_fkey" FOREIGN KEY ("provider_service_group_id") REFERENCES "hha_provider_service_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "hha_provider_shift_assignments" ADD CONSTRAINT "hha_provider_shift_assignments_shift_template_id_fkey" FOREIGN KEY ("shift_template_id") REFERENCES "hha_shift_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
