/**
 * The Compact action in the composer dock row: an icon-only button that
 * matches the ContextMeter ring next to it. One click submits the
 * `/compact` slash command to the session's agent through the existing
 * command seam (admission only — the compaction outcome renders as the
 * command row in the chat, exactly like a typed `/compact`). Because the
 * button carries no text, the phase machine drives two channels instead: the
 * platform Tooltip label (idle reads “压缩上下文”, settled phases report
 * the outcome) and the glyph colour. Hovering at any time tells you both
 * what the button does and what the last click did.
 */
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { useEffect, useRef, useState } from 'react'
import { t as tFallback, type CopyKey } from './locales.ts'
import css from './compact-button.module.css'

/** The button phase machine. */
type Phase = 'idle' | 'pending' | 'submitted' | 'rejected' | 'failed'

/** How long a settled phase stays visible before returning to idle. */
const SETTLED_VISIBLE_MS = 4000

/** Which copy key each phase reads out (tooltip + aria-label). */
const PHASE_KEY: Record<Phase, CopyKey> = {
  idle: 'label',
  pending: 'pending',
  submitted: 'submitted',
  rejected: 'rejected',
  failed: 'failed',
}

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

  // Clear the pending reset on unmount (HMR / slot teardown).
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

  // One string serves the tooltip bubble and the accessible name, so a
  // screen reader and a hover agree about what the glyph means right now.
  const label = copy(PHASE_KEY[phase])

  const modifier = phase === 'pending' ? css.iconPending
    : phase === 'submitted' ? css.iconSubmitted
    : phase === 'failed' ? css.iconFailed
    : ''

  return (
    <Tooltip label={label} side="top" delayMs={200}>
      <button
        type="button"
        className={`${css.iconButton} ${modifier}`.trim()}
        aria-label={label}
        aria-busy={phase === 'pending' || undefined}
        disabled={phase === 'pending'}
        onClick={onClick}
      >
        <CompressIcon />
      </button>
    </Tooltip>
  )
}
