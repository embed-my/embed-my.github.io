import { HELLO, readResizerMessage } from '../resizer'

/**
 * Step 3: the preview. The frame loads the player's embed page and is sized by the same resizer
 * protocol `/h5p-resizer.js` handles on a visitor's page. The stage's `data-state` drives
 * src/styles/preview.css.
 */

export interface PreviewParts {
  stage: HTMLElement
  frame: HTMLIFrameElement
  status: HTMLElement
  measured: HTMLElement
}

export interface PreviewSettings {
  /** The origin the frame's messages have to come from. */
  playerOrigin: string
  /** How long the frame may stay silent before the stage offers to open it on its own. */
  stallAfterMs: number
  /** Called when the visitor asks for the measured height as the snippet's minimum height. */
  onUseHeight: (height: number) => void
}

export interface Preview {
  /** Loads an embed page's address into the frame, starting over. */
  load(url: string): void
}

type StageState = 'empty' | 'loading' | 'ready' | 'stalled'

export function createPreview({ stage, frame, status, measured }: PreviewParts, settings: PreviewSettings): Preview {
  let stallTimer = 0
  let alive = false

  const setState = (state: StageState) => {
    stage.dataset.state = state
  }

  const say = (text: string, { busy = false } = {}) => {
    status.replaceChildren()
    if (busy) {
      const spinner = document.createElement('span')
      spinner.className = 'spinner'
      spinner.setAttribute('aria-hidden', 'true')
      status.append(spinner)
    }
    if (text) status.append(text)
  }

  // Neither a hello nor a height: the browser gave the frame no Service Worker, or the player
  // could not be reached. The link opens the same page on its own, where the player can say why.
  const stalled = () => {
    if (alive) return
    setState('stalled')
    say('The preview did not start here. It needs a current browser and an https page. ')
    const link = document.createElement('a')
    link.href = frame.src
    link.target = '_blank'
    link.rel = 'noopener'
    link.textContent = 'Open it on its own ↗'
    status.append(link)
  }

  const showHeight = (height: number) => {
    const use = document.createElement('button')
    use.type = 'button'
    use.className = 'link-button'
    use.textContent = 'Use it as the minimum height'
    use.addEventListener('click', () => settings.onUseHeight(height))
    measured.replaceChildren(`Measured height: ${height} px. `, use)
    measured.hidden = false
  }

  addEventListener('message', ({ source, origin, data }) => {
    if (source !== frame.contentWindow || origin !== settings.playerOrigin) return
    const message = readResizerMessage(data)
    if (!message) return
    if (!alive) {
      alive = true
      clearTimeout(stallTimer)
    }
    if (message.action === 'hello') {
      frame.contentWindow?.postMessage(HELLO, origin)
      if (stage.dataset.state === 'loading') say('Starting the player…', { busy: true })
      return
    }
    frame.style.height = `${message.height}px`
    if (stage.dataset.state !== 'ready') {
      setState('ready')
      say('')
    }
    showHeight(message.height)
  })

  return {
    load(url) {
      clearTimeout(stallTimer)
      alive = false
      measured.hidden = true
      frame.style.height = ''
      setState('loading')
      say('Loading the preview…', { busy: true })
      frame.src = url
      stallTimer = setTimeout(stalled, settings.stallAfterMs)
    }
  }
}
