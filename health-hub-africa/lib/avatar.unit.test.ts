import { describe, expect, it } from 'vitest'
import { avatarKindFor, getInitials } from './avatar'

describe('avatarKindFor', () => {
  it('maps API enum values and lowercase variants', () => {
    expect(avatarKindFor('Male')).toBe('male')
    expect(avatarKindFor('female')).toBe('female')
    expect(avatarKindFor('Other')).toBe('neutral')
    expect(avatarKindFor('Prefer_not_to_say')).toBe('neutral')
    expect(avatarKindFor('Prefer not to say')).toBe('neutral')
  })
  it('returns null when unknown so initials are used', () => {
    expect(avatarKindFor(null)).toBeNull()
    expect(avatarKindFor(undefined)).toBeNull()
    expect(avatarKindFor('')).toBeNull()
    expect(avatarKindFor('banana')).toBeNull()
  })
})

describe('getInitials', () => {
  it('handles normal, one-word, empty and spaced names', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL')
    expect(getInitials('  ada  b  lovelace ')).toBe('AL')
    expect(getInitials('Ada')).toBe('A')
    expect(getInitials('')).toBe('')
    expect(getInitials(null)).toBe('')
  })
})
