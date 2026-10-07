import { describe, expect, it } from 'vitest'
import { readResizerMessage } from './resizer'

describe('readResizerMessage', () => {
  it('reads a hello', () => {
    expect(readResizerMessage({ context: 'h5p', action: 'hello' })).toEqual({ action: 'hello' })
  })

  it('reads a height, rounded up to whole pixels', () => {
    expect(readResizerMessage({ context: 'h5p', action: 'resize', scrollHeight: 611.2 })).toEqual({ action: 'resize', height: 612 })
  })

  it('ignores other messages and heights that make no sense', () => {
    expect(readResizerMessage(null)).toBeNull()
    expect(readResizerMessage('hello')).toBeNull()
    expect(readResizerMessage({ context: 'h5p-offline-player', action: 'xapi' })).toBeNull()
    expect(readResizerMessage({ context: 'h5p', action: 'resize' })).toBeNull()
    expect(readResizerMessage({ context: 'h5p', action: 'resize', scrollHeight: Number.NaN })).toBeNull()
    expect(readResizerMessage({ context: 'h5p', action: 'resize', scrollHeight: -1 })).toBeNull()
  })
})
