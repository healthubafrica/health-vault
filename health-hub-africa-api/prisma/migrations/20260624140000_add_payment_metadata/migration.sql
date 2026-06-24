-- Threads structured intent through the gateway round-trip so the webhook
-- handler can activate a subscription (or other side-effects) once a
-- payment lands. Distinct from gateway_response, which captures the raw
-- PSP webhook payload and is overwritten on success.

ALTER TABLE payments
  ADD COLUMN metadata JSONB;
