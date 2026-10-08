import { snippetText, type Token } from '../snippet'
import { copyOrSelect } from './clipboard'

/** Step 4: the snippet on its board, with the copy button. */

export interface SnippetBoardParts {
  board: HTMLElement
  label: HTMLElement
  code: HTMLElement
  copy: HTMLButtonElement
  copyLabel: HTMLElement
}

export interface SnippetBoard {
  /** Shows a snippet. An example is dimmed and labelled as one; it plays a real sample, so it copies too. */
  show(tokens: readonly Token[], options: { example: boolean }): void
}

const LABEL = { example: 'Example · a sample quiz, or paste a link above', yours: 'HTML · your snippet' }
const COPY_LABEL = { idle: 'Copy', copied: 'Copied', selected: 'Selected: press Ctrl+C or ⌘C' }
const COPY_FEEDBACK_MS = 2400

export function createSnippetBoard({ board, label, code, copy, copyLabel }: SnippetBoardParts): SnippetBoard {
  let text = ''
  let resetTimer = 0

  copy.addEventListener('click', async () => {
    const outcome = await copyOrSelect(text, code)
    copyLabel.textContent = COPY_LABEL[outcome]
    copy.toggleAttribute('data-done', outcome === 'copied')
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      copyLabel.textContent = COPY_LABEL.idle
      copy.removeAttribute('data-done')
    }, COPY_FEEDBACK_MS)
  })

  return {
    show(tokens, { example }) {
      text = snippetText(tokens)
      code.replaceChildren(...tokens.map(render))
      board.toggleAttribute('data-example', example)
      label.textContent = example ? LABEL.example : LABEL.yours
    }
  }
}

/** A token as the board shows it: a value as plain text, anything else in a span coloured by its kind. */
function render({ kind, text }: Token): Node {
  if (kind === 'value') return document.createTextNode(text)
  const span = document.createElement('span')
  span.className = `tk-${kind}`
  span.textContent = text
  return span
}
