/**
 * Unit tests for the host half: its one duty is the context-meter platform
 * patch self-heal (see ../patch-context-meter.cjs) — discover installed
 * ui-conversation bundles, patch them idempotently, and never throw, so a
 * drifted or absent platform degrades to "button not rendered" instead of
 * breaking dsh boot.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.ts'

describe('host apply', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns undefined and never throws', () => {
    // Silence both outcomes: a patched/discovered target on the dev
    // machine, or the "nothing found" warning on a bare CI machine.
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(apply()).toBeUndefined()
  })
})
