/**
 * Registry of empty-state artwork. Screens refer to an animation by key, so
 * swapping a file or remapping a screen is a one-line change here.
 *
 * - `webp`: transparent animated WebP (converted from LottieFiles GIFs, each < 100 KB).
 * - `lottie`: Lottie JSON played by lottie-react-native.
 * `monochrome` art is black line work and is tinted white in dark mode.
 */
export type EmptyAnimationKey =
  | 'ambulance'
  | 'expert'
  | 'invoice'
  | 'lab'
  | 'notification'
  | 'payment'
  | 'provider'
  | 'share'
  | 'summary'
  | 'support'
  | 'travel'
  | 'vital'
  | 'calendar'
  | 'records'
  | 'uploadFiles';

export type EmptyAnimationSource =
  | { kind: 'webp'; source: number; monochrome: boolean }
  | { kind: 'lottie'; source: object };

/* eslint-disable @typescript-eslint/no-require-imports */
export const EMPTY_ANIMATIONS: Record<EmptyAnimationKey, EmptyAnimationSource> = {
  ambulance: { kind: 'webp', source: require('@/assets/empty-states/ambulance.webp'), monochrome: true },
  expert: { kind: 'webp', source: require('@/assets/empty-states/expert.webp'), monochrome: true },
  invoice: { kind: 'webp', source: require('@/assets/empty-states/invoice.webp'), monochrome: true },
  lab: { kind: 'webp', source: require('@/assets/empty-states/lab.webp'), monochrome: false },
  notification: { kind: 'webp', source: require('@/assets/empty-states/notification.webp'), monochrome: true },
  payment: { kind: 'webp', source: require('@/assets/empty-states/payment.webp'), monochrome: true },
  provider: { kind: 'webp', source: require('@/assets/empty-states/provider.webp'), monochrome: false },
  share: { kind: 'webp', source: require('@/assets/empty-states/share.webp'), monochrome: true },
  summary: { kind: 'webp', source: require('@/assets/empty-states/summary.webp'), monochrome: true },
  support: { kind: 'webp', source: require('@/assets/empty-states/support.webp'), monochrome: true },
  travel: { kind: 'webp', source: require('@/assets/empty-states/travel.webp'), monochrome: true },
  vital: { kind: 'webp', source: require('@/assets/empty-states/vital.webp'), monochrome: true },
  calendar: { kind: 'lottie', source: require('@/assets/empty-states/calendar.json') },
  records: { kind: 'lottie', source: require('@/assets/empty-states/records.json') },
  uploadFiles: { kind: 'lottie', source: require('@/assets/empty-states/upload-files.json') },
};
/* eslint-enable @typescript-eslint/no-require-imports */
