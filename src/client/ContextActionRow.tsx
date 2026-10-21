/**
 * The composer dock action row: composes the Compact glyph and the New
 * Session glyph side by side in one `conversation.composer.dock` slot
 * entry. Rendering both in a single entry (rather than two list entries)
 * keeps their order deterministic — Compact first, New Session to its right —
 * independent of the list slot's entry ordering. Each glyph is icon-only and
 * carries its own platform Tooltip, matching the ContextMeter ring the row
 * sits beside.
 *
 * The row stays unmounted until the Session has produced model activity, so
 * it appears at the same moment as the official dock pills rather than on a
 * blank Session. See {@link sessionHasActivity}.
 */
import { CompactButton } from './CompactButton.tsx'
import { NewSessionButton } from './NewSessionButton.tsx'
import css from './compact-button.module.css'

/** The slice of the `sessionStats` projection this row reads. */
interface SessionStatsLike {
  /** Closed steps so far; 0 until the first turn ends. */
  steps?: number
}

/** The slice of the `tokenUsage` projection used as the fallback signal. */
interface TokenUsageLike {
  /** Provider output tokens so far; 0 until the model has answered. */
  outputTokens?: number
}

/**
 * Session projection selector the slot framework hands to session-scoped
 * occupants (mirrors the platform's `useProjection`). Declared locally — the
 * plugin takes no dependency on a platform package.
 */
export type UseProjection = (key: string) => unknown

export interface ContextActionRowProps {
  /** Submit the `/compact` command for this seat's session (Compact button). */
  compact: () => Promise<boolean>
  /** Start a fresh Session in the current Session's Workspace (New Session
   *  button). */
  newSession: () => void
  /** The framework translation function for the plugin locale namespace. */
  t?: (key: string) => string
  /** Framework session projection selector; absent means "no signal", which
   *  degrades to always showing rather than hiding the feature. */
  useProjection?: UseProjection
}

/**
 * Whether this Session has produced any model activity yet.
 *
 * The official dock occupants hide themselves the same way rather than
 * unregistering: `ActivityPill` returns null on `stats.steps === 0` and
 * `UsagePill` returns null while token usage is still zero. Matching them
 * keeps the dock row empty on a blank Session instead of showing controls
 * that have nothing to act on — there is no history to compact and the
 * current Session is already the new one.
 *
 * `sessionStats` is the primary signal because `steps` counts closed
 * `step/end` events, i.e. exactly "the first turn has ended", and it folds
 * from the whole durable log so paging and compaction cannot move it. When
 * the `dsh-session-stats` unit is not composed the projection is absent, so
 * fall back to `tokenUsage`; with neither selector available, show.
 *
 * @param stats - the `sessionStats` projection, when present.
 * @param usage - the `tokenUsage` projection, when present.
 * @param haveSelector - whether the framework supplied `useProjection`.
 * @returns true once the Session has model activity, or when no signal exists.
 */
export function sessionHasActivity(
  stats: SessionStatsLike | null | undefined,
  usage: TokenUsageLike | null | undefined,
  haveSelector: boolean,
): boolean {
  if (!haveSelector) return true
  if (stats !== null && stats !== undefined) return (stats.steps ?? 0) > 0
  if (usage !== null && usage !== undefined) return (usage.outputTokens ?? 0) > 0
  return true
}

export function ContextActionRow({
  compact,
  newSession,
  t,
  useProjection,
}: ContextActionRowProps) {
  // Both selectors are subscription hooks, so they run on every render and
  // must not sit behind the early return below.
  const stats = useProjection?.('sessionStats') as SessionStatsLike | undefined
  const usage = useProjection?.('tokenUsage') as TokenUsageLike | undefined
  if (!sessionHasActivity(stats, usage, useProjection !== undefined)) return null
  return (
    <div className={css.row}>
      <CompactButton compact={compact} t={t} />
      <NewSessionButton newSession={newSession} t={t} />
    </div>
  )
}
