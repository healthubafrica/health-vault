const RATE_LIMIT_MSG =
  "You're going a bit too fast. Kindly wait a moment and try again."
const NETWORK_MSG =
  "We can't reach the server right now. Kindly check your internet and try again."
const GENERIC_MSG = 'Something went wrong on our side. Please try again shortly.'
const SESSION_EXPIRED_MSG =
  'Your session has timed out. Kindly sign in again to continue.'

interface Rule {
  test: (status: number, msg: string) => boolean
  message: string
}

const RULES: Rule[] = [
  {
    test: (s, m) => s === 409 && /email.*registered|already.*exist/i.test(m),
    message: 'This email is already registered.',
  },
  { test: (s) => s === 409, message: 'That already exists.' },
  {
    test: (s, m) => s === 401 && /invalid credentials/i.test(m),
    message: "Your email or password isn't right. Please check and try again.",
  },
  {
    test: (_, m) => /not verified/i.test(m),
    message: "This account's email isn't verified yet.",
  },
  {
    test: (_, m) => /invalid or expired otp/i.test(m),
    message: "That code didn't match or has expired.",
  },
  {
    test: (s) => s === 403,
    message: "You don't have permission to perform this action.",
  },
  { test: (s) => s === 404, message: "We couldn't find what you were looking for." },
  { test: (s) => s === 429, message: RATE_LIMIT_MSG },
  { test: (s) => s >= 500, message: GENERIC_MSG },
]

function pickFirstString(msg: unknown): string {
  if (Array.isArray(msg)) {
    const first = msg.find((m) => typeof m === 'string')
    return typeof first === 'string' ? first : ''
  }
  return typeof msg === 'string' ? msg : ''
}

export function friendlyApiError(status: number, rawMessage: unknown): string {
  const firstRaw = pickFirstString(rawMessage).trim()
  for (const rule of RULES) {
    if (rule.test(status, firstRaw)) return rule.message
  }
  if (status === 400 && firstRaw) return firstRaw
  return firstRaw || GENERIC_MSG
}

export function friendlyNetworkError(): string {
  return NETWORK_MSG
}

export function friendlySessionExpired(): string {
  return SESSION_EXPIRED_MSG
}
