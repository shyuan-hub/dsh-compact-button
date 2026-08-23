/**
 * Unit tests for the CompactButton component's phase machine:
 * idle → pending → submitted / rejected / failed, resetting to idle after
 * the settled-visible window. Timers are faked; no real network or platform.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CompactButton } from '../src/client/CompactButton.tsx'
import { en } from '../src/client/locales.ts'

/** How long a settled phase stays visible (mirrors SETTLED_VISIBLE_MS). */
const SETTLED_VISIBLE_MS = 4000

/** A deferred `compact` promise the test resolves explicitly. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Render the button and settle any pending state updates. */
async function renderButton(compact: () => Promise<boolean>, t?: (key: string) => string) {
  await act(async () => {
    render(<CompactButton compact={compact} t={t} />)
  })
  return screen.getByRole('button')
}

/** Click and flush the admission promise. */
async function clickAndFlush(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button)
  })
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
    const button = await renderButton(() => Promise.resolve(true))
    expect(button).toHaveTextContent(en.label)
    expect(button).toHaveAttribute('title', en.tooltip)
    expect(button).not.toBeDisabled()
    expect(button).not.toHaveAttribute('aria-busy')
  })

  it('prefers the framework t prop over the fallback', async () => {
    const t = (key: string) => `[${key}]`
    const button = await renderButton(() => Promise.resolve(true), t)
    expect(button).toHaveTextContent('[label]')
    expect(button).toHaveAttribute('title', '[tooltip]')
  })
})

describe('pending', () => {
  it('disables the button while the admission is in flight', async () => {
    const pending = deferred<boolean>()
    const button = await renderButton(() => pending.promise)
    await clickAndFlush(button)

    expect(button).toHaveTextContent(en.pending)
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('ignores clicks while pending (one admission in flight)', async () => {
    const pending = deferred<boolean>()
    const compact = vi.fn(() => pending.promise)
    const button = await renderButton(compact)
    await clickAndFlush(button)
    fireEvent.click(button)
    fireEvent.click(button)
    expect(compact).toHaveBeenCalledOnce()
  })
})

describe('settled phases', () => {
  it('shows submitted when the command was matched', async () => {
    const button = await renderButton(() => Promise.resolve(true))
    await clickAndFlush(button)
    expect(button).toHaveTextContent(en.submitted)
    expect(button).not.toBeDisabled()
  })

  it('shows rejected when the command was not matched', async () => {
    const button = await renderButton(() => Promise.resolve(false))
    await clickAndFlush(button)
    expect(button).toHaveTextContent(en.rejected)
  })

  it('shows failed when the admission rejects', async () => {
    const button = await renderButton(() => Promise.reject(new Error('transport down')))
    await clickAndFlush(button)
    expect(button).toHaveTextContent(en.failed)
  })

  it('returns to idle after the settled-visible window', async () => {
    const button = await renderButton(() => Promise.resolve(true))
    await clickAndFlush(button)
    expect(button).toHaveTextContent(en.submitted)

    await act(async () => {
      vi.advanceTimersByTime(SETTLED_VISIBLE_MS)
    })
    expect(button).toHaveTextContent(en.label)
    expect(button).not.toBeDisabled()
  })

  it('restarts the reset window on a later submission', async () => {
    const button = await renderButton(() => Promise.resolve(true))
    await clickAndFlush(button)

    // Halfway through the first window, submit again.
    await act(async () => {
      vi.advanceTimersByTime(SETTLED_VISIBLE_MS / 2)
    })
    await clickAndFlush(button)

    // The first window's deadline must not reset the second submission early.
    await act(async () => {
      vi.advanceTimersByTime(SETTLED_VISIBLE_MS / 2 + 1)
    })
    expect(button).toHaveTextContent(en.submitted)

    await act(async () => {
      vi.advanceTimersByTime(SETTLED_VISIBLE_MS / 2)
    })
    expect(button).toHaveTextContent(en.label)
  })
})

describe('unmount', () => {
  it('clears the pending reset timer without errors', async () => {
    const button = await renderButton(() => Promise.resolve(true))
    await clickAndFlush(button)
    await act(async () => {
      cleanup()
    })
    expect(() => vi.advanceTimersByTime(SETTLED_VISIBLE_MS)).not.toThrow()
  })
})
