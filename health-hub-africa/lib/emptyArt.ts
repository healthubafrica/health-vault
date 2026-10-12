/**
 * Registry of empty-state artwork (same set as the mobile app). Screens refer
 * to a piece by key, so remapping a screen or swapping a file is a one-line change.
 *
 * - `webp`: transparent animated WebP; `-still` is the frame shown for
 *   "reduce motion". Browsers play these natively, no library needed.
 * - `lottie`: Lottie JSON, played with lottie-react.
 * `mono` art is black line work and is inverted in dark mode (see globals.css).
 */
export type EmptyArtKey =
  | 'ambulance' | 'expert' | 'invoice' | 'lab' | 'notification' | 'payment'
  | 'provider' | 'share' | 'summary' | 'support' | 'travel' | 'vital'
  | 'calendar' | 'records' | 'uploadFiles'
  | 'sleep' | 'measure' | 'security' | 'people'

export type EmptyArt =
  | { kind: 'webp'; src: string; still: string; mono: boolean }
  | { kind: 'lottie'; src: string }

const webp = (name: string, mono = true): EmptyArt => ({
  kind: 'webp',
  src: `/empty-states/${name}.webp`,
  still: `/empty-states/${name}-still.webp`,
  mono,
})

export const EMPTY_ART: Record<EmptyArtKey, EmptyArt> = {
  ambulance: webp('ambulance'),
  expert: webp('expert'),
  invoice: webp('invoice'),
  lab: webp('lab', false),
  notification: webp('notification'),
  payment: webp('payment'),
  provider: webp('provider', false),
  share: webp('share'),
  summary: webp('summary'),
  support: webp('support'),
  travel: webp('travel'),
  vital: webp('vital'),
  calendar: { kind: 'lottie', src: '/empty-states/calendar.json' },
  records: { kind: 'lottie', src: '/empty-states/records.json' },
  uploadFiles: { kind: 'lottie', src: '/empty-states/upload-files.json' },
  sleep: webp('sleep'),
  measure: webp('measure'),
  security: webp('security'),
  people: webp('people'),
}
