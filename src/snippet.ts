/**
 * The embed snippet: the embed page's address, and the HTML a visitor pastes into their site.
 * Nothing here touches the page.
 */

/** What the frame shows around the activity, by what a visitor sees: the buttons of H5P's own bar under it. */
export interface DisplayOptions {
  /** The bar's Rights of use button: the licences recorded in the package and its media. */
  copyright: boolean
  /** The bar's Reuse button, which lets visitors download the package. */
  reuse: boolean
}

/**
 * The display options as the player's own parameters, which are bare flags: `frame`, `copyright`,
 * `export`. The bar (`frame`) is there to hold the buttons, so it shows with either and not without.
 */
export function displayFlags({ copyright, reuse }: DisplayOptions): string[] {
  if (!copyright && !reuse) return []
  const flags = ['frame']
  if (copyright) flags.push('copyright')
  if (reuse) flags.push('export')
  return flags
}

/**
 * A value for a query string, encoded no further than a parser needs: `:` and `/` are legal there
 * and left as they are, so `src=https://…` stays readable. `&`, `#`, `+`, `%` and spaces are still
 * encoded, so a package link with its own query string arrives whole.
 */
const encodeQueryValue = (value: string) => encodeURIComponent(value).replace(/%3A/gi, ':').replace(/%2F/gi, '/')

/**
 * An embed page's address for a package: `src` first, then the bare flags, then named values.
 * Written out by hand, because URLSearchParams would turn a bare flag into `frame=`.
 */
export function embedUrl(
  page: string,
  src: string,
  flags: readonly string[] = [],
  values: Readonly<Record<string, string>> = {}
): string {
  const params = [
    `src=${encodeQueryValue(src)}`,
    ...flags,
    ...Object.entries(values).map(([name, value]) => `${name}=${encodeQueryValue(value)}`)
  ]
  return `${page}?${params.join('&')}`
}

/**
 * The origin of an http(s) address, or `null` for anything else. The player posts xAPI statements
 * to exactly this origin, so a full page address is cut down to it.
 */
export function originOf(value: string): string | null {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null
  } catch {
    return null
  }
}

/** A title made from a package's file name, `…/week-1-quiz.h5p` → `Week 1 quiz`; `''` when there is none. */
export function titleFromUrl(src: string): string {
  let name: string
  try {
    name = decodeURIComponent(new URL(src).pathname.split('/').pop() ?? '')
  } catch {
    return ''
  }
  const words = name
    .replace(/\.h5p$/i, '')
    .replace(/[-_+.\s]+/g, ' ')
    .trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * A run of the snippet's text and what it is, so the page can colour it: markup (`tag`), an
 * attribute's name (`attr`) or value (`value`), or the embed address (`url`). The text is exactly
 * what gets pasted, values escaped, so the runs joined are the snippet.
 */
export interface Token {
  kind: 'tag' | 'attr' | 'value' | 'url'
  text: string
}

/** Everything a snippet says. */
export interface SnippetRequest {
  /** The origin the snippet points at. */
  site: string
  /** The embed page's path there, by format: `/h5p`. */
  path: string
  /** The package's address. */
  src: string
  /** The frame's accessible name. */
  title: string
  display: DisplayOptions
  /** The frame's height in CSS pixels, for a site that strips the sizing script. */
  minHeight: number
  /** The origin the frame posts xAPI statements to, or `null` for none. */
  xapiOrigin: string | null
}

const ENTITIES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
const escapeAttribute = (value: string) => value.replace(/[&<>"]/g, (char) => ENTITIES[char] ?? char)

/** The snippet as tokens: the iframe, and the sizing script that keeps it the height of the activity. */
export function buildSnippet({ site, path, src, title, display, minHeight, xapiOrigin }: SnippetRequest): Token[] {
  const url = embedUrl(site + path, src, displayFlags(display), xapiOrigin ? { xapi: xapiOrigin } : {})
  const tag = (text: string): Token => ({ kind: 'tag', text })
  const attribute = (name: string, value: string, kind: 'value' | 'url' = 'value'): Token[] => [
    { kind: 'attr', text: name },
    tag('="'),
    { kind, text: escapeAttribute(value) },
    tag('"')
  ]
  const newline = tag('\n  ')
  return [
    tag('<iframe\n  '),
    ...attribute('src', url, 'url'),
    newline,
    ...attribute('title', title),
    newline,
    ...attribute('loading', 'lazy'),
    newline,
    ...attribute('allow', 'fullscreen'),
    newline,
    ...attribute('style', `width: 100%; min-height: ${minHeight}px; border: 0`),
    tag('\n></iframe>\n<script '),
    ...attribute('src', `${site}/h5p-resizer.js`),
    tag('></script>')
  ]
}

export const snippetText = (tokens: readonly Token[]): string => tokens.map((token) => token.text).join('')
