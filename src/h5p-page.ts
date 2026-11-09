import '@missing-elements/h5p-offline-player'
import '@missing-elements/h5p-embed/embed.css'
import { startEmbed } from '@missing-elements/h5p-embed/embed.js'
import { pack } from '@missing-elements/h5p-libraries'
import { runtime } from '@missing-elements/h5p-runtime'

/**
 * The player page, `/h5p`: `@missing-elements/h5p-embed`'s embed page, built by Vite so the
 * player, the H5P runtime (GPL-3.0, a package of its own) and the library pack are emitted as
 * hashed assets here. Everything else is the package's: the query string, the resizer protocol
 * upward, the `report` and `error` messages the website's check list reads, and the xAPI relay.
 *
 *   /h5p?src=<package url>[&frame][&copyright][&export][&icon][&reporting][&fullscreen=off]
 *       [&xapi=<parent origin>][&activity-id=<IRI>][&custom-css=<stylesheet url>][&lang=<language tag>]
 *       [&libraries=pack|<url> …|none][&refresh-libraries=off][&downgrade-libraries=off][&preload=auto]
 *
 * Options, as this origin needs them:
 * - `pack`: the library pack's `pack` export, one part per library, which Vite emits here. A
 *   package downloads only the parts it needs, each checked against the pack's SHA-256 and kept in
 *   the browser for every package that uses it, where the whole `libraries.h5p` (15.5 MB since
 *   pack 1.1.0, 1.8 MB of it libraries the player never reads) was downloaded at the first package
 *   that lacked anything. A package that carries an older version of a library plays the pack's
 *   newer one (player 0.10), unless the address says `&refresh-libraries=off`. The build page reads
 *   the same parts.
 * - `defaultLibraries: 'pack'`: an export without its libraries (H5P.com, h5p.org) takes them from
 *   that pack, and from nowhere else: the player has no hub fallback since 0.6, so the page asks no
 *   third party for anything. Snippets have never carried `&libraries=`, so this keeps them playing
 *   such exports.
 * - `packages` left out: a package from any host plays, which a public tool needs.
 * - `askInOwnFrame: false`: a page of this origin that frames it gets the package as it is, not
 *   `untrusted`; nothing on this origin frames it except the browser tests. Framed by another site,
 *   the storage is that site's own, and a package always plays as it is. Opened on its own, a
 *   package from another site plays `untrusted` (h5p-embed 0.4): none of its own code runs, and
 *   since the runtime's 0.2 its content is checked against its libraries' semantics first.
 */
startEmbed({ pack, defaultLibraries: 'pack', runtime, askInOwnFrame: false })
