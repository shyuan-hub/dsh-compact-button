/**
 * The Compact button rendered in the conversation context meter panel (the
 * `conversation.context.actions` slot the platform declares on the
 * ContextMeter). One click submits the `/compact` slash command to the
 * session's agent through the existing command seam (admission only — the
 * compaction outcome renders as the command row in the chat, exactly like a
 * typed `/compact`). The button surfaces the local phases: idle → pending
 * (admission in flight) → submitted / rejected / failed, resetting to idle
 * after a short window so the panel stays clean.
 */
import { useEffect, useRef, useState } from 'react'
import { t as tFallback, type CopyKey } from './locales.ts'
import css from './compact-button.module.css'

/** The button phase machine. */
type Phase = 'idle' | 'pending' | 'submitted' | 'rejected' | 'failed'

/** How long a settled phase stays visible before returning to idle. */
const SETTLED_VISIBLE_MS = 4000

/** The compress glyph: two arrows pointing toward the center. */
function CompressIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M8 2v4m0 0L5.8 3.8M8 6l2.2-2.2M8 14v-4m0 0L5.8 12.2M8 10l2.2 2.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export interface CompactButtonProps {
  /** Submit the `/compact` command for this seat's session. Resolves true when
   *  the command was matched and admitted; false when it was not matched
   *  (e.g. no session in this composer). Transport failures reject. */
  compact: () => Promise<boolean>
  /** The framework translation function for the plugin locale namespace
   *  (the slot registry passes it as `t` when the entry registers a
   *  `locale`; re-renders on locale switches). */
  t?: (key: string) => string
}

export function CompactButton({ compact, t }: CompactButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const resetTimer = useRef<number | null>(null)

  // Clear the pending reset on unmount (HMR / panel close).
  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
  }, [])

  const scheduleReset = (): void => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    resetTimer.current = window.setTimeout(() => setPhase('idle'), SETTLED_VISIBLE_MS)
  }

  const onClick = (): void => {
    if (phase === 'pending') return
    setPhase('pending')
    void compact().then(
      (matched) => {
        setPhase(matched ? 'submitted' : 'rejected')
        scheduleReset()
      },
      () => {
        setPhase('failed')
        scheduleReset()
      },
    )
  }

  // The slot framework's `t` prop re-renders on locale switches and wins
  // when present; the module-level fallback (browser language) covers
  // compositions without the locale seat.
  const copy = t ?? ((key: string) => tFallback(key as CopyKey))

  const label = phase === 'pending' ? copy('pending')
    : phase === 'submitted' ? copy('submitted')
    : phase === 'rejected' ? copy('rejected')
    : phase === 'failed' ? copy('failed')
    : copy('label')

  const modifier = phase === 'pending' ? css.buttonPending
    : phase === 'submitted' ? css.buttonSubmitted
    : phase === 'failed' ? css.buttonFailed
    : ''

  return (
    <button
      type="button"
      className={`${css.button} ${modifier}`.trim()}
      aria-busy={phase === 'pending' || undefined}
      disabled={phase === 'pending'}
      title={copy('tooltip')}
      onClick={onClick}
    >
      <span className={css.buttonIcon}><CompressIcon /></span>
      <span>{label}</span>
    </button>
  )
}
