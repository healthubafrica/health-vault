-- Add link_opened and share_expired to the ShareAccessAction enum
-- link_opened: logged when a recipient first navigates to the share URL
-- share_expired: logged with occurredAt = expiresAt when an expired share is accessed

ALTER TYPE "ShareAccessAction" ADD VALUE IF NOT EXISTS 'link_opened';
ALTER TYPE "ShareAccessAction" ADD VALUE IF NOT EXISTS 'share_expired';
