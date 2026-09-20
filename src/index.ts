/**
 * Host half of dsh-compact-button. The plugin's whole feature is a client
 * slot entry in the conversation context meter panel; the compaction it
 * triggers runs through the session's existing `/compact` command seam on
 * the Host (the command-compact plugin). The one host-side duty left: the
 * platform's ui-conversation bundle does not declare the
 * `conversation.context.actions` slot this entry registers into, so on
 * every dsh start we self-heal the patch that declares and renders it.
 * The patch is idempotent, asserts every anchor, and never throws — a
 * drifted or absent platform bundle degrades to "slot absent → button not
 * rendered".
 *
 * There is deliberately no platform version gate here: the plugin resolves
 * nothing from the platform at runtime (its services arrive through cordis
 * injection), and the patch anchors are format-agnostic, so a new DSH
 * release needs no change on our side as long as the ContextMeter keeps
 * its shape. The detected platform version is logged, so an untested
 * release is visible instead of silently assumed.
 */
import { describeResult, patchInstalledTargets } from '../patch-context-meter.cjs'

export function apply(): void {
  try {
    for (const result of patchInstalledTargets()) {
      // 'already' is the common case at every start: stay silent.
      if (result.status === 'already') continue
      const line = describeResult(result)
      if (result.status === 'patched') console.info(`[dsh-compact-button] ${line}`)
      else console.warn(`[dsh-compact-button] ${line}`)
    }
  } catch (error) {
    console.warn('[dsh-compact-button] platform patch skipped:', error)
  }
}
