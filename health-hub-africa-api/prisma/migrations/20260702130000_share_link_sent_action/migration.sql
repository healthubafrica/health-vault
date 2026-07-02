-- Record when the secure share link itself is delivered to a recipient
-- (email or SMS) so it shows up in the share's audit trail.
ALTER TYPE "ShareAccessAction" ADD VALUE IF NOT EXISTS 'link_sent';
