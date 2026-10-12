/**
 * The composer dock action row: composes the Compact glyph and the New
 * Session glyph side by side in one `conversation.composer.dock` slot
 * entry. Rendering both in a single entry (rather than two list entries)
 * keeps their order deterministic — Compact first, New Session to its right —
 * independent of the list slot's entry ordering. Each glyph is icon-only and
 * carries its own platform Tooltip, matching the ContextMeter ring the row
 * sits beside.
 */
import { CompactButton } from './CompactButton.tsx'
import { NewSessionButton } from './NewSessionButton.tsx'
import css from './compact-button.module.css'

export interface ContextActionRowProps {
  /** Submit the `/compact` command for this seat's session (Compact button). */
  compact: () => Promise<boolean>
  /** Start a fresh Session in the current Session's Workspace (New Session
   *  button). */
  newSession: () => void
  /** The framework translation function for the plugin locale namespace. */
  t?: (key: string) => string
}

export function ContextActionRow({ compact, newSession, t }: ContextActionRowProps) {
  return (
    <div className={css.row}>
      <CompactButton compact={compact} t={t} />
      <NewSessionButton newSession={newSession} t={t} />
    </div>
  )
}
