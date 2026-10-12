import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EMPTY_ART } from './emptyArt'

const pub = (p: string) => join(__dirname, '..', 'public', p)
const LIMIT = 100 * 1024

describe('empty-state artwork registry', () => {
  it('points every key at a file that exists and is under 100 KB', () => {
    for (const [key, art] of Object.entries(EMPTY_ART)) {
      expect(existsSync(pub(art.src)), `${key}: ${art.src}`).toBe(true)
      expect(statSync(pub(art.src)).size, key).toBeLessThanOrEqual(LIMIT)
    }
  })

  it('has a still frame for every animated WebP (used for reduced motion)', () => {
    for (const [key, art] of Object.entries(EMPTY_ART)) {
      if (art.kind === 'webp') expect(existsSync(pub(art.still)), `${key} still`).toBe(true)
    }
  })
})
