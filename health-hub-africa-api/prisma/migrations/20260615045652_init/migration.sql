-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('patient', 'provider', 'coordinator', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('requested', 'confirmed', 'upcoming', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('MinuteCare', 'TeleCare', 'CareTest', 'HealthConsult', 'ExpertReview', 'NeuroFlex', 'DispatchCare');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('visit', 'prescription', 'lab', 'imaging', 'document', 'referral', 'expert_review');

-- CreateEnum
CREATE TYPE "LabStatus" AS ENUM ('pending', 'normal', 'review', 'critical');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('scheduled', 'waiting', 'active', 'completed', 'missed', 'cancelled');

-- CreateEnum
CREATE TYPE "EmergencyType" AS ENUM ('Breathing_Difficulty', 'Chest_Pain', 'Accident_Injury', 'Stroke_Symptoms', 'Severe_Weakness', 'Other');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('requested', 'triaged', 'unit_assigned', 'en_route', 'on_scene', 'patient_stabilised', 'transported', 'closed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded', 'disputed');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('Paystack', 'Flutterwave', 'manual');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('Free', 'Basic', 'Mid_Level', 'Gold', 'Corporate');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'cancelled', 'expired', 'trial');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('planned', 'beta', 'active', 'deprecated');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other', 'Prefer not to say');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

-- CreateEnum
CREATE TYPE "ExpertReviewStatus" AS ENUM ('submitted', 'under_review', 'specialist_assigned', 'in_consultation', 'report_ready', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "ExpertReviewUrgency" AS ENUM ('routine', 'urgent', 'emergency');

-- CreateEnum
CREATE TYPE "ExpertReviewType" AS ENUM ('second_opinion', 'multi_specialist', 'surgical_review', 'imaging_review', 'pathology_review');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'patient',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "hha_id" TEXT NOT NULL,
    "region_code" CHAR(3) NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "date_of_birth" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "nationality" TEXT,
    "state_of_origin" TEXT,
    "lga_of_origin" TEXT,
    "profile_photo_url" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "blood_group" "BloodGroup",
    "next_of_kin_name" TEXT,
    "next_of_kin_relationship" TEXT,
    "next_of_kin_phone" TEXT,
    "genotype" TEXT,
    "nin" TEXT,
    "gdpr_consent" BOOLEAN NOT NULL DEFAULT false,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "preferred_timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "openemr_patient_uuid" TEXT,
    "openemr_sync_status" TEXT NOT NULL DEFAULT 'pending',
    "status" TEXT NOT NULL DEFAULT 'Stable',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_medical_info" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "allergies" TEXT[],
    "chronic_conditions" TEXT[],
    "active_medications" TEXT[],
    "active_care_plan" TEXT,
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_medical_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Dr.',
    "specialty" TEXT NOT NULL,
    "license_number" TEXT,
    "profile_photo_url" TEXT,
    "bio" TEXT,
    "rating" DECIMAL(3,2),
    "total_patients" INTEGER NOT NULL DEFAULT 0,
    "years_experience" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "openemr_provider_uuid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "service_type" "ServiceType",
    "is_telecare" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_provider_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "patient_provider_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hha_ref" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'requested',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" SMALLINT NOT NULL DEFAULT 30,
    "reason" TEXT,
    "is_telecare" BOOLEAN NOT NULL DEFAULT false,
    "meeting_url" TEXT,
    "location" TEXT,
    "patient_notes" TEXT,
    "provider_notes" TEXT,
    "cancelled_by" UUID,
    "cancellation_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "remind_at" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hha_ref" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "provider_id" UUID,
    "appointment_id" UUID,
    "record_type" "RecordType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT,
    "file_mime_type" TEXT,
    "file_size_bytes" INTEGER,
    "is_downloadable" BOOLEAN NOT NULL DEFAULT true,
    "recorded_at" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "record_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "drug_name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT NOT NULL DEFAULT 'oral',
    "duration_days" INTEGER,
    "refills_remaining" INTEGER NOT NULL DEFAULT 0,
    "dispensed_at" TIMESTAMP(3),
    "expires_at" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hha_ref" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "ordered_by" UUID NOT NULL,
    "appointment_id" UUID,
    "clinical_record_id" UUID,
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collected_at" TIMESTAMP(3),
    "reported_at" TIMESTAMP(3),
    "overall_status" "LabStatus" NOT NULL DEFAULT 'pending',
    "lab_facility" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "test_name" TEXT NOT NULL,
    "test_code" TEXT,
    "status" "LabStatus" NOT NULL DEFAULT 'pending',
    "value_display" TEXT,
    "unit" TEXT,
    "reference_range" TEXT,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "interpretation_note" TEXT,
    "is_downloadable" BOOLEAN NOT NULL DEFAULT true,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_result_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "result_id" UUID NOT NULL,
    "analyte_name" TEXT NOT NULL,
    "analyte_code" TEXT,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "reference_low" TEXT,
    "reference_high" TEXT,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "flag_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_result_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vitals_readings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" UUID,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "heart_rate" SMALLINT,
    "systolic_bp" SMALLINT,
    "diastolic_bp" SMALLINT,
    "spo2" DECIMAL(4,1),
    "weight_kg" DECIMAL(5,2),
    "height_cm" DECIMAL(5,2),
    "temperature_c" DECIMAL(4,1),
    "blood_glucose" DECIMAL(6,2),
    "hba1c" DECIMAL(4,2),
    "wbc" DECIMAL(8,2),
    "rbc" DECIMAL(8,2),
    "haemoglobin" DECIMAL(5,2),
    "platelets" INTEGER,
    "sleep_hours" DECIMAL(4,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vitals_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telecare_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hha_ref" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "appointment_id" UUID,
    "status" "SessionStatus" NOT NULL DEFAULT 'scheduled',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "meeting_url" TEXT,
    "recording_url" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'HHA Native',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telecare_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telecare_session_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "chief_complaint" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "follow_up_days" INTEGER,
    "record_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telecare_session_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hha_ref" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "for_self" BOOLEAN NOT NULL DEFAULT true,
    "emergency_type" "EmergencyType" NOT NULL,
    "description" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'requested',
    "location_text" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "location_accuracy" DECIMAL(8,2),
    "unit_id" UUID,
    "assigned_at" TIMESTAMP(3),
    "eta_minutes" SMALLINT,
    "arrived_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "stride_triage_score" SMALLINT,
    "stride_priority" TEXT,
    "hpacs_facility_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "status" "DispatchStatus" NOT NULL,
    "actor_id" UUID,
    "notes" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "call_sign" TEXT NOT NULL,
    "unit_type" TEXT NOT NULL,
    "base_location" TEXT,
    "current_latitude" DECIMAL(10,7),
    "current_longitude" DECIMAL(10,7),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_facilities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "facility_type" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "total_beds" INTEGER,
    "available_beds" INTEGER,
    "has_icu" BOOLEAN NOT NULL DEFAULT false,
    "has_maternity" BOOLEAN NOT NULL DEFAULT false,
    "has_trauma" BOOLEAN NOT NULL DEFAULT false,
    "capacity_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "price_kobo" INTEGER NOT NULL,
    "billing_period" TEXT NOT NULL DEFAULT 'monthly',
    "features" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "payment_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hha_ref" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "amount_kobo" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "gateway" "PaymentGateway" NOT NULL,
    "gateway_ref" TEXT,
    "gateway_response" JSONB,
    "idempotency_key" TEXT,
    "description" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "refund_amount_kobo" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_line_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" SMALLINT NOT NULL DEFAULT 1,
    "unit_price_kobo" INTEGER NOT NULL,
    "total_kobo" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hha_ref" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "payment_id" UUID,
    "subtotal_kobo" INTEGER NOT NULL,
    "tax_kobo" INTEGER NOT NULL DEFAULT 0,
    "total_kobo" INTEGER NOT NULL,
    "due_at" TIMESTAMP(3),
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "action_label" TEXT,
    "action_url" TEXT,
    "reference_type" TEXT,
    "reference_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "alert_id" UUID,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "provider_ref" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "appointment_reminders" BOOLEAN NOT NULL DEFAULT true,
    "lab_result_alerts" BOOLEAN NOT NULL DEFAULT true,
    "payment_receipts" BOOLEAN NOT NULL DEFAULT true,
    "dispatch_updates" BOOLEAN NOT NULL DEFAULT true,
    "expert_review_updates" BOOLEAN NOT NULL DEFAULT true,
    "marketing_comms" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stride_phases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "version" TEXT NOT NULL,
    "status" "PhaseStatus" NOT NULL DEFAULT 'planned',
    "uptime_pct" DECIMAL(6,4),
    "avg_response_ms" INTEGER,
    "cases_today" INTEGER NOT NULL DEFAULT 0,
    "active_units" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stride_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stride_triage_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dispatch_request_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "input_payload" JSONB NOT NULL,
    "triage_score" SMALLINT NOT NULL,
    "priority_class" TEXT NOT NULL,
    "recommended_facility_id" UUID,
    "model_version" TEXT NOT NULL,
    "confidence" DECIMAL(5,4),
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stride_triage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_review_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hha_ref" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "coordinator_id" UUID,
    "lead_physician_id" UUID,
    "specialist_id" UUID,
    "review_type" "ExpertReviewType" NOT NULL,
    "urgency" "ExpertReviewUrgency" NOT NULL DEFAULT 'routine',
    "status" "ExpertReviewStatus" NOT NULL DEFAULT 'submitted',
    "clinical_question" TEXT NOT NULL,
    "primary_diagnosis" TEXT,
    "referral_notes" TEXT,
    "openemr_encounter_id" TEXT,
    "appointment_id" UUID,
    "payment_id" UUID,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "specialist_assigned_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "expert_review_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_review_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_mime_type" TEXT,
    "file_size_bytes" INTEGER,
    "clinical_record_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expert_review_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_review_status_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "from_status" "ExpertReviewStatus",
    "to_status" "ExpertReviewStatus" NOT NULL,
    "actor_id" UUID,
    "notes" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expert_review_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_review_specialist_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "note_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_visible_to_patient" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_review_specialist_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_review_final_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "authored_by" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "clinical_opinion" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_appointment_id" UUID,
    "disclaimer_accepted" BOOLEAN NOT NULL DEFAULT false,
    "disclaimer_accepted_at" TIMESTAMP(3),
    "pdf_url" TEXT,
    "clinical_record_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_review_final_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "consent_type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "notes" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "patient_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hha_ref" TEXT NOT NULL,
    "submitted_by" UUID NOT NULL,
    "patient_id" UUID,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assigned_to" UUID,
    "reference_type" TEXT,
    "reference_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "attachment_url" TEXT,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_errors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "request_id" TEXT,
    "request_payload" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "patient_id" UUID,
    "retry_count" SMALLINT NOT NULL DEFAULT 0,
    "resolved_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openemr_sync_queue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "max_attempts" SMALLINT NOT NULL DEFAULT 3,
    "last_attempted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "scheduled_for" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "openemr_sync_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_activity_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "session_id" UUID,
    "event_name" TEXT NOT NULL,
    "service_type" "ServiceType",
    "properties" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_usage_daily" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_date" DATE NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "unique_patients" INTEGER NOT NULL DEFAULT 0,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "cancelled_count" INTEGER NOT NULL DEFAULT 0,
    "avg_duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_usage_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_date" DATE NOT NULL,
    "service_type" "ServiceType",
    "gateway" "PaymentGateway",
    "total_transactions" INTEGER NOT NULL DEFAULT 0,
    "gross_revenue_kobo" BIGINT NOT NULL DEFAULT 0,
    "refunds_kobo" BIGINT NOT NULL DEFAULT 0,
    "net_revenue_kobo" BIGINT NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_review_funnel_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_date" DATE NOT NULL,
    "cases_submitted" INTEGER NOT NULL DEFAULT 0,
    "cases_accepted" INTEGER NOT NULL DEFAULT 0,
    "specialist_assigned" INTEGER NOT NULL DEFAULT 0,
    "reports_issued" INTEGER NOT NULL DEFAULT 0,
    "avg_turnaround_hours" DECIMAL(8,2),
    "p90_turnaround_hours" DECIMAL(8,2),
    "cancellation_rate" DECIMAL(5,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_review_funnel_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_kpis" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active_subscriptions" INTEGER NOT NULL DEFAULT 0,
    "mrr_kobo" BIGINT NOT NULL DEFAULT 0,
    "active_dispatch_units" INTEGER NOT NULL DEFAULT 0,
    "open_dispatch_requests" INTEGER NOT NULL DEFAULT 0,
    "telecare_sessions_today" INTEGER NOT NULL DEFAULT 0,
    "expert_cases_open" INTEGER NOT NULL DEFAULT 0,
    "avg_stride_latency_ms" INTEGER,
    "openemr_sync_pending" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_kpis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_refresh_token_idx" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_hha_id_key" ON "patients"("hha_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_openemr_patient_uuid_key" ON "patients"("openemr_patient_uuid");

-- CreateIndex
CREATE INDEX "patients_user_id_idx" ON "patients"("user_id");

-- CreateIndex
CREATE INDEX "patients_hha_id_idx" ON "patients"("hha_id");

-- CreateIndex
CREATE INDEX "patients_region_code_idx" ON "patients"("region_code");

-- CreateIndex
CREATE INDEX "patients_openemr_patient_uuid_idx" ON "patients"("openemr_patient_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "patient_medical_info_patient_id_key" ON "patient_medical_info"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "providers_user_id_key" ON "providers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "providers_license_number_key" ON "providers"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "providers_openemr_provider_uuid_key" ON "providers"("openemr_provider_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "patient_provider_assignments_patient_id_provider_id_unassig_key" ON "patient_provider_assignments"("patient_id", "provider_id", "unassigned_at");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_hha_ref_key" ON "appointments"("hha_ref");

-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_provider_id_idx" ON "appointments"("provider_id");

-- CreateIndex
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments"("scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_records_hha_ref_key" ON "clinical_records"("hha_ref");

-- CreateIndex
CREATE INDEX "clinical_records_patient_id_idx" ON "clinical_records"("patient_id");

-- CreateIndex
CREATE INDEX "clinical_records_record_type_idx" ON "clinical_records"("record_type");

-- CreateIndex
CREATE INDEX "clinical_records_recorded_at_idx" ON "clinical_records"("recorded_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_record_id_key" ON "prescriptions"("record_id");

-- CreateIndex
CREATE UNIQUE INDEX "lab_orders_hha_ref_key" ON "lab_orders"("hha_ref");

-- CreateIndex
CREATE INDEX "lab_orders_patient_id_idx" ON "lab_orders"("patient_id");

-- CreateIndex
CREATE INDEX "lab_results_order_id_idx" ON "lab_results"("order_id");

-- CreateIndex
CREATE INDEX "lab_results_patient_id_idx" ON "lab_results"("patient_id");

-- CreateIndex
CREATE INDEX "vitals_readings_patient_id_recorded_at_idx" ON "vitals_readings"("patient_id", "recorded_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "telecare_sessions_hha_ref_key" ON "telecare_sessions"("hha_ref");

-- CreateIndex
CREATE UNIQUE INDEX "telecare_sessions_appointment_id_key" ON "telecare_sessions"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "telecare_session_notes_session_id_key" ON "telecare_session_notes"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_requests_hha_ref_key" ON "dispatch_requests"("hha_ref");

-- CreateIndex
CREATE INDEX "dispatch_requests_patient_id_idx" ON "dispatch_requests"("patient_id");

-- CreateIndex
CREATE INDEX "dispatch_requests_status_idx" ON "dispatch_requests"("status");

-- CreateIndex
CREATE INDEX "dispatch_events_request_id_occurred_at_idx" ON "dispatch_events"("request_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_units_call_sign_key" ON "dispatch_units"("call_sign");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE INDEX "patient_subscriptions_patient_id_idx" ON "patient_subscriptions"("patient_id");

-- CreateIndex
CREATE INDEX "patient_subscriptions_status_idx" ON "patient_subscriptions"("status");

-- CreateIndex
CREATE INDEX "patient_subscriptions_expires_at_idx" ON "patient_subscriptions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_hha_ref_key" ON "payments"("hha_ref");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_ref_key" ON "payments"("gateway_ref");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_patient_id_idx" ON "payments"("patient_id");

-- CreateIndex
CREATE INDEX "payments_gateway_ref_idx" ON "payments"("gateway_ref");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_hha_ref_key" ON "invoices"("hha_ref");

-- CreateIndex
CREATE INDEX "patient_alerts_patient_id_idx" ON "patient_alerts"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "stride_phases_code_key" ON "stride_phases"("code");

-- CreateIndex
CREATE INDEX "stride_triage_logs_dispatch_request_id_idx" ON "stride_triage_logs"("dispatch_request_id");

-- CreateIndex
CREATE INDEX "stride_triage_logs_patient_id_idx" ON "stride_triage_logs"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_review_cases_hha_ref_key" ON "expert_review_cases"("hha_ref");

-- CreateIndex
CREATE INDEX "expert_review_cases_patient_id_idx" ON "expert_review_cases"("patient_id");

-- CreateIndex
CREATE INDEX "expert_review_cases_status_idx" ON "expert_review_cases"("status");

-- CreateIndex
CREATE INDEX "expert_review_cases_specialist_id_idx" ON "expert_review_cases"("specialist_id");

-- CreateIndex
CREATE INDEX "expert_review_cases_submitted_at_idx" ON "expert_review_cases"("submitted_at" DESC);

-- CreateIndex
CREATE INDEX "expert_review_documents_case_id_idx" ON "expert_review_documents"("case_id");

-- CreateIndex
CREATE INDEX "expert_review_status_events_case_id_occurred_at_idx" ON "expert_review_status_events"("case_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "expert_review_specialist_notes_case_id_idx" ON "expert_review_specialist_notes"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_review_final_reports_case_id_key" ON "expert_review_final_reports"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_review_final_reports_clinical_record_id_key" ON "expert_review_final_reports"("clinical_record_id");

-- CreateIndex
CREATE INDEX "patient_consents_patient_id_idx" ON "patient_consents"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_consents_patient_id_consent_type_key" ON "patient_consents"("patient_id", "consent_type");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_occurred_at_idx" ON "audit_logs"("actor_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_patient_id_occurred_at_idx" ON "audit_logs"("patient_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_hha_ref_key" ON "support_tickets"("hha_ref");

-- CreateIndex
CREATE INDEX "support_tickets_patient_id_idx" ON "support_tickets"("patient_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_messages_ticket_id_created_at_idx" ON "support_messages"("ticket_id", "created_at" ASC);

-- CreateIndex
CREATE INDEX "integration_errors_service_occurred_at_idx" ON "integration_errors"("service", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "integration_errors_patient_id_idx" ON "integration_errors"("patient_id");

-- CreateIndex
CREATE INDEX "openemr_sync_queue_status_scheduled_for_idx" ON "openemr_sync_queue"("status", "scheduled_for" ASC);

-- CreateIndex
CREATE INDEX "openemr_sync_queue_patient_id_idx" ON "openemr_sync_queue"("patient_id");

-- CreateIndex
CREATE INDEX "patient_activity_events_patient_id_occurred_at_idx" ON "patient_activity_events"("patient_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "patient_activity_events_event_name_occurred_at_idx" ON "patient_activity_events"("event_name", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "service_usage_daily_report_date_idx" ON "service_usage_daily"("report_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "service_usage_daily_report_date_service_type_key" ON "service_usage_daily"("report_date", "service_type");

-- CreateIndex
CREATE INDEX "revenue_summaries_report_date_idx" ON "revenue_summaries"("report_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "revenue_summaries_report_date_service_type_gateway_key" ON "revenue_summaries"("report_date", "service_type", "gateway");

-- CreateIndex
CREATE UNIQUE INDEX "expert_review_funnel_metrics_report_date_key" ON "expert_review_funnel_metrics"("report_date");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_medical_info" ADD CONSTRAINT "patient_medical_info_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_availability" ADD CONSTRAINT "provider_availability_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_provider_assignments" ADD CONSTRAINT "patient_provider_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_provider_assignments" ADD CONSTRAINT "patient_provider_assignments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "clinical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_ordered_by_fkey" FOREIGN KEY ("ordered_by") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_result_items" ADD CONSTRAINT "lab_result_items_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "lab_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitals_readings" ADD CONSTRAINT "vitals_readings_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitals_readings" ADD CONSTRAINT "vitals_readings_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telecare_sessions" ADD CONSTRAINT "telecare_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telecare_sessions" ADD CONSTRAINT "telecare_sessions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telecare_sessions" ADD CONSTRAINT "telecare_sessions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telecare_session_notes" ADD CONSTRAINT "telecare_session_notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "telecare_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telecare_session_notes" ADD CONSTRAINT "telecare_session_notes_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "clinical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_requests" ADD CONSTRAINT "dispatch_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_requests" ADD CONSTRAINT "dispatch_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_requests" ADD CONSTRAINT "dispatch_requests_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "dispatch_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_requests" ADD CONSTRAINT "dispatch_requests_hpacs_facility_id_fkey" FOREIGN KEY ("hpacs_facility_id") REFERENCES "healthcare_facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_events" ADD CONSTRAINT "dispatch_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "dispatch_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_events" ADD CONSTRAINT "dispatch_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_subscriptions" ADD CONSTRAINT "patient_subscriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_subscriptions" ADD CONSTRAINT "patient_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_subscriptions" ADD CONSTRAINT "patient_subscriptions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_line_items" ADD CONSTRAINT "payment_line_items_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_alerts" ADD CONSTRAINT "patient_alerts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "patient_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stride_triage_logs" ADD CONSTRAINT "stride_triage_logs_dispatch_request_id_fkey" FOREIGN KEY ("dispatch_request_id") REFERENCES "dispatch_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stride_triage_logs" ADD CONSTRAINT "stride_triage_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stride_triage_logs" ADD CONSTRAINT "stride_triage_logs_recommended_facility_id_fkey" FOREIGN KEY ("recommended_facility_id") REFERENCES "healthcare_facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_cases" ADD CONSTRAINT "expert_review_cases_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_cases" ADD CONSTRAINT "expert_review_cases_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_cases" ADD CONSTRAINT "expert_review_cases_lead_physician_id_fkey" FOREIGN KEY ("lead_physician_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_cases" ADD CONSTRAINT "expert_review_cases_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_cases" ADD CONSTRAINT "expert_review_cases_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_cases" ADD CONSTRAINT "expert_review_cases_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_documents" ADD CONSTRAINT "expert_review_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "expert_review_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_documents" ADD CONSTRAINT "expert_review_documents_clinical_record_id_fkey" FOREIGN KEY ("clinical_record_id") REFERENCES "clinical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_status_events" ADD CONSTRAINT "expert_review_status_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "expert_review_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_status_events" ADD CONSTRAINT "expert_review_status_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_specialist_notes" ADD CONSTRAINT "expert_review_specialist_notes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "expert_review_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_specialist_notes" ADD CONSTRAINT "expert_review_specialist_notes_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_final_reports" ADD CONSTRAINT "expert_review_final_reports_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "expert_review_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_final_reports" ADD CONSTRAINT "expert_review_final_reports_authored_by_fkey" FOREIGN KEY ("authored_by") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_final_reports" ADD CONSTRAINT "expert_review_final_reports_follow_up_appointment_id_fkey" FOREIGN KEY ("follow_up_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review_final_reports" ADD CONSTRAINT "expert_review_final_reports_clinical_record_id_fkey" FOREIGN KEY ("clinical_record_id") REFERENCES "clinical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_errors" ADD CONSTRAINT "integration_errors_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openemr_sync_queue" ADD CONSTRAINT "openemr_sync_queue_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_activity_events" ADD CONSTRAINT "patient_activity_events_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_activity_events" ADD CONSTRAINT "patient_activity_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
