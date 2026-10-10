/** Display helpers for support ticket status (stored as a free-form string, default "open"). */
export function ticketStatusLabel(status: string): string {
  const s = (status || 'open').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ticketStatusPill(status: string): 'amber' | 'green' | 'pending' {
  const s = (status || 'open').toLowerCase();
  if (s === 'resolved' || s === 'closed') return 'green';
  if (s === 'in_progress' || s === 'pending') return 'pending';
  return 'amber';
}
