/**
 * The context meter action row: composes the Compact button and the New
 * Session button side by side in one `conversation.context.actions` slot
 * entry. Rendering both in a single entry (rather than two list entries)
 * keeps their order deterministic — Compact first, New Session to its right —
 * independent of the list slot's entry ordering. The flex row (see
 * `compact-button.module.css` `.row`) gives the two buttons equal width.
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
