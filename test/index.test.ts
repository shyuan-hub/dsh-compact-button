/**
 * Unit tests for the host half. It is inert: the feature is a client slot
 * entry in the platform-declared `conversation.composer.dock`, so the Node
 * side has no work left. What these tests pin down is the mount contract —
 * `apply` exists, is callable, does nothing, and never throws, since
 * `cordis.patch.yml` mounts this module at every profile boot and a throw
 * here would break startup.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.ts'

describe('host apply', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is a zero-arg function', () => {
    expect(typeof apply).toBe('function')
    expect(apply.length).toBe(0)
  })

  it('returns undefined and never throws', () => {
    expect(apply()).toBeUndefined()
  })

  it('logs nothing — it no longer patches the platform bundle', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    apply()
    expect(info).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  it('does not reach for the removed patch module', async () => {
    // The patch machinery is gone. Vite resolves imports statically, so a
    // dynamic import of the deleted file would fail at transform time rather
    // than prove anything — assert on the source instead: the host bundle
    // must not import or reference the patch module.
    // jsdom gives `import.meta.url` an http scheme, so resolve from the
    // project root that vitest was launched in.
    const source = await readFile(resolve(process.cwd(), 'src/index.ts'), 'utf8')
    expect(source).not.toContain('patch-context-meter')
    expect(source).not.toContain('patchInstalledTargets')
    expect(source).not.toContain('DSH_COMPACT_BUTTON_LEGACY_PATCH')
  })
})
