export type AvatarArt = 'male' | 'female' | 'neutral'

// Maps the API Gender enum (Male | Female | Other | Prefer_not_to_say), any
// casing, or a display label to the artwork. Unknown/empty -> null so callers
// fall back to initials instead of guessing.
export function avatarArtFor(gender?: string | null): AvatarArt | null {
  if (!gender) return null
  const g = gender.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (g === 'male' || g === 'm') return 'male'
  if (g === 'female' || g === 'f') return 'female'
  if (g === 'other' || g === 'prefer_not_to_say' || g === 'non_binary') return 'neutral'
  return null
}

export function getInitials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join('').toUpperCase()
  return (Array.from(parts[0])[0] + Array.from(parts[parts.length - 1])[0]).toUpperCase()
}

export const AVATAR_COLORS = {
  male: { bg: '#E3F0FF', shirt: '#2F6FDE', hair: '#2B2B33' },
  female: { bg: '#FDE8EF', shirt: '#D6457A', hair: '#2B2B33' },
  neutral: { bg: '#E8F3EC', shirt: '#137333', hair: '#5B5B66' },
} as const

export const AVATAR_SKIN = '#D9A27E'
export const AVATAR_PATHS = {
  shoulders: 'M10 96 C10 74 28 66 48 66 C68 66 86 74 86 96 Z',
  femaleHairBehind:
    'M29 44 C27 24 38 18 48 18 C58 18 69 24 67 44 C67 56 70 64 72 72 C64 70 62 56 62 46 L34 46 C34 56 32 70 24 72 C26 64 29 56 29 44 Z',
  hairFront: {
    male: 'M31 38 C31 24 40 19 48 19 C56 19 65 24 65 38 C61 31 54 29 48 29 C42 29 35 31 31 38 Z',
    female: 'M32 38 C35 28 43 25 48 25 C55 25 63 29 64 38 C57 33 41 31 32 38 Z',
    neutral: 'M32 36 C34 27 41 24 48 24 C55 24 62 27 64 36 C58 32 40 32 32 36 Z',
  },
} as const
