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
})

describe('t (browser language fallback)', () => {
  it('returns Chinese copy for zh languages', () => {
    vi.stubGlobal('navigator', { language: 'zh-CN' })
    expect(t('label')).toBe(zh.label)
    expect(t('tooltip')).toBe(zh.tooltip)
  })

  it('returns English copy for non-zh languages', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    expect(t('label')).toBe(en.label)
    expect(t('tooltip')).toBe(en.tooltip)
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
