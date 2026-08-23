/**
 * Unit tests for the host half: it is a deliberate no-op (the feature is a
 * pure client slot entry; compaction runs through the Host's command seam).
 */
import { describe, expect, it } from 'vitest'
import { apply } from '../src/index.ts'

describe('host apply', () => {
  it('is a no-op that returns undefined', () => {
    expect(apply()).toBeUndefined()
  })
})
