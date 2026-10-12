/**
 * zh/en copy for the two composer-dock actions. The dictionaries are
 * registered into the DSH locale registry under {@link LOCALE_NS}; the slot
 * component receives the framework's `t` prop (bound to the active locale
 * and re-rendered on switches) so no module-level lookup is needed at
 * render time.
 *
 * Every key here is live. The buttons are icon-only and read one key for
 * both the Tooltip bubble and the `aria-label` (see `PHASE_KEY` in
 * `CompactButton.tsx`), so there are no separate `*Tooltip` entries — the
 * old `tooltip` / `newSessionTooltip` keys went unused when the buttons
 * dropped their text and are gone.
 */

/** The zh dictionary (registered under {@link LOCALE_NS}). */
export const zh = {
  label: '压缩上下文',
  pending: '压缩中…',
  submitted: '已提交压缩',
  rejected: '命令未匹配',
  failed: '提交失败',
  newSession: '新建会话',
} as const

/** The en dictionary (registered under {@link LOCALE_NS}). */
export const en = {
  label: 'Compact context',
  pending: 'Compacting…',
  submitted: 'Compaction submitted',
  rejected: 'Command not matched',
  failed: 'Submission failed',
  newSession: 'New session',
} as const

/** The namespace this plugin's dictionaries register under. */
export const LOCALE_NS = 'compactButton'

/** A copy key in either dictionary. */
export type CopyKey = keyof typeof zh

/** Translate one key against the browser language (fallback path only — the
 *  slot framework's `translate` prop, bound to the DSH locale service, wins
 *  at render time and re-renders on locale switches). */
export function t(key: CopyKey): string {
  const isZh = typeof navigator !== 'undefined' && (navigator.language ?? 'en').toLowerCase().startsWith('zh')
  return (isZh ? zh : en)[key]
}
