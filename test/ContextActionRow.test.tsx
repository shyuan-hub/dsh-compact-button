/**
 * Unit tests for the ContextActionRow composition: it renders the Compact
 * button on the left and the New Session button on the right in one slot
 * entry, wires each prop to the right child, and forwards the framework `t`
 * to both children. Child phase machines are covered in their own suites.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ContextActionRow } from '../src/client/ContextActionRow.tsx'
import { en } from '../src/client/locales.ts'

/** Render the row and settle any pending state updates. */
async function renderRow(
  compact: () => Promise<boolean>,
  newSession: () => void,
  t?: (key: string) => string,
) {
  await act(async () => {
    render(<ContextActionRow compact={compact} newSession={newSession} t={t} />)
  })
  return screen.getAllByRole('button')
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
    expect(compact).toHaveTextContent(en.label)
    expect(newSession).toHaveTextContent(en.newSession)
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
    expect(compact).toHaveTextContent('[label]')
    expect(compact).toHaveAttribute('title', '[tooltip]')
    expect(newSession).toHaveTextContent('[newSession]')
    expect(newSession).toHaveAttribute('title', '[newSessionTooltip]')
  })
})
