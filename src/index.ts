/**
 * Host half of dsh-compact-button. The plugin's whole feature is a client
 * slot entry in the conversation context meter panel; the compaction it
 * triggers runs through the session's existing `/compact` command seam on
 * the Host (the command-compact plugin). The one host-side duty left: the
 * platform's ui-conversation bundle (official rc2) does not declare the
 * `conversation.context.actions` slot this entry registers into, so on
 * every dsh start we self-heal the patch that declares and renders it
 * (the postinstall hook applies it right after install; this heals a
 * platform reinstall that restored the pristine bundle). The patch is
 * idempotent, asserts every replacement, and never throws — a drifted or
 * absent platform bundle degrades to "slot absent → button not rendered".
 */
import { patchInstalledTargets } from '../patch-context-meter.cjs'

export function apply(): void {
  try {
    for (const result of patchInstalledTargets()) {
      if (result.status === 'patched') {
        console.info(`[dsh-compact-button] platform patch applied: ${result.file}`)
      } else if (result.status === 'drift') {
        console.warn(
          `[dsh-compact-button] platform patch skipped (${result.file}): `
          + `"${result.label}" matched ${result.count} time(s), expected 1 — `
          + 'the context-meter buttons will not render until the platform declares the slot itself',
        )
      }
      // 'already' is the common case at every start: stay silent.
    }
  } catch (error) {
    console.warn('[dsh-compact-button] platform patch skipped:', error)
  }
}
