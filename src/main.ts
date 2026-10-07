import { EXAMPLE, FALLBACK_TITLE, FORMATS, PLAYER_URL, PREVIEW_STALL_MS, SITE_ORIGIN } from './config'
import { buildSnippet, displayFlags, embedUrl, titleFromUrl } from './snippet'
import { allOf, byId } from './ui/dom'
import { createOptions } from './ui/options'
import { initPackageForm } from './ui/package-form'
import { createPreview } from './ui/preview'
import { createSnippetBoard } from './ui/snippet-board'
import { initThemeToggle } from './ui/theme-toggle'

/*
 * The page, wired together: the link goes to the preview and to the snippet, and the options to
 * both. Every element is found here, so this file is where the markup and the script meet.
 */

/** The package being embedded, once a link has been sent; until then the snippet is the example. */
let src: string | null = null

const stage = byId('stage', HTMLElement)

const options = createOptions(
  {
    formats: allOf(document, 'input[name="format"]', HTMLInputElement),
    title: byId('opt-title', HTMLInputElement),
    toolbar: byId('opt-toolbar', HTMLInputElement),
    copyright: byId('opt-copyright', HTMLInputElement),
    reuse: byId('opt-reuse', HTMLInputElement),
    minHeight: byId('opt-height', HTMLInputElement),
    xapi: byId('opt-xapi', HTMLInputElement)
  },
  (change) => {
    renderSnippet()
    // The toolbar is part of the frame, so the preview follows it.
    if (change === 'display') loadPreview()
  }
)

const preview = createPreview(
  {
    stage,
    frame: byId('preview', HTMLIFrameElement),
    status: byId('stage-status', HTMLElement),
    measured: byId('measured', HTMLElement)
  },
  {
    playerOrigin: new URL(PLAYER_URL).origin,
    stallAfterMs: PREVIEW_STALL_MS,
    onUseHeight: (height) => options.setMinHeight(height)
  }
)

const board = createSnippetBoard({
  board: byId('board', HTMLElement),
  label: byId('board-label', HTMLElement),
  code: byId('code', HTMLElement),
  copy: byId('copy', HTMLButtonElement),
  copyLabel: byId('copy-label', HTMLElement)
})

function renderSnippet(): void {
  const { format, title, display, minHeight, xapiOrigin } = options.read()
  const tokens = buildSnippet({
    site: SITE_ORIGIN,
    path: FORMATS[format].path,
    src: src ?? EXAMPLE.src,
    title: title || (src ? titleFromUrl(src) || FALLBACK_TITLE : EXAMPLE.title),
    display,
    minHeight,
    xapiOrigin
  })
  board.show(tokens, { example: src === null })
}

function loadPreview(): void {
  if (src) preview.load(embedUrl(PLAYER_URL, src, displayFlags(options.read().display)))
}

initPackageForm(
  {
    form: byId('package-form', HTMLFormElement),
    input: byId('src', HTMLInputElement),
    samples: allOf(document, '[data-sample]', HTMLButtonElement)
  },
  {
    // A link to this page can carry a package, `?src=…`. It fills the field and waits for a press,
    // because a package runs its own scripts in the preview.
    prefill: new URLSearchParams(location.search).get('src'),
    onPackage(value) {
      src = value
      renderSnippet()
      loadPreview()
      const motion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      stage.scrollIntoView({ behavior: motion, block: 'start' })
    }
  }
)

initThemeToggle(byId('theme-toggle', HTMLButtonElement))
renderSnippet()
