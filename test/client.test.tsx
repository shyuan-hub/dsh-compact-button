/**
 * Unit tests for the client half's wiring: dictionary registration, slot
 * inject/register, and the `compact` closure handed to the slot registry.
 * All cordis services are faked; nothing runs against the real platform.
 */
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.tsx'
import { CompactButton } from '../src/client/CompactButton.tsx'
import { LOCALE_NS, en, zh } from '../src/client/locales.ts'
import type { CommandAdmission, Context } from '../src/context-types.ts'

/** A captured `ctx.effect` callback plus its cleanup hook. */
interface FakeEffect {
  label?: string
  run: () => void | (() => void)
}

/** Slot registration options captured from `ctx.slots.register`. */
interface RegisteredSlot {
  options: {
    id?: string
    name: string
    locale?: string
    registrant?: string
    inject?: (sessionId: string | undefined) => Record<string, unknown>
  }
  component: unknown
}

/** Build a fake client context with recorders for every service touched. */
function makeCtx(overrides?: {
  binding?: (sessionId: string) => { session: { command: (line: string) => Promise<CommandAdmission> } } | undefined
}) {
  const effects: FakeEffect[] = []
  const registered: RegisteredSlot[] = []
  const injectCalls: Array<{ slotName: string; callback: (owner?: unknown) => unknown }> = []
  const localeCalls: Array<{ ns: string; lang: 'zh' | 'en'; dictionary: Record<string, string> }> = []
  const offFns = new Map<string, () => void>()

  const ctx = {
    effect(run: () => void | (() => void), label?: string): void {
      effects.push({ label, run })
    },
    locale: {
      register(ns: string, lang: 'zh' | 'en', dictionary: Record<string, string>): () => void {
        localeCalls.push({ ns, lang, dictionary })
        const off = vi.fn()
        offFns.set(`${ns}:${lang}`, off)
        return off
      },
    },
    slots: {
      inject(slotName: string, callback: (owner?: unknown) => unknown): () => void {
        injectCalls.push({ slotName, callback })
        return vi.fn()
      },
      register(options: RegisteredSlot['options'], component: unknown): () => void {
        registered.push({ options, component })
        return vi.fn()
      },
    },
    sessions: {
      binding: overrides?.binding ?? ((): undefined => undefined),
      list: { getSnapshot: () => ({ current: undefined, byId: {} }) },
    },
  }

  return { ctx, effects, registered, injectCalls, localeCalls, offFns }
}

/** Run every captured effect and return their cleanup hooks. */
function activate(effects: FakeEffect[]): Array<() => void> {
  return effects.map((e) => e.run()).filter((c): c is () => void => typeof c === 'function')
}

/** Extract the `compact` closure the slot hands to one session id. */
function getCompact(registered: RegisteredSlot[], sessionId: string | undefined): () => Promise<boolean> {
  const slot = registered[0]
  if (!slot) throw new Error('no slot registered')
  const props = slot.options.inject?.(sessionId)
  const compact = props?.compact
  if (typeof compact !== 'function') throw new Error('inject did not provide a compact prop')
  return compact as () => Promise<boolean>
}

describe('client inject declaration', () => {
  it('declares the three services it reads', () => {
    expect(inject).toEqual(['slots', 'sessions', 'locale'])
  })
})

describe('client apply', () => {
  it('registers two effects: dictionaries and the context actions slot', () => {
    const { ctx, effects } = makeCtx()
    apply(ctx as unknown as Context)
    expect(effects.map((e) => e.label)).toEqual([
      'dsh-compact-button: dictionaries',
      'dsh-compact-button: context actions slot',
    ])
  })

  it('registers the zh and en dictionaries under the plugin namespace', () => {
    const { ctx, effects, localeCalls } = makeCtx()
    apply(ctx as unknown as Context)
    activate(effects)
    expect(localeCalls).toEqual([
      { ns: LOCALE_NS, lang: 'zh', dictionary: zh },
      { ns: LOCALE_NS, lang: 'en', dictionary: en },
    ])
  })

  it('disposes both dictionaries on cleanup', () => {
    const { ctx, effects, offFns } = makeCtx()
    apply(ctx as unknown as Context)
    const cleanups = activate(effects)
    cleanups.forEach((c) => c())
    expect(offFns.get(`${LOCALE_NS}:zh`)).toHaveBeenCalledOnce()
    expect(offFns.get(`${LOCALE_NS}:en`)).toHaveBeenCalledOnce()
  })

  it('waits for the slot declaration, then registers the button component', () => {
    const { ctx, effects, injectCalls, registered } = makeCtx()
    apply(ctx as unknown as Context)
    activate(effects)

    expect(injectCalls).toHaveLength(1)
    expect(injectCalls[0]?.slotName).toBe('conversation.context.actions')
    // Registration happens only when the platform has declared the slot.
    expect(registered).toHaveLength(0)
    injectCalls[0]?.callback(undefined)
    expect(registered).toHaveLength(1)
    expect(registered[0]?.component).toBe(CompactButton)
  })

  it('registers a unique list-slot instance with the plugin metadata', () => {
    const { ctx, effects, injectCalls, registered } = makeCtx()
    apply(ctx as unknown as Context)
    activate(effects)
    injectCalls[0]?.callback(undefined)

    const options = registered[0]?.options
    expect(options?.id).toBe('dsh-compact-button:context-actions')
    expect(options?.name).toBe('conversation.context.actions')
    expect(options?.locale).toBe(LOCALE_NS)
    expect(options?.registrant).toBe('dsh-compact-button')
    expect(typeof options?.inject).toBe('function')
  })
})

describe('compact closure', () => {
  it('resolves false immediately when the seat has no session', async () => {
    const { ctx, effects, injectCalls, registered } = makeCtx()
    apply(ctx as unknown as Context)
    activate(effects)
    injectCalls[0]?.callback(undefined)

    await expect(getCompact(registered, undefined)()).resolves.toBe(false)
  })

  it('resolves false when the session id has no binding', async () => {
    const { ctx, effects, injectCalls, registered } = makeCtx({ binding: () => undefined })
    apply(ctx as unknown as Context)
    activate(effects)
    injectCalls[0]?.callback(undefined)

    await expect(getCompact(registered, 'sess-1')()).resolves.toBe(false)
  })

  it('submits /compact and reports a matched admission', async () => {
    const command = vi.fn().mockResolvedValue({ ok: true, value: { matched: true } })
    const { ctx, effects, injectCalls, registered } = makeCtx({
      binding: () => ({ session: { command } }),
    })
    apply(ctx as unknown as Context)
    activate(effects)
    injectCalls[0]?.callback(undefined)

    await expect(getCompact(registered, 'sess-1')()).resolves.toBe(true)
    expect(command).toHaveBeenCalledExactlyOnceWith('/compact')
  })

  it('reports false when the command was not matched', async () => {
    const command = vi.fn().mockResolvedValue({ ok: true, value: { matched: false } })
    const { ctx, effects, injectCalls, registered } = makeCtx({
      binding: () => ({ session: { command } }),
    })
    apply(ctx as unknown as Context)
    activate(effects)
    injectCalls[0]?.callback(undefined)

    await expect(getCompact(registered, 'sess-1')()).resolves.toBe(false)
  })

  it('reports false when the admission itself failed', async () => {
    const command = vi.fn().mockResolvedValue({ ok: false })
    const { ctx, effects, injectCalls, registered } = makeCtx({
      binding: () => ({ session: { command } }),
    })
    apply(ctx as unknown as Context)
    activate(effects)
    injectCalls[0]?.callback(undefined)

    await expect(getCompact(registered, 'sess-1')()).resolves.toBe(false)
  })

  it('reports false when the admission resolved without a value', async () => {
    const command = vi.fn().mockResolvedValue({ ok: true })
    const { ctx, effects, injectCalls, registered } = makeCtx({
      binding: () => ({ session: { command } }),
    })
    apply(ctx as unknown as Context)
    activate(effects)
    injectCalls[0]?.callback(undefined)

    await expect(getCompact(registered, 'sess-1')()).resolves.toBe(false)
  })
})
