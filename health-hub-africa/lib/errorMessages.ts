// Translates raw backend / network errors into warm, simple user messages.
// Centralised here so every screen surfaces the same tone without each one
// having to map status codes or backend strings by hand.

const RATE_LIMIT_MSG =
  "You're going a bit too fast. Kindly wait a moment and try again."
const NETWORK_MSG =
  "We can't reach the server right now. Kindly check your internet and try again."
const GENERIC_MSG =
  'Something went wrong on our side. Please try again shortly.'
const SESSION_EXPIRED_MSG =
  "You've been signed out due to inactivity. Kindly sign in again — any unsaved changes on this page may be lost."

interface Rule {
  test: (status: number, msg: string) => boolean
  message: string
}

const RULES: Rule[] = [
  // ── Registration ────────────────────────────────────────────────────────
  {
    test: (s, m) => s === 409 && /email.*registered|already.*exist/i.test(m),
    message: 'This email is already registered. Kindly log in instead.',
  },
  {
    test: (s) => s === 409,
    message: 'That already exists. Kindly try a different one.',
  },

  // ── Appointments ────────────────────────────────────────────────────────
  // Both are 409s from appointments.service.ts — must sit above the generic
  // `s === 409` registration rule below, or that rule swallows them into a
  // "That already exists" message that means nothing in a booking context
  // and doesn't tell the patient an appointment may already be in place.
  {
    test: (s, m) => s === 409 && /already have an appointment/i.test(m),
    message: 'You already have an appointment at that time. Kindly check your appointments list before booking another.',
  },
  {
    test: (s, m) => s === 409 && /already booked for the selected time/i.test(m),
    message: 'That time slot was just booked by someone else. Kindly pick another time.',
  },

  // ── Login ───────────────────────────────────────────────────────────────
  {
    test: (s, m) => s === 401 && /invalid credentials/i.test(m),
    message:
      "Your email or password isn't right. Kindly check and try again.",
  },
  {
    test: (s, m) => s === 401 && /invalid or expired token/i.test(m),
    message: SESSION_EXPIRED_MSG,
  },
  {
    test: (_, m) => /not verified/i.test(m),
    message:
      "Your email isn't verified yet. Kindly request a new code to continue.",
  },

  // ── OTP ─────────────────────────────────────────────────────────────────
  {
    test: (_, m) => /invalid or expired otp/i.test(m),
    message:
      "That code didn't match or has expired. Kindly request a new one.",
  },

  // ── Password change / reset ─────────────────────────────────────────────
  {
    test: (_, m) => /current password is incorrect/i.test(m),
    message: "Your current password isn't right. Kindly try again.",
  },
  {
    test: (_, m) => /new password must differ/i.test(m),
    message:
      "Kindly choose a password that's different from your current one.",
  },
  {
    test: (_, m) => /invalid request/i.test(m),
    message:
      "We couldn't complete that request. Kindly check your details and try again.",
  },

  // ── User / session lookups ──────────────────────────────────────────────
  {
    test: (_, m) => /user not found/i.test(m),
    message: "We couldn't find an account matching those details.",
  },
  {
    test: (_, m) => /session not found/i.test(m),
    message: 'That session no longer exists.',
  },
  {
    test: (_, m) => /session is already revoked/i.test(m),
    message: 'That session is already signed out.',
  },

  // ── Authorisation ───────────────────────────────────────────────────────
  {
    test: (s) => s === 403,
    message: "You don't have permission to do that.",
  },
  {
    test: (s) => s === 404,
    message: "We couldn't find what you were looking for.",
  },

  // ── Rate limit ──────────────────────────────────────────────────────────
  { test: (s) => s === 429, message: RATE_LIMIT_MSG },

  // ── Server errors ───────────────────────────────────────────────────────
  { test: (s) => s >= 500, message: GENERIC_MSG },
]

function pickFirstString(msg: unknown): string {
  if (Array.isArray(msg)) {
    const first = msg.find((m) => typeof m === 'string')
    return typeof first === 'string' ? first : ''
  }
  return typeof msg === 'string' ? msg : ''
}

// Soften common class-validator messages (NestJS ValidationPipe returns these
// as an array on 400 responses). Falls back to a friendly prefix if we don't
// recognise the shape.
function softenValidation(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('should not exist') || lower.includes('property') && lower.includes('not exist'))
    return ''  // field no longer rejected after DTO update; silently drop if it ever appears
  if (lower.includes('email'))
    return 'Kindly enter a valid email address.'
  if (lower.includes('password') && (lower.includes('long') || lower.includes('characters') || lower.includes('match')))
    return 'Your password needs at least 12 characters with a mix of uppercase, lowercase, a number, and a symbol.'
  if (lower.includes('phone'))
    return 'Kindly enter your phone number with the country code (for example +2348012345678).'
  if (lower.includes('should not be empty') || lower.includes('must not be empty'))
    return 'Kindly fill in all the required fields.'
  if (lower.includes('must be a string') || lower.includes('must be a number'))
    return "Some details don't look right. Kindly check the form and try again."
  return msg
}

export function friendlyApiError(status: number, rawMessage: unknown): string {
  const firstRaw = pickFirstString(rawMessage).trim()

  // Check RULES against the first/representative message
  for (const rule of RULES) {
    if (rule.test(status, firstRaw)) return rule.message
  }

  // For 400 validation arrays: soften each message, deduplicate, join for display
  if (status === 400 && Array.isArray(rawMessage)) {
    const messages = rawMessage
      .filter((m): m is string => typeof m === 'string')
      .map(softenValidation)
      .filter((m) => m.length > 0)
      .filter((m, i, arr) => arr.indexOf(m) === i)
    if (messages.length > 0) return messages.join('\n')
  }

  if (status === 400 && firstRaw) return softenValidation(firstRaw) || GENERIC_MSG

  return firstRaw || GENERIC_MSG
}

export function friendlyNetworkError(): string {
  return NETWORK_MSG
}

export function friendlySessionExpired(): string {
  return SESSION_EXPIRED_MSG
}
