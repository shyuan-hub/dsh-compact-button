/**
 * zh/en copy for the compact button. The dictionaries are registered into the
 * DSH locale registry under {@link LOCALE_NS}; the slot component receives
 * the framework's `t` prop (bound to the active locale and re-rendered on
 * switches) so no module-level lookup is needed at render time.
 */

/** The zh dictionary (registered under {@link LOCALE_NS}). */
export const zh = {
  label: '压缩上下文',
  tooltip: '将较早的对话历史压缩为摘要（提交 /compact）',
  pending: '压缩中…',
  submitted: '已提交压缩',
  rejected: '命令未匹配',
  failed: '提交失败',
  newSession: '新建会话',
  newSessionTooltip: '在当前工作区新建一个会话，agent 预设、workspace 与权限设置保持一致',
} as const

/** The en dictionary (registered under {@link LOCALE_NS}). */
export const en = {
  label: 'Compact context',
  tooltip: 'Summarize older conversation history (submits /compact)',
  pending: 'Compacting…',
  submitted: 'Compaction submitted',
  rejected: 'Command not matched',
  failed: 'Submission failed',
  newSession: 'New session',
  newSessionTooltip: 'Start a new session in this workspace with the same agent preset and permissions',
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
