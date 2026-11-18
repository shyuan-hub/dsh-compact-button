/**
 * Regression tests for the dock tooltips' `portal` prop.
 *
 * The slot contract for `conversation.composer.dock` states that floating
 * entries rendered inside the resident composer must portal fixed overlays to
 * the document body, because the docked composer clips them. The platform's
 * own dock members follow it (`ContextMeter` passes `portal`; the stat pills
 * spread `{ side: 'top', portal: true, delayMs: 200 }`), and on platform
 * 0.2.2-rc.x a non-portaled bubble here is simply invisible — hover produced
 * nothing at all. These tests pin the prop so the icons cannot silently lose
 * their only label channel (both glyphs are icon-only).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CompactButton } from '../src/client/CompactButton.tsx'
import { NewSessionButton } from '../src/client/NewSessionButton.tsx'
import { ContextActionRow } from '../src/client/ContextActionRow.tsx'

/** The attribute the primitives stub mirrors `portal` onto (see test/stubs). */
const PORTAL_ATTR = 'data-tooltip-portal'

/** Assert the anchor's tooltip bubble is portaled to the document body. */
function expectPortaled(anchor: HTMLElement): void {
  expect(anchor.getAttribute(PORTAL_ATTR)).toBe('true')
}

describe('composer dock tooltips', () => {
  afterEach(cleanup)

  it('portals the Compact tooltip', async () => {
    await act(async () => {
      render(<CompactButton compact={async () => true} />)
    })
    expectPortaled(screen.getByRole('button'))
  })

  it('portals the New Session tooltip', async () => {
    await act(async () => {
      render(<NewSessionButton newSession={vi.fn()} />)
    })
    expectPortaled(screen.getByRole('button'))
  })

  it('keeps both tooltips portaled after a click (settled phases re-render)', async () => {
    await act(async () => {
      render(<ContextActionRow compact={async () => true} newSession={vi.fn()} />)
    })
    const [compact, newSession] = screen.getAllByRole('button')
    expect(compact).toBeDefined()
    expect(newSession).toBeDefined()
    await act(async () => {
      fireEvent.click(compact as HTMLElement)
    })
    // The compact button re-renders through pending → submitted; the bubble
    // must stay portaled in every phase, not just at idle.
    expectPortaled(screen.getAllByRole('button')[0] as HTMLElement)
  })
})
