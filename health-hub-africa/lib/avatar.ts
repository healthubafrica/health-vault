/** Fired after the profile photo changes so other mounted views (Topbar) refetch. */
export const PROFILE_UPDATED_EVENT = 'hha:profile-updated'

export type AvatarKind = 'male' | 'female' | 'neutral'

/** Maps the API Gender enum (or a portal label) to artwork. Unknown -> null (use initials). */
export function avatarKindFor(gender: string | null | undefined): AvatarKind | null {
  const g = (gender ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (g === 'male') return 'male'
  if (g === 'female') return 'female'
  if (g === 'other' || g === 'prefer_not_to_say' || g === 'non_binary') return 'neutral'
  return null
}

/** Up to two initials; safe for empty and one-word names. */
export function getInitials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const first = Array.from(parts[0])[0] ?? ''
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : ''
  return (first + last).toUpperCase()
}
