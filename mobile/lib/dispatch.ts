const STATUS_LABELS: Record<string, string> = {
  requested: 'Request received',
  triaged: 'Triaged',
  unit_assigned: 'Unit assigned',
  en_route: 'Unit on the way',
  on_scene: 'Responder on scene',
  patient_stabilised: 'Patient stabilised',
  transported: 'Transported',
  closed: 'Closed',
};

export function dispatchStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function dispatchStatusPill(status: string): 'amber' | 'green' | 'pending' {
  if (status === 'closed' || status === 'transported' || status === 'patient_stabilised') return 'green';
  if (status === 'requested' || status === 'triaged') return 'amber';
  return 'pending';
}

/** Enum values like Chest_Pain read as "Chest pain". */
export function emergencyTypeLabel(type: string): string {
  const s = type.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
