/**
 * Test stand-in for `@deepseek-ai/dsh-client-ui-primitives`.
 *
 * The real package is a build-time external resolved from the loader's
 * module table at runtime and is deliberately not installed here (a second
 * copy of the platform renderer would mean a second slot-registry
 * instance). Vitest aliases the specifier to this file — see
 * `resolve.alias` in `vitest.config.ts`.
 *
 * The stand-in renders the bubble text onto the anchor as a `title`
 * attribute, which is what the component tests assert on: it pins down the
 * label our components hand to the tooltip and leaves the anchor's own
 * handlers intact. `portal` is mirrored as `data-tooltip-portal` so the
 * tests can pin it too — the composer dock clips fixed overlays, so a
 * tooltip without `portal` is invisible at runtime (see the slot contract).
 */
import { cloneElement, type ReactElement } from 'react'

export type TooltipSide = 'right' | 'bottom' | 'top'

export function Tooltip(props: {
  label: string | (() => string)
  side?: TooltipSide
  delayMs?: number
  disabled?: boolean
  portal?: boolean
  children: ReactElement
}): ReactElement {
  return cloneElement(props.children, {
    title: typeof props.label === 'function' ? props.label() : props.label,
    'data-tooltip-portal': props.portal === true ? 'true' : undefined,
  })
}
