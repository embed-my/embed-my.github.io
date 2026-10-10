import '@missing-elements/h5p-offline-player'
import '@missing-elements/h5p-embed/embed.css'
import { startEmbed } from '@missing-elements/h5p-embed/embed.js'
import libraries from '@missing-elements/h5p-libraries/libraries.h5p?url'
import { runtime } from '@missing-elements/h5p-runtime'

/**
 * The player page, `/h5p`: `@missing-elements/h5p-embed`'s embed page, built by Vite so the
 * player, the H5P runtime (GPL-3.0, a package of its own) and the library pack are emitted as
 * hashed assets here. Everything else is the package's: the query string, the resizer protocol
 * upward, the `report` and `error` messages the website's check list reads, and the xAPI relay.
 *
 *   /h5p?src=<package url>[&frame][&copyright][&export][&icon][&reporting][&fullscreen=off]
 *       [&xapi=<parent origin>][&activity-id=<IRI>][&custom-css=<stylesheet url>]
 *       [&libraries=pack|hub|<url> …|none][&preload=auto]
 *
 * Options, as this origin needs them:
 * - `defaultLibraries: 'pack'`: an export without its libraries (H5P.com, h5p.org) takes them from
 *   the pack served here, then from the H5P hub for a type the pack lacks. Snippets have never
 *   carried `&libraries=`, so this keeps them playing such exports.
 * - `packages` left out: a package from any host plays, which a public tool needs.
 * - `askInOwnFrame: false`: framed, the page never waited for a click, and nothing on this origin
 *   frames it except the browser tests.
 */
startEmbed({ librariesPack: libraries, defaultLibraries: 'pack', runtime, askInOwnFrame: false })
