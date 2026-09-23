/**
 * Unit tests for patch-context-meter.cjs — the platform patch that
 * declares and renders the `conversation.context.actions` slot inside the
 * ui-conversation ContextMeter bundle (the official bundle does not ship
 * it; without the patch the plugin's buttons never render).
 *
 * The anchors are format-agnostic regexes, so the suite covers both halves
 * of the contract: the anchors must match their own `example` exactly once,
 * and they must survive the format drift a rebuild introduces (rehashed css
 * module, re-indented output, `var`→`const`, unquoted keys, renamed jsx
 * helper, collapsed whitespace).
 */
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

interface Replacement {
  label: string
  re: RegExp
  replacement: string
  example: string
}
interface PatchApi {
  REPLACEMENTS: Replacement[]
  PATCHED_MARKER: string
  TESTED_PLATFORMS: string[]
  patchSource(src: string):
    | { status: 'already' }
    | { status: 'drift'; label: string; count: number }
    | { status: 'patched'; output: string }
  countMatches(src: string, re: RegExp): number
  detectPlatformVersion(file: string): string | undefined
  isTestedPlatform(version: string | undefined): boolean
  describeResult(r: { status: string; file: string; version?: string; tested?: boolean; label?: string; count?: number; error?: unknown }): string
  patchFile(file: string): { status: string; file: string; version?: string; tested?: boolean; label?: string; count?: number }
  findTargetFiles(startDirs?: string[]): string[]
}

const patch = require('../patch-context-meter.cjs') as PatchApi

/** Synthetic pristine bundle: every anchor's example, joined. */
function pristineSource(): string {
  return patch.REPLACEMENTS.map(r => r.example).join('\n/* separator */\n')
}

/** Format transforms a rebuilt platform bundle may show up with. */
const DRIFT_TRANSFORMS: Record<string, (src: string) => string> = {
  'rehashed css module': src => src.split('JObwrW').join('Xk9pQr'),
  'tabs to spaces': src => src.replace(/\n\t+/g, m => `\n${m.slice(1).replace(/\t/g, '  ')}`),
  'var to const': src => src.replace('var ContextMeter_module_css_default', 'const ContextMeter_module_css_default'),
  'unquoted css key': src => src.replace('"bar": "JObwrW_bar"', 'bar: "JObwrW_bar"'),
  'renamed jsx helper': src => src.replace('(0, react_jsx_runtime.jsx)(ContextMeter', '(0, jsx)(ContextMeter'),
  'collapsed whitespace': src => src.replace('function ContextMeter({ useProjection, t }) {', 'function ContextMeter({useProjection,t}){'),
}

describe('REPLACEMENTS', () => {
  it('every anchor matches its own example exactly once', () => {
    for (const r of patch.REPLACEMENTS) {
      expect(patch.countMatches(r.example, r.re), r.label).toBe(1)
    }
  })

  it('anchors are regexes (format-agnostic), not literal quotes', () => {
    for (const r of patch.REPLACEMENTS) {
      expect(r.re).toBeInstanceOf(RegExp)
      expect(typeof r.replacement).toBe('string')
    }
  })
})

describe('patchSource', () => {
  it('patches a pristine bundle and declares + renders the slot', () => {
    const result = patch.patchSource(pristineSource())
    expect(result.status).toBe('patched')
    if (result.status !== 'patched') return
    // The render call (replacement 3) and the composer.bar declaration (5).
    expect(result.output).toContain('renderSlot("conversation.context.actions", {})')
    expect(result.output).toContain('"conversation.context.actions": {\n\t\t\t\t\t\tkind: "list"')
    // Every example is gone — nothing left for a second pass to chew on.
    for (const r of patch.REPLACEMENTS) expect(result.output).not.toContain(r.example)
  })

  it('follows the css module hash instead of hardcoding it', () => {
    const result = patch.patchSource(DRIFT_TRANSFORMS['rehashed css module']!(pristineSource()))
    expect(result.status).toBe('patched')
    if (result.status !== 'patched') return
    expect(result.output).toContain('"actions": "Xk9pQr_actions"')
    expect(result.output).not.toContain('JObwrW')
  })

  it.each(Object.entries(DRIFT_TRANSFORMS))('survives format drift: %s', (_name, transform) => {
    const result = patch.patchSource(transform(pristineSource()))
    expect(result.status).toBe('patched')
  })

  it('keeps injected array elements comma-separated (syntax safety)', () => {
    const footer = patch.REPLACEMENTS.find(r => r.label === 'panel actions footer')!
    expect(footer).toBeDefined()
    // The pristine last array element ends without a comma; the patch must
    // add one right after the captured element ($1) before injecting the
    // slot footer, or the bundle stops parsing ("loaded without
    // registering" on the client side).
    expect(footer!.example).toMatch(/\}\)\n/)
    expect(footer!.replacement).toMatch(/^\$1,\n/)
    // And the injected footer itself must not dangle a trailing comma.
    expect(footer!.replacement).toMatch(/\}\)\n\$2$/)
  })

  it('is idempotent: a patched source is detected by its marker', () => {
    const first = patch.patchSource(pristineSource())
    expect(first.status).toBe('patched')
    if (first.status !== 'patched') return
    expect(patch.patchSource(first.output)).toEqual({ status: 'already' })
  })

  it('aborts on drift without applying anything', () => {
    const drifted = pristineSource().replace(
      'function ContextMeter({ useProjection, t }) {',
      'function ContextMeter({ useProjection, t, extra }) {',
    )
    const result = patch.patchSource(drifted)
    expect(result.status).toBe('drift')
    if (result.status !== 'drift') return
    expect(result.label).toBe('ContextMeter signature')
    expect(result.count).toBe(0)
  })

  it('aborts when an anchor matches more than once', () => {
    const doubled = `${pristineSource()}\n${patch.REPLACEMENTS[1]!.example}`
    const result = patch.patchSource(doubled)
    expect(result).toMatchObject({ status: 'drift', label: 'ContextMeter signature', count: 2 })
  })

  it('does not disturb lastIndex across repeated calls', () => {
    const src = pristineSource()
    expect(patch.patchSource(src).status).toBe('patched')
    expect(patch.patchSource(src).status).toBe('patched')
  })
})

describe('platform version reporting', () => {
  it('reads the owning package version and flags whether it was tested', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-cb-ver-'))
    try {
      const pkgDir = join(root, '@deepseek-ai', 'dsh-client-ui-conversation')
      const libDir = join(pkgDir, 'lib')
      mkdirSync(libDir, { recursive: true })
      writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh-client-ui-conversation', version: '9.9.9-rc.1' }))
      const file = join(libDir, 'client.js')
      writeFileSync(file, pristineSource())

      expect(patch.detectPlatformVersion(file)).toBe('9.9.9-rc.1')
      expect(patch.isTestedPlatform('9.9.9-rc.1')).toBe(false)
      expect(patch.isTestedPlatform(patch.TESTED_PLATFORMS[0])).toBe(true)
      expect(patch.isTestedPlatform(undefined)).toBe(false)

      const result = patch.patchFile(file)
      expect(result.status).toBe('patched')
      expect(result.version).toBe('9.9.9-rc.1')
      expect(result.tested).toBe(false)
      // An untested release is called out in the log line.
      expect(patch.describeResult(result)).toContain('@9.9.9-rc.1')
      expect(patch.describeResult(result)).toContain('not in the tested set')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('treats an unreadable manifest as unknown, not fatal', () => {
    expect(patch.detectPlatformVersion(join(tmpdir(), 'definitely', 'missing', 'client.js'))).toBeUndefined()
    expect(patch.describeResult({ status: 'error', file: 'x', error: new Error('boom') })).toContain('boom')
  })
})

describe('patchFile', () => {
  function withTempFile(body: (file: string) => void): void {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-cb-patch-'))
    const file = join(dir, 'client.js')
    try {
      writeFileSync(file, pristineSource())
      body(file)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it('writes the patched content, then reports already on re-run', () => {
    withTempFile((file) => {
      expect(patch.patchFile(file).status).toBe('patched')
      expect(readFileSync(file, 'utf8')).toContain(patch.PATCHED_MARKER)
      expect(patch.patchFile(file).status).toBe('already')
    })
  })

  it('leaves a drifted file untouched', () => {
    withTempFile((file) => {
      const drifted = readFileSync(file, 'utf8').replace(
        'function ContextMeter({ useProjection, t }) {',
        'function ContextMeter({ useProjection, t, extra }) {',
      )
      writeFileSync(file, drifted)
      const result = patch.patchFile(file)
      expect(result.status).toBe('drift')
      expect(readFileSync(file, 'utf8')).toBe(drifted)
    })
  })
})

describe('findTargetFiles', () => {
  it('climbs from a plugin dir to a shared node_modules above it', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-cb-find-'))
    const target = join(root, 'node_modules', '@deepseek-ai', 'dsh-client-ui-conversation', 'lib', 'client.js')
    const pluginDir = join(root, 'profiles', 'web', 'node_modules', 'dsh-compact-button')
    try {
      mkdirSync(join(target, '..'), { recursive: true })
      mkdirSync(pluginDir, { recursive: true })
      writeFileSync(target, '')
      const found = patch.findTargetFiles([pluginDir])
      // realpath accounts for darwin's /tmp -> /private/tmp symlink.
      expect(found).toContain(realpathSync(target))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('returns an empty list when nothing is installed anywhere reachable', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-cb-empty-'))
    try {
      // The homedir scan may legitimately find a real install on the dev
      // machine; assert only that climbing an empty dir adds nothing new.
      const baseline = patch.findTargetFiles([])
      const fromEmpty = patch.findTargetFiles([join(root, 'nowhere')])
      expect(new Set(fromEmpty)).toEqual(new Set(baseline))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
