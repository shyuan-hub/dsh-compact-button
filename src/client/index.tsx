/**
 * Client half of dsh-compact-button: registers an action row into the
 * conversation context meter panel's actions slot (`conversation.context.actions`,
 * declared as a child of `conversation.composer.bar` by the platform's
 * ui-conversation ContextMeter). The row holds two buttons:
 * - Compact: one click submits `/compact` to this seat's session through the
 *   existing command seam — the same path a typed `/compact` takes — so
 *   admission, locking, durability and the command row in the chat all stay
 *   owned by the Host's command-compact plugin.
 * - New session: one click asks the client `uiWorkspace` service to start a
 *   fresh Session in the current Session's Workspace and navigate to it, so
 *   the new Session shares the previous one's Workspace and inherits the same
 *   deployment-level agent preset and permission policy.
 *
 * Services: slots (slot registration), sessions (scoped session command
 * submission), uiWorkspace (new-session action), locale (dictionary
 * registration).
 */
import type { Context } from '../context-types.ts'
import { ContextActionRow } from './ContextActionRow.tsx'
import { LOCALE_NS, en, zh } from './locales.ts'

/** The services this plugin reads (declared on the Context in
 *  ../context-types.ts; Cordis guards service access without inject). */
export const inject = ['slots', 'sessions', 'uiWorkspace', 'locale']

/**
 * Client plugin body.
 * @param ctx - the client cordis context (slots, sessions, locale).
 */
export function apply(ctx: Context): void {
  // Register the plugin's dictionaries into the shared locale registry so the
  // slot framework's `t` prop resolves the compactButton namespace. The
  // disposer runs on fiber disposal, so re-activation (HMR) re-registers
  // cleanly.
  ctx.effect(
    () => {
      const offZh = ctx.locale.register(LOCALE_NS, 'zh', zh)
      const offEn = ctx.locale.register(LOCALE_NS, 'en', en)
      return () => {
        offZh()
        offEn()
      }
    },
    'dsh-compact-button: dictionaries',
  )
  // The context meter panel's actions slot: slots.inject waits for the
  // platform's declaration (the ui-conversation entry must be on the ledger
  // first — registering directly would race it), then registers the button.
  // The disposer unregisters on fiber disposal (HMR-safe).
  ctx.effect(
    () =>
      ctx.slots.inject('conversation.context.actions', () =>
        ctx.slots.register(
          {
            // List slots require a unique instance id (registry contract).
            id: 'dsh-compact-button:context-actions',
            name: 'conversation.context.actions',
            locale: LOCALE_NS,
            registrant: 'dsh-compact-button',
            inject: (sessionId) => ({
              // Submit /compact to this seat's session (admission only — the
              // compaction outcome renders as the command row in the chat).
              compact: async (): Promise<boolean> => {
                if (sessionId === undefined) return false
                const scoped = ctx.sessions.binding(sessionId)
                if (scoped?.session === undefined) return false
                const result = await scoped.session.command('/compact')
                return result.ok && result.value?.matched === true
              },
              // Start a fresh Session in the current Session's Workspace and
              // navigate to it. Called with no workspace id so uiWorkspace
              // resolves the target from the current Session (then the recent
              // Workspace projection as a fallback).
              newSession: (): void => {
                ctx.uiWorkspace.startSession()
              },
            }),
          },
          ContextActionRow,
        ),
      ),
    'dsh-compact-button: context actions slot',
  )
}
