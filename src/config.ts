/**
 * Where the snippets point: the origin that serves the embed page (`/h5p`) and the sizing script
 * (`/resizer.js`). Fixed, so a snippet copied from a local build works on a visitor's page too.
 */
export const SITE_ORIGIN = 'https://embed-my.org'

/**
 * The page the preview frames: the hosted h5p-offline-player for now, which takes the same
 * parameters `${SITE_ORIGIN}/h5p` will. Once the player is deployed on this site, this becomes that
 * page. To try a local player, set `VITE_PLAYER_URL` in `.env.local`.
 */
export const PLAYER_URL = import.meta.env.VITE_PLAYER_URL || 'https://h5p-offline-player.vercel.app/embed'

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
