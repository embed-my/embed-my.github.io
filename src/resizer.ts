/**
 * The page's half of H5P's resizer protocol: the exchange h5p.org's embed code and its
 * `h5p-resizer.js` use, and the one the player's embed page speaks. The frame says `hello` and
 * expects a `hello` back, then reports its content's height with `resize`.
 */

export type ResizerMessage = { action: 'hello' } | { action: 'resize'; height: number }

/** The reply to a frame's `hello`. */
export const HELLO = { context: 'h5p', action: 'hello' } as const

/** A message from a frame, read as the protocol has it, or `null` for anything else. */
export function readResizerMessage(data: unknown): ResizerMessage | null {
  if (typeof data !== 'object' || data === null) return null
  const { context, action, scrollHeight } = data as Record<string, unknown>
  if (context !== 'h5p') return null
  if (action === 'hello') return { action: 'hello' }
  if (action === 'resize' && typeof scrollHeight === 'number' && Number.isFinite(scrollHeight) && scrollHeight > 0) {
    return { action: 'resize', height: Math.ceil(scrollHeight) }
  }
  return null
}
