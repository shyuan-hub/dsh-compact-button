/**
 * Host half of dsh-compact-button — **inert by design**.
 *
 * The plugin's entire feature lives client-side: one entry in the
 * platform-declared `conversation.composer.dock` list slot (see
 * `src/client/index.tsx`), whose Compact glyph submits `/compact` through
 * the session's existing command seam and whose New Session glyph goes
 * through the client `uiWorkspace` service. Neither needs anything from the
 * Node side, so there is nothing to do here.
 *
 * `apply()` is still exported because `cordis.patch.yml` mounts this module
 * as the bundle's Node half at profile boot, and the loader calls it. Keep
 * the export; a missing entry point breaks the mount, whereas a no-op does
 * not.
 *
 * This module used to self-heal a patch into the platform's ui-conversation
 * bundle, because that bundle did not declare a slot for these buttons.
 * That machinery is gone: `conversation.composer.dock` is an official slot
 * that the platform already declares and renders next to the ContextMeter,
 * so the plugin no longer touches platform code — not the npm copy on web,
 * and not `resources/app.asar` on the desktop app. Upgrading either no
 * longer requires re-applying anything.
 */
export function apply(): void {
  // Intentionally empty — see the header.
}
