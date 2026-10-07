import { isFormat, type Format } from '../config'
import { originOf, type DisplayOptions } from '../snippet'

/** Steps 1 and 4: the format card and the display options, read from the form as it stands. */

export interface OptionsParts {
  /** The format cards' radio buttons. */
  formats: HTMLInputElement[]
  title: HTMLInputElement
  toolbar: HTMLInputElement
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
  setMinHeight(height: number): void
}

export function createOptions(parts: OptionsParts, onChange: (change: OptionsChange) => void): Options {
  const { formats, title, toolbar, copyright, reuse, minHeight, xapi } = parts
  // The height in the markup, for when the field is cleared or out of range.
  const defaultHeight = Number.parseInt(minHeight.defaultValue, 10)

  // The bar's buttons mean nothing without the bar.
  const syncToolbar = () => {
    copyright.disabled = !toolbar.checked
    reuse.disabled = !toolbar.checked
  }

  for (const input of [toolbar, copyright, reuse]) {
    input.addEventListener('change', () => {
      syncToolbar()
      onChange('display')
    })
  }
  for (const input of [title, minHeight, xapi]) input.addEventListener('input', () => onChange('snippet'))
  for (const input of formats) input.addEventListener('change', () => onChange('snippet'))
  syncToolbar()

  return {
    read() {
      const format = formats.find((input) => input.checked)?.value ?? ''
      const height = Number.parseInt(minHeight.value, 10)
      return {
        format: isFormat(format) ? format : 'h5p',
        title: title.value.trim(),
        display: { toolbar: toolbar.checked, copyright: copyright.checked, reuse: reuse.checked },
        minHeight: minHeight.validity.valid && height > 0 ? height : defaultHeight,
        xapiOrigin: originOf(xapi.value)
      }
    },

    setMinHeight(height) {
      minHeight.value = String(height)
      onChange('snippet')
    }
  }
}
