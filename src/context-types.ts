/**
 * Structural types for the cordis services this plugin consumes. A third-party
 * plugin resolves outside the DSH monorepo's single cordis instance, so the
 * upstream `declare module 'cordis'` augmentations do not reach this Context —
 * the members below mirror the actual runtime shapes this plugin touches:
 * - slots: the client SlotRegistry (declare-once / inject-wait / register)
 * - sessions: the client runtime session feed (binding → scoped session)
 * - workspaces: the client runtime workspace feed (startSession action)
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

/** One row of the client session-list mirror (the fields this plugin might
 *  read: the running flag for the meter, plus blank / cwd / agentPreset). */
export interface ClientSessionSummary {
  running?: boolean
  blank?: boolean
  cwd?: string
  agentPreset?: string
}

/** The client sessions service face this plugin touches. */
export interface ClientSessions {
  binding(sessionId: string): { session: CompactScopedSession } | undefined
  /** Select a listed session as current (navigate to it). Throws when the
   *  session is not yet in the client mirror — a freshly created session
   *  lands there a beat after the host broadcast, so callers retry. */
  open(sessionId: string): void
  list: {
    getSnapshot(): { current?: string; byId: Record<string, ClientSessionSummary> }
  }
}

/** The client `uiWorkspace` navigation service face this plugin touches
 *  (`@deepseek-ai/dsh-client-ui-workspace`). `startSession` resolves the
 *  target Workspace (explicit id, then the current Session's Workspace,
 *  then the recent Workspace projection), connects or creates a fresh
 *  Session there, and navigates to it. */
export interface ClientUiWorkspace {
  startSession(workspaceId?: string): void
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
    /** The client slot registry (`@deepseek-ai/dsh-client-ui-renderer`). */
    slots: ClientSlots
    /** The client session feed (`@deepseek-ai/dsh-api-session-controller`). */
    sessions: ClientSessions
    /** The client Workspace navigation service (`@deepseek-ai/dsh-client-ui-workspace`). */
    uiWorkspace: ClientUiWorkspace
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
