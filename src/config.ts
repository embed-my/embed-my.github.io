/**
 * Where the snippets point: the origin that serves the embed page (`/h5p`) and the sizing script
 * (`/h5p-resizer.js`). The GitHub Pages address rather than embed-my.org, on purpose: it belongs to
 * the project for as long as it is on GitHub, with nothing to renew and nothing anyone else can
 * register, so every snippet ever pasted outlives the domain. While the domain is ours, GitHub
 * forwards this address to it. Fixed, so a snippet copied from a local build works on a visitor's
 * page too.
 */
export const SITE_ORIGIN = 'https://embed-my.github.io'

/**
 * The page the preview frames: this site's own `/h5p`, on whatever origin the page is served
 * from, so the preview is the very page the snippet names and, on localhost, the local build of
 * it. `VITE_PLAYER_URL` in `.env.local` points it elsewhere. Tests run without a window, and
 * there only the snippet's address matters.
 */
export const PLAYER_URL =
  import.meta.env.VITE_PLAYER_URL ||
  (typeof location === 'undefined' ? `${SITE_ORIGIN}/h5p` : new URL('/h5p', location.origin).href)

/** The formats the cards offer, keyed by their radio button's value, with the path of each one's embed page. */
export const FORMATS = {
  h5p: { path: '/h5p' },
} as const

export type Format = keyof typeof FORMATS

export const isFormat = (value: string): value is Format => Object.hasOwn(FORMATS, value)

/** What the snippet shows before a link is pasted: the example from the embedding guide. */
export const EXAMPLE = {
  src: 'https://h5p-offline-player.vercel.app/demo/content/quiz.h5p',
  title: 'Sample quiz',
} as const

/** The frame title when none was typed and the file name gives none. */
export const FALLBACK_TITLE = 'Interactive activity'

/** How long the preview may stay silent before the page offers to open it on its own. */
export const PREVIEW_STALL_MS = 15_000
