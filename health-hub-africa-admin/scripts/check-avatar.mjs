// Dependency-free sanity check for lib/avatar.ts (admin has no test runner).
// Run: node --experimental-strip-types scripts/check-avatar.mjs
import assert from 'node:assert/strict'
import { avatarArtFor, getInitials } from '../lib/avatar.ts'

for (const [g, want] of [
  ['Male', 'male'], ['male', 'male'], ['Female', 'female'], ['FEMALE', 'female'],
  ['Other', 'neutral'], ['Prefer_not_to_say', 'neutral'], ['Prefer not to say', 'neutral'],
  [null, null], [undefined, null], ['', null], ['robot', null],
]) assert.equal(avatarArtFor(g), want, String(g))

assert.equal(getInitials(''), '?')
assert.equal(getInitials(null), '?')
assert.equal(getInitials('  '), '?')
assert.equal(getInitials('ada'), 'AD')
assert.equal(getInitials('Ada Okafor'), 'AO')
assert.equal(getInitials('Ada B Okafor'), 'AO')
console.log('avatar helpers OK')
