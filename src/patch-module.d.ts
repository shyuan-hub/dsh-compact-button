/**
 * Structural types for ../patch-context-meter.cjs — a plain CJS module the
 * host half bundles inline (it must stay CJS so the manual CLI can
 * `node patch-run.cjs` it without any build step). Wildcard ambient
 * declaration: the project imports no other .cjs modules.
 */
declare module '*.cjs' {
  /** One per-file outcome of the patch run. */
  export interface PatchResult {
    status: 'patched' | 'already' | 'drift' | 'error'
    /** Absolute path of the ui-conversation lib/client.js considered. */
    file: string
    /** Detected platform package version (undefined when unreadable). */
    version?: string
    /** Whether that version is in the tested set (documentation only). */
    tested?: boolean
    /** Drift: which anchor failed its exactly-one-match assertion. */
    label?: string
    /** Drift: how many times that anchor matched (expected 1). */
    count?: number
    /** Error: the caught read/write failure. */
    error?: unknown
  }
  /** Discover installed ui-conversation bundles and patch each in place. */
  export function patchInstalledTargets(startDirs?: string[]): PatchResult[]
  /** One human-readable line describing a patch outcome. */
  export function describeResult(result: PatchResult): string
}
