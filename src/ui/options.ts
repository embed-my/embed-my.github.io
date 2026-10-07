import { isFormat, type Format } from '../config'
import { originOf, type DisplayOptions } from '../snippet'

/** Steps 1 and 3: the format card and the display options, read from the form as it stands. */

export interface OptionsParts {
  /** The format cards' radio buttons. */
  formats: HTMLInputElement[]
  title: HTMLInputElement
  copyright: HTMLInputElement
  reuse: HTMLInputElement
  minHeight: HTMLInputElement
  xapi: HTMLInputElement
}

/** What the visitor chose. */
export interface EmbedOptions {
  format: Format
  /** The frame title as typed; empty when none was. */
  title: string
  display: DisplayOptions
  minHeight: number
  /** The origin xAPI statements go to, or `null` for none. */
  xapiOrigin: string | null
}

/** What a change affects: the display options change the frame itself, the rest only the snippet. */
export type OptionsChange = 'display' | 'snippet'

export interface Options {
  read(): EmbedOptions
  /**
   * Offers the activity's measured height as the minimum height. Taken while the field still holds
   * the default or an earlier measurement; once the visitor has typed a height of their own, theirs
   * stands. Says whether it was taken.
   */
  suggestMinHeight(height: number): boolean
}

export function createOptions(parts: OptionsParts, onChange: (change: OptionsChange) => void): Options {
  const { formats, title, copyright, reuse, minHeight, xapi } = parts
  // The height in the markup, for when the field is cleared or out of range.
  const defaultHeight = Number.parseInt(minHeight.defaultValue, 10)
  // Whether the visitor has typed a height; a measurement never overwrites one.
  let heightTyped = false

  for (const input of [copyright, reuse]) input.addEventListener('change', () => onChange('display'))
  for (const input of [title, minHeight, xapi]) input.addEventListener('input', () => onChange('snippet'))
  minHeight.addEventListener('input', () => {
    heightTyped = true
  })
  for (const input of formats) input.addEventListener('change', () => onChange('snippet'))

  return {
    read() {
      const format = formats.find((input) => input.checked)?.value ?? ''
      const height = Number.parseInt(minHeight.value, 10)
      return {
        format: isFormat(format) ? format : 'h5p',
        title: title.value.trim(),
        display: { copyright: copyright.checked, reuse: reuse.checked },
        minHeight: minHeight.validity.valid && height > 0 ? height : defaultHeight,
        xapiOrigin: originOf(xapi.value)
      }
    },

    suggestMinHeight(height) {
      if (heightTyped) return false
      if (minHeight.value !== String(height)) {
        minHeight.value = String(height)
        onChange('snippet')
      }
      return true
    }
  }
}
