/**
 * Structural types for the cordis services this plugin consumes. A third-party
 * plugin resolves outside the DSH monorepo's single cordis instance, so the
 * upstream `declare module 'cordis'` augmentations do not reach this Context —
 * the members below mirror the actual runtime shapes this plugin touches:
 * - slots: the client SlotRegistry (declare-once / inject-wait / register)
 * - sessions: the client runtime session feed (binding → scoped session)
 * - locale: the client locale registry (dictionary registration)
 * - effect: the DSH-vendored cordis lifecycle helper
 * Drift from upstream is contained to this file.
 */
import type { Context } from 'cordis'

/** The admission result of one slash-command line (the runtime
 *  IScopedSession.command face): `matched` reports whether the line named a
 *  known command; execution outcomes render as chat flow nodes, not here. */
export interface CommandAdmission {
  ok: boolean
  value?: { matched: boolean }
  error?: unknown
}

/** The scoped session face this plugin uses (command submission only). */
export interface CompactScopedSession {
  command(line: string): Promise<CommandAdmission>
}

/** The client sessions service face this plugin touches. */
export interface ClientSessions {
  binding(sessionId: string): { session: CompactScopedSession } | undefined
  list: {
    getSnapshot(): { current?: string; byId: Record<string, { running?: boolean }> }
  }
}

/** The client locale service face (dictionary registration + read). */
export interface ClientLocale {
  register(ns: string, lang: 'zh' | 'en', dictionary: Record<string, string>): () => void
  get?(): { lang?: string }
}

/** The client slot registry face: wait-for-declaration inject, register. */
export interface ClientSlots {
  inject(slotName: string, callback: (owner?: unknown) => unknown): () => void
  register(
    options: {
      /** Unique instance id — required for list-kind slots. */
      id?: string
      name: string
      locale?: string
      priority?: number
      registrant?: string
      inject?: (sessionId: string | undefined) => Record<string, unknown>
    },
    component: unknown,
  ): () => void
}

declare module 'cordis' {
  interface Context {
    /** The client slot registry (`@deepseek-ai/dsh-client-ui-slots`). */
    slots: ClientSlots
    /** The client session feed (`@deepseek-ai/dsh-client-runtime`). */
    sessions: ClientSessions
    /** The client locale service (`@deepseek-ai/dsh-client-locale`). */
    locale: ClientLocale
    /**
     * Register a lifecycle callback (DSH-vendored cordis): runs at plugin
     * activation; its returned cleanup runs at disposal.
     */
    effect(fn: () => void | (() => void), label?: string): void
  }
}

export type { Context }
