/**
 * Unit tests for patch-context-meter.cjs — the platform patch that
 * declares and renders the `conversation.context.actions` slot inside the
 * ui-conversation ContextMeter bundle (the official 0.1.2-alpha.2 bundle
 * does not ship it; without the patch the plugin's buttons never render).
 */
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

interface Replacement { label: string; old: string; replacement: string }
interface PatchApi {
  REPLACEMENTS: Replacement[]
  PATCHED_MARKER: string
  patchSource(src: string):
    | { status: 'already' }
    | { status: 'drift'; label: string; count: number }
    | { status: 'patched'; output: string }
  patchFile(file: string): { status: string; file: string; label?: string; count?: number }
  findTargetFiles(startDirs?: string[]): string[]
}

const patch = require('../patch-context-meter.cjs') as PatchApi

/** Synthetic pristine bundle: every replacement anchor once, joined. */
function pristineSource(): string {
  return patch.REPLACEMENTS.map(r => r.old).join('\n/* separator */\n')
}

describe('patchSource', () => {
  it('patches a pristine bundle and declares + renders the slot', () => {
    const result = patch.patchSource(pristineSource())
    expect(result.status).toBe('patched')
    if (result.status !== 'patched') return
    // The render call (replacement 3) and the composer.bar declaration (5).
    expect(result.output).toContain('renderSlot("conversation.context.actions", {})')
    expect(result.output).toContain('"conversation.context.actions": {\n\t\t\t\t\t\tkind: "list"')
    // Every anchor is gone — nothing left for a second pass to chew on.
    for (const r of patch.REPLACEMENTS) expect(result.output).not.toContain(r.old)
  })

  it('keeps injected array elements comma-separated (syntax safety)', () => {
    const footer = patch.REPLACEMENTS.find(r => r.label === 'panel actions footer')!
    expect(footer).toBeDefined()
    // The pristine last array element ends without a comma; the patch must
    // add one before injecting the slot footer, or the bundle stops parsing
    // ("loaded without registering" on the client side).
    expect(footer!.old).toMatch(/\}\)\n/)
    expect(footer!.replacement).toMatch(/\}\),\n/)
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
    const doubled = pristineSource() + '\n' + patch.REPLACEMENTS[1]!.old
    const result = patch.patchSource(doubled)
    expect(result).toMatchObject({ status: 'drift', label: 'ContextMeter signature', count: 2 })
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
