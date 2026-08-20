-- Safe/additive: Postgres adds enum values without locking existing rows.
ALTER TYPE "RecordType" ADD VALUE 'visit_summary';
