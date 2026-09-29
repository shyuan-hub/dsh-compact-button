/**
 * Ambient declaration for the one platform primitive this plugin uses.
 *
 * `@deepseek-ai/dsh-client-ui-primitives` is a build-time **external**: the
 * bundler leaves the `require` in place and the loader resolves it from its
 * module table at runtime (see `CLIENT_EXTERNALS` in `tsdown.config.ts`).
 * The plugin deliberately takes no dependency on it — the same reason it
 * declares no `@deepseek-ai/*` peer dep at all: a second copy of the
 * platform renderer means a second slot-registry instance, which breaks
 * slot registration outright.
 *
 * So the types are declared locally rather than imported from the package.
 * This mirrors the published `lib/types/Tooltip.d.ts` for the surface we
 * touch; if the real signature ever diverges, the runtime prop is simply
 * ignored, and the component tests (which mock this module) keep the
 * label/anchor wiring honest.
 */
declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { ReactElement } from 'react'

  /** Bubble placement relative to the anchor. */
  export type TooltipSide = 'right' | 'bottom' | 'top'

  /** Bubble text, or a resolver evaluated only while visible. */
  type TooltipLabel = string | (() => string)

  /**
   * Attach a hover/focus tooltip to a single anchor element.
   * @param props.label - bubble text; an empty string shows only shortcut keys.
   * @param props.side - placement relative to the anchor (default `'right'`).
   * @param props.delayMs - hover delay in ms (default 0).
   * @param props.portal - render the bubble under `document.body` so an
   *   ancestor's clipping or stacking context cannot hide it.
   * @param props.children - the anchor element; its own ref is forwarded.
   */
  export function Tooltip(props: {
    label: TooltipLabel
    shortcutKeys?: readonly string[] | undefined
    side?: TooltipSide | undefined
    align?: 'center' | 'end' | undefined
    delayMs?: number | undefined
    focusDelayMs?: number | undefined
    gap?: number | undefined
    disabled?: boolean | undefined
    portal?: boolean | undefined
    maxWidth?: number | undefined
    openOnClick?: boolean | undefined
    children: ReactElement
  }): JSX.Element
}
