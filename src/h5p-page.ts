import '@missing-elements/h5p-offline-player'
import libraries from '@missing-elements/h5p-libraries/libraries.h5p?url'
import { runtime } from '@missing-elements/h5p-runtime'

/**
 * The player page, `/h5p`: the player alone, driven by the query string, for the iframe the
 * snippet writes. After the player's own demo page (apps/demo/demo/embed-page.js, MIT).
 *
 *   /h5p?src=<package url>[&frame][&copyright][&export][&icon][&reporting][&fullscreen=off]
 *       [&xapi=<parent origin>][&activity-id=<IRI>][&custom-css=<stylesheet url>]
 *       [&libraries=<sources>][&preload=auto]
 *
 * Upward it speaks H5P's own resizer protocol, the `hello` / `resize` exchange h5p.org's embed
 * code uses, so `/h5p-resizer.js` on the embedding page sizes the frame, and a page that already
 * has h5p.org's own `h5p-resizer.js` needs nothing more. Once the content is up it posts one
 * `report` with what the player learnt about the package (see `report` below), and a load that
 * fails posts its `error`; both carry nothing the embedding page did not already hand over.
 * xAPI statements are relayed to the parent only when `xapi=` names its origin, and are posted
 * to that origin only.
 */

interface PlayerElement extends HTMLElement {
  state: string
  runtime: typeof runtime | null
}

/** What the player says about the package once it plays; the `ready` event's detail, see its README. */
interface ReadyDetail {
  source: { type: 'range-http' | 'chunked' | 'file'; size: number | null } | null
  metadata: {
    title?: string
    license?: string
    licenseVersion?: string
    authors?: Array<{ name: string; role?: string }>
    mainLibrary?: string
  } | null
  libraryBundle: { url: string; origin: string; fromCache: boolean } | null
}

/** The element with this id; fails loudly when the markup and this script drift apart. */
const byId = (id: string): HTMLElement => {
  const element = document.getElementById(id)
  if (!element) throw new Error(`#${id} is missing from the page`)
  return element
}

const params = new URLSearchParams(location.search)
const player = byId('player') as PlayerElement
// The H5P runtime the frame loads is a package of its own (GPL-3.0, apart from the MIT player);
// the element only names its files, and has to be told where they are before a package is set.
// Vite emits them as hashed assets beside everything else, and `runtime` carries those addresses.
player.runtime = runtime
const notice = byId('notice')
const loader = byId('loader')
const framed = window.parent !== window

/* ------------------------------------------------------------------ notices */

const say = (text: string, kind = '', link: { href: string; text: string } | null = null) => {
  notice.replaceChildren()
  if (text) {
    notice.append(text)
    if (link) {
      const anchor = document.createElement('a')
      anchor.href = link.href
      anchor.target = '_top'
      anchor.rel = 'noopener'
      anchor.textContent = link.text
      notice.append(' ', anchor, '.')
    }
  }
  notice.className = `notice ${kind}`.trim()
  notice.hidden = !text
  requestAnimationFrame(announce)
}

/* ------------------------------------------------------------------ sizing, upward */

/** The parent hears about the height in the shape h5p-resizer.js expects. Nothing in it is secret. */
const post = (message: object, target = '*') => {
  if (framed) window.parent.postMessage(message, target)
}

// The body's own height rather than the document's scrollHeight: the latter can never report
// less than the frame, so a shrink would never be seen.
const contentHeight = () => Math.ceil(document.body.getBoundingClientRect().height)

const announce = () => post({ context: 'h5p', action: 'resize', scrollHeight: contentHeight() })

window.addEventListener('message', (event) => {
  if (event.source !== window.parent || !event.data || event.data.context !== 'h5p') return
  switch (event.data.action) {
    case 'ready':
      // The resizer script announces itself once it is on the page; it expects a `hello` back.
      post({ context: 'h5p', action: 'hello' })
      break
    case 'hello':
    case 'resizePrepared':
      announce()
      break
  }
})

post({ context: 'h5p', action: 'hello' })

// The element dispatches `resize` before it applies the height to itself; measure after layout.
player.addEventListener('resize', () => requestAnimationFrame(announce))
player.addEventListener('ready', () => requestAnimationFrame(announce))

/* ------------------------------------------------------------------ the report, upward */

/**
 * What the player learnt about the package, for the embedding page to show: whether the host
 * streamed it or made the browser download it whole (`source.type`), how big it is, what it says
 * it is (`metadata`), where libraries it did not carry came from (`libraryBundle`, `null` when it
 * carried its own), and how long it took here. Posted once, when the content is up, in the shape
 *
 *   { context: 'h5p-offline-player', action: 'report', source, metadata, libraryBundle, elapsedMs }
 *
 * and to any parent, like the heights: the parent named the package, and the manifest's strings
 * are the package's own to tell. A parent treats them as text. A load that fails before the
 * content is up posts `{ context: 'h5p-offline-player', action: 'error', code, message }` instead.
 */
let startedAt = 0

player.addEventListener('ready', (event) => {
  const { source, metadata, libraryBundle } = (event as CustomEvent<ReadyDetail>).detail
  post({
    context: 'h5p-offline-player',
    action: 'report',
    source: source && { type: source.type, size: source.size },
    metadata: metadata && {
      title: metadata.title,
      license: metadata.license,
      licenseVersion: metadata.licenseVersion,
      authors: metadata.authors?.map(({ name }) => name),
      mainLibrary: metadata.mainLibrary
    },
    libraryBundle,
    elapsedMs: Math.round(performance.now() - startedAt)
  })
})

/* ------------------------------------------------------------------ xAPI, relayed on request */

/** An origin, or nothing: the parameter has to be exactly what `event.origin` will read. */
const originOf = (value: string | null): string | null => {
  if (!value) return null
  try {
    const origin = new URL(value).origin
    return origin !== 'null' && origin === value.replace(/\/$/, '') ? origin : null
  } catch {
    return null
  }
}

const relayTo = originOf(params.get('xapi'))
if (relayTo && framed) {
  for (const type of ['xapi', 'finished']) {
    player.addEventListener(type, (event) => {
      post({ context: 'h5p-offline-player', action: type, ...(event as CustomEvent<object>).detail }, relayTo)
    })
  }
}

/* ------------------------------------------------------------------ errors */

player.addEventListener('error', (event) => {
  const { code, message } = (event as unknown as CustomEvent<{ code: string; message?: string }>).detail
  if (code === 'no-worker' && framed) {
    // Detected, not sniffed: an in-app browser, or a page that is not https, may give a frame no
    // Service Worker, and the player cannot run without one.
    say("This browser does not run the player inside another site's page.", 'error', {
      href: location.href,
      text: 'Open it on its own'
    })
    post({ context: 'h5p-offline-player', action: 'error', code, message })
    return
  }
  // Once the content is up, a runtime error inside it is the content's business: it keeps
  // running, and a red notice over a working video would say otherwise.
  if (code === 'runtime' && player.state === 'ready') {
    console.warn(`h5p-player: the content reported an error and kept running: ${message}`)
    return
  }
  say(message || code, 'error')
  post({ context: 'h5p-offline-player', action: 'error', code, message })
})

player.addEventListener('statechange', (event) => {
  const { state } = (event as CustomEvent<{ state: string }>).detail
  if (state !== 'error') say('')
  // Shown from the HTML on, until the content is up or the load has failed.
  loader.hidden = state === 'ready' || state === 'error' || state === 'idle'
  requestAnimationFrame(announce)
})

/* ------------------------------------------------------------------ load */

/** The host of a package on another site, or `null` for this site's own and for what is not a URL. */
const foreignHost = (value: string): string | null => {
  try {
    const url = new URL(value, location.href)
    // A `data:` URL has no host and an opaque origin: name its scheme, so it still waits.
    return url.origin === location.origin ? null : url.host || url.protocol
  } catch {
    return null
  }
}

/**
 * The element's display options, by their attribute names, for the embedding page to ask for:
 * `&frame&copyright&export` shows H5P's bar with those buttons, `&fullscreen=off` takes that one
 * away, `&activity-id=` names the statements' object and `&custom-css=` restyles the content to
 * the embedding site's taste. Not `custom-js`, `embed-code` or `user`: a script is a capability
 * on this origin that a link should not hand out, the embed is the embed, and a learner's name
 * has no place in a URL.
 */
const applyOptions = () => {
  for (const name of ['frame', 'copyright', 'export', 'icon', 'reporting']) {
    if (params.has(name) && params.get(name) !== 'off') player.setAttribute(name, '')
  }
  if (params.get('fullscreen') === 'off') player.setAttribute('fullscreen', 'off')
  for (const name of ['activity-id', 'custom-css']) {
    const value = params.get(name)?.trim()
    if (value) player.setAttribute(name, value)
  }
}

/**
 * Where a package that ships without its libraries gets them. Exports from H5P.com and h5p.org
 * routinely carry `content/` and nothing else, so without this they would be refused. The bundle
 * is the H5P hub's libraries for every content type it serves, served from this origin (emitted
 * by Vite beside the player's files; its licences are `assets/libraries-LICENSES.txt`); the hub
 * itself is asked only for a type the bundle lacks, which is the one request to a third party the
 * page can make on its own. `&libraries=` overrides, `&libraries=none` turns it off.
 */
const DEFAULT_LIBRARIES = `${libraries} hub`

const start = (value: string) => {
  const sources = params.get('libraries')?.trim() ?? DEFAULT_LIBRARIES
  if (sources && sources !== 'none') player.setAttribute('libraries', sources)
  if (params.get('preload') === 'auto') player.setAttribute('preload', 'auto')
  applyOptions()
  startedAt = performance.now()
  player.setAttribute('src', value)
}

/*
 * A package's scripts run with the storage of the origin they play on. Framed by another site,
 * that storage is partitioned by the embedding site, so a package can only reach what was played
 * under that site's own embeds. Opened on its own, this page shares the origin's storage with the
 * site, so a link to it with a package from elsewhere waits for a click. Framed by this site's
 * own preview it does not: the visitor pressed Preview for exactly this package.
 */
const src = params.get('src')?.trim() ?? ''
const host = src && !framed ? foreignHost(src) : null
if (!src) {
  loader.hidden = true
  say('No package given. Add ?src=<url of a .h5p file> to the address.', 'error')
} else if (host) {
  loader.hidden = true
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Open the package'
  button.addEventListener('click', () => {
    say('')
    loader.hidden = false
    start(src)
  })
  say(
    `This link opens a package from ${host}. A package runs its own scripts on this site, and they ` +
      'can read what other packages saved in this browser. Open it only if you trust that site.'
  )
  notice.append(' ', button)
} else {
  start(src)
}
