/**
 * Unit tests for the NewSessionButton component: renders the label/tooltip
 * (fallback vs. framework `t`), invokes `newSession` on click, locks against
 * a rapid double-click during the lockout window, and unlocks after it.
 * Timers are faked; no real network or platform.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NewSessionButton } from '../src/client/NewSessionButton.tsx'
import { en } from '../src/client/locales.ts'

/** How long the button stays locked after a click (mirrors LOCKOUT_MS). */
const LOCKOUT_MS = 1500

/** Render the button and settle any pending state updates. */
async function renderButton(newSession: () => void, t?: (key: string) => string) {
  await act(async () => {
    render(<NewSessionButton newSession={newSession} t={t} />)
  })
  return screen.getByRole('button')
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('idle', () => {
  it('renders the fallback (browser-language) label and tooltip', async () => {
    const button = await renderButton(() => {})
    expect(button).toHaveTextContent(en.newSession)
    expect(button).toHaveAttribute('title', en.newSessionTooltip)
    expect(button).not.toBeDisabled()
  })

  it('prefers the framework t prop over the fallback', async () => {
    const t = (key: string) => `[${key}]`
    const button = await renderButton(() => {}, t)
    expect(button).toHaveTextContent('[newSession]')
    expect(button).toHaveAttribute('title', '[newSessionTooltip]')
  })
})

describe('click', () => {
  it('invokes newSession on click', async () => {
    const newSession = vi.fn()
    const button = await renderButton(newSession)
    await act(async () => {
      fireEvent.click(button)
    })
    expect(newSession).toHaveBeenCalledOnce()
  })

  it('locks the button during the lockout window', async () => {
    const newSession = vi.fn()
    const button = await renderButton(newSession)
    await act(async () => {
      fireEvent.click(button)
    })
    expect(button).toBeDisabled()

    // The lockout must not have expired yet.
    await act(async () => {
      vi.advanceTimersByTime(LOCKOUT_MS - 1)
    })
    expect(button).toBeDisabled()
  })

  it('unlocks after the lockout window', async () => {
    const newSession = vi.fn()
    const button = await renderButton(newSession)
    await act(async () => {
      fireEvent.click(button)
    })
    await act(async () => {
      vi.advanceTimersByTime(LOCKOUT_MS)
    })
    expect(button).not.toBeDisabled()
  })

  it('ignores a rapid double-click (one startSession per lockout)', async () => {
    const newSession = vi.fn()
    const button = await renderButton(newSession)
    await act(async () => {
      fireEvent.click(button)
    })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(newSession).toHaveBeenCalledOnce()
  })

  it('can start again once unlocked', async () => {
    const newSession = vi.fn()
    const button = await renderButton(newSession)
    await act(async () => {
      fireEvent.click(button)
    })
    await act(async () => {
      vi.advanceTimersByTime(LOCKOUT_MS)
    })
    await act(async () => {
      fireEvent.click(button)
    })
    expect(newSession).toHaveBeenCalledTimes(2)
  })
})

describe('unmount', () => {
  it('clears the lockout timer without errors', async () => {
    const button = await renderButton(() => {})
    await act(async () => {
      fireEvent.click(button)
    })
    await act(async () => {
      cleanup()
    })
    expect(() => vi.advanceTimersByTime(LOCKOUT_MS)).not.toThrow()
  })
})
