/**
 * Host half of dsh-compact-button: no host-side behavior. The plugin's
 * whole feature is a client slot entry in the conversation context meter
 * panel; the compaction it triggers runs through the session's existing
 * `/compact` command seam on the Host (the command-compact plugin), so
 * there is nothing to install here.
 */
export function apply(): void {}
