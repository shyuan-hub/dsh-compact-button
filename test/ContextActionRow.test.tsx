/**
 * Unit tests for the ContextActionRow composition: it renders the Compact
 * button on the left and the New Session button on the right in one slot
 * entry, wires each prop to the right child, forwards the framework `t` to
 * both children, and stays unmounted until the Session has model activity.
 * Child phase machines are covered in their own suites.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  ContextActionRow,
  sessionHasActivity,
  type UseProjection,
} from '../src/client/ContextActionRow.tsx'
import { en } from '../src/client/locales.ts'

/** Render the row and settle any pending state updates. */
async function renderRow(
  compact: () => Promise<boolean>,
  newSession: () => void,
  t?: (key: string) => string,
  useProjection?: UseProjection,
) {
  await act(async () => {
    render(
      <ContextActionRow
        compact={compact}
        newSession={newSession}
        t={t}
        useProjection={useProjection}
      />,
    )
  })
  return screen.queryAllByRole('button')
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('layout', () => {
  it('renders Compact on the left and New Session on the right', async () => {
    const [compact, newSession] = await renderRow(
      () => Promise.resolve(true),
      () => {},
    )
    expect(compact).toHaveAttribute('aria-label', en.label)
    expect(newSession).toHaveAttribute('aria-label', en.newSession)
  })
})

describe('prop wiring', () => {
  it('routes clicks to the compact closure', async () => {
    const compact = vi.fn().mockResolvedValue(true)
    const [compactButton] = await renderRow(compact, () => {})
    await act(async () => {
      fireEvent.click(compactButton)
    })
    expect(compact).toHaveBeenCalledOnce()
  })

  it('routes clicks to the newSession closure', async () => {
    const newSession = vi.fn()
    const [, newSessionButton] = await renderRow(() => Promise.resolve(true), newSession)
    await act(async () => {
      fireEvent.click(newSessionButton)
    })
    expect(newSession).toHaveBeenCalledOnce()
  })

  it('keeps the two actions independent', async () => {
    const compact = vi.fn().mockResolvedValue(true)
    const newSession = vi.fn()
    const [compactButton, newSessionButton] = await renderRow(compact, newSession)
    await act(async () => {
      fireEvent.click(newSessionButton)
    })
    expect(compact).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(compactButton)
    })
    expect(newSession).toHaveBeenCalledOnce()
  })
})

describe('translations', () => {
  it('forwards the framework t prop to both children', async () => {
    const t = (key: string) => `[${key}]`
    const [compact, newSession] = await renderRow(() => Promise.resolve(true), () => {}, t)
    expect(compact).toHaveAttribute('aria-label', '[label]')
    expect(compact).toHaveAttribute('title', '[label]')
    expect(newSession).toHaveAttribute('aria-label', '[newSession]')
    expect(newSession).toHaveAttribute('title', '[newSession]')
  })
})

describe('activity gate', () => {
  it('hides the row while no step has closed', () => {
    expect(sessionHasActivity({ steps: 0 }, undefined, true)).toBe(false)
  })

  it('shows the row once the first step closes', () => {
    expect(sessionHasActivity({ steps: 1 }, undefined, true)).toBe(true)
  })

  it('falls back to token usage when sessionStats is not composed', () => {
    expect(sessionHasActivity(undefined, { outputTokens: 0 }, true)).toBe(false)
    expect(sessionHasActivity(undefined, { outputTokens: 12 }, true)).toBe(true)
  })

  it('shows when the framework supplies no projection selector', () => {
    expect(sessionHasActivity(undefined, undefined, false)).toBe(true)
    expect(sessionHasActivity({ steps: 0 }, undefined, false)).toBe(true)
  })

  it('renders nothing on a blank session', async () => {
    const buttons = await renderRow(
      () => Promise.resolve(true),
      () => {},
      undefined,
      (key) => (key === 'sessionStats' ? { steps: 0 } : undefined),
    )
    expect(buttons).toHaveLength(0)
  })

  it('renders once the session has a closed step', async () => {
    const buttons = await renderRow(
      () => Promise.resolve(true),
      () => {},
      undefined,
      (key) => (key === 'sessionStats' ? { steps: 2 } : undefined),
    )
    expect(buttons).toHaveLength(2)
  })

  it('renders on a blank session when no selector reaches the row', async () => {
    const buttons = await renderRow(() => Promise.resolve(true), () => {})
    expect(buttons).toHaveLength(2)
  })

  it('appears mid-session when the projection starts reporting steps', async () => {
    const view = await act(async () => {
      return render(
        <ContextActionRow
          compact={() => Promise.resolve(true)}
          newSession={() => {}}
          useProjection={(key) => (key === 'sessionStats' ? { steps: 0 } : undefined)}
        />,
      )
    })
    expect(view.queryAllByRole('button')).toHaveLength(0)
    await act(async () => {
      view.rerender(
        <ContextActionRow
          compact={() => Promise.resolve(true)}
          newSession={() => {}}
          useProjection={(key) => (key === 'sessionStats' ? { steps: 1 } : undefined)}
        />,
      )
    })
    expect(view.queryAllByRole('button')).toHaveLength(2)
  })
})
