/**
 * Unit tests for the locale dictionaries and the browser-language fallback
 * translator (`t`). The framework `t` prop path is exercised in the component
 * tests; here the module-level fallback is covered.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LOCALE_NS, en, t, zh } from '../src/client/locales.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('dictionaries', () => {
  it('registers under the compactButton namespace', () => {
    expect(LOCALE_NS).toBe('compactButton')
  })

  it('zh and en cover the same keys', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
  })

  it('every entry is non-empty in both languages', () => {
    for (const key of Object.keys(zh)) {
      expect(zh[key as keyof typeof zh]).toBeTruthy()
      expect(en[key as keyof typeof en]).toBeTruthy()
    }
  })

  it('contains exactly the keys the components read — no dead copy', () => {
    // CompactButton reads the five PHASE_KEY entries (label / pending /
    // submitted / rejected / failed) for both its Tooltip bubble and its
    // aria-label; NewSessionButton reads `newSession`. A key outside this
    // set is dead copy — delete it instead of leaving it registered under
    // the namespace. (The icon-only redesign left `tooltip` and
    // `newSessionTooltip` unread; this pins the set so that cannot recur.)
    expect(Object.keys(zh).sort()).toEqual([
      'failed',
      'label',
      'newSession',
      'pending',
      'rejected',
      'submitted',
    ])
  })
})

describe('t (browser language fallback)', () => {
  it('returns Chinese copy for zh languages', () => {
    vi.stubGlobal('navigator', { language: 'zh-CN' })
    expect(t('label')).toBe(zh.label)
    expect(t('newSession')).toBe(zh.newSession)
  })

  it('returns English copy for non-zh languages', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    expect(t('label')).toBe(en.label)
    expect(t('newSession')).toBe(en.newSession)
  })

  it('is case-insensitive on the language tag', () => {
    vi.stubGlobal('navigator', { language: 'ZH-Hans-CN' })
    expect(t('pending')).toBe(zh.pending)
  })

  it('falls back to English when no navigator is present', () => {
    vi.stubGlobal('navigator', undefined)
    expect(t('label')).toBe(en.label)
  })
})
