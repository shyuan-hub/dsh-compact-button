/**
 * The New Session button rendered next to the Compact button in the
 * conversation context meter panel (the same `conversation.context.actions`
 * slot). One click asks the client `workspaces` runtime to start a fresh
 * Session in the current Session's Workspace — the runtime resolves the
 * Workspace, connects (or creates) a blank Session there, and navigates to
 * it — so the new Session shares the previous one's Workspace and inherits
 * the same deployment-level agent preset and permission policy. The action is
 * synchronous from the caller's viewpoint (the connect/open RPCs run
 * fire-and-forget inside the runtime), so the button only guards against a
 * rapid double-click with a short lockout rather than a phase machine.
 */
import { useEffect, useRef, useState } from 'react'
import { t as tFallback, type CopyKey } from './locales.ts'
import css from './compact-button.module.css'

/** How long the button stays locked after a click to absorb a double-click
 *  (the runtime's connect/open RPCs have settled by then). */
const LOCKOUT_MS = 1500

/** The new-session glyph: a speech bubble with a plus. */
function NewSessionIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M11 2H5a3 3 0 0 0-3 3v5a3 3 0 0 0 3 3h1v2l2.4-2H11a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 4.5v3M6.5 6h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export interface NewSessionButtonProps {
  /** Start a fresh Session in the current Session's Workspace and navigate to
   *  it. Synchronous from the caller's viewpoint (the runtime fires the
   *  connect/open RPCs internally). */
  newSession: () => void
  /** The framework translation function for the plugin locale namespace
   *  (the slot registry passes it as `t` when the entry registers a
   *  `locale`; re-renders on locale switches). */
  t?: (key: string) => string
}

export function NewSessionButton({ newSession, t }: NewSessionButtonProps) {
  const [locked, setLocked] = useState(false)
  const lockTimer = useRef<number | null>(null)

  // Clear the lockout on unmount (HMR / panel close).
  useEffect(() => () => {
    if (lockTimer.current !== null) window.clearTimeout(lockTimer.current)
  }, [])

  const onClick = (): void => {
    if (locked) return
    setLocked(true)
    newSession()
    lockTimer.current = window.setTimeout(() => setLocked(false), LOCKOUT_MS)
  }

  // The slot framework's `t` prop re-renders on locale switches and wins
  // when present; the module-level fallback (browser language) covers
  // compositions without the locale seat.
  const copy = t ?? ((key: string) => tFallback(key as CopyKey))

  return (
    <button
      type="button"
      className={css.button}
      disabled={locked}
      title={copy('newSessionTooltip')}
      onClick={onClick}
    >
      <span className={css.buttonIcon}>
        <NewSessionIcon />
      </span>
      <span>{copy('newSession')}</span>
    </button>
  )
}
