# embed-my.github.io

The player origin of Embed My: what a snippet points at. The site people use to make a snippet is
[embed-my.org](https://embed-my.org/), in [embed-my/website](https://github.com/embed-my/website).

| Path | What it serves |
|---|---|
| `/h5p?src=<package url>` | The player page the snippet frames: the player alone, driven by the query string. Upward it speaks the resizer protocol, and posts one `report` on what it learnt about the package, or the `error` that stopped it |
| `/h5p-resizer.js` | The sizing script the snippet's second line names |
| `/build` | The build page: a source an AI chat wrote with the [h5p-author skill](https://github.com/missing-elements/h5p-offline-player/tree/main/skills/h5p-author) becomes a `.h5p` file, built in the browser, played on the page and downloaded from it. `/build#source=<base64url>` carries a source in the link |
| `/samples/*.h5p` | The three demo packages the site offers (CC0 and CC BY), and `quiz-without-libraries.h5p`, the quiz as H5P.com would export it, which the browser tests play |

It has no custom domain, on purpose. A GitHub Pages address has nothing to renew and nothing anyone
else can register, so a pasted snippet does not depend on a domain staying registered. It is also an origin apart from the site's: a package's scripts run here and not
where the snippet is written. GitHub's redirect from a Pages address to a custom domain carries no
CORS header, so a custom domain here would stop frames fetching the samples; keep `CNAME` out of `public/`.

## Develop

Needs Node 22.12 or later and pnpm (its version is pinned in `package.json`).

```bash
pnpm install
pnpm dev         # dev server, http://localhost:5173/h5p?src=http://localhost:5173/samples/quiz.h5p
                 # and the build page, http://localhost:5173/build
pnpm typecheck   # TypeScript, no output
pnpm build       # type-check, then build into dist/
pnpm preview     # serve dist/, http://localhost:4173
pnpm e2e         # browser tests against dist/ (build first; once per machine: pnpm exec playwright install chromium)
```

The page is [`@missing-elements/h5p-embed`](https://github.com/missing-elements/h5p-offline-player/tree/main/packages/embed#readme)'s
embed page (MIT): `src/h5p-page.ts` calls its `startEmbed()` with this origin's options, and the package does the
rest: the query string, the resizer protocol, the `report` and `error` messages the website reads, and the xAPI
relay. The sizing script is the package's `resizer.js`, copied to `/h5p-resizer.js` at build. The player is
`@missing-elements/h5p-offline-player` (MIT). The H5P runtime it loads inside the frame is
`@missing-elements/h5p-runtime` (GPL-3.0): `src/h5p-page.ts` hands its `runtime` export to `startEmbed()`. Both name their files relative to their own modules, and
Vite emits them into `dist/assets/` with everything else; the runtime's licence and notice are emitted beside
them as `assets/runtime-LICENSE.txt` and `assets/runtime-NOTICE.txt`.

In a snippet, the frame sits in another site's page, whose storage is that site's own, and a package plays as it is.
Opened on its own, `/h5p` would put a package from another site in this origin's own storage, so since h5p-embed 0.4
and player 0.7 it plays it `untrusted`: as data, with none of the package's own code and its libraries from the pack.
Since player 0.8 and h5p-runtime 0.2 its content is also checked against each library's `semantics.json` before it
is shown, as the H5P CMS plugins check an upload: text keeps only the tags its field allows, and anything the
semantics do not name is dropped. Only a package that cannot play without its own copy of a library waits for a
click that names its host.

A package exported without its libraries, as H5P.com and h5p.org export them, gets them from the pack of
`@missing-elements/h5p-libraries`: the H5P hub's libraries for every content type it serves, one part per library,
which Vite emits as hashed assets and the page uses by default (`pack`, `defaultLibraries: 'pack'`). A package
downloads only the parts it needs, each checked against the pack's SHA-256 and kept in the browser for every package
that uses it; the build page reads the same parts. Nothing is behind the pack: since player 0.6 there is no H5P hub
fallback, so a content type the pack lacks is reported as missing libraries, and the page makes no request to a third
party by itself. The frame upgrades content written for an older minor version of a library to the one the pack
serves, with that library's `upgrades.js`, so a package that carries older libraries plays the pack's newer ones
(player 0.10; `&refresh-libraries=off` plays them as exported), and the `report` names them in
`libraryBundle.refreshed`. Content made for a newer minor version than the pack has plays at the pack's newest older
one, listed in the report's `downgradedLibraries` (player 1.2; `&downgrade-libraries=off` refuses it instead).

H5P's own buttons and dialogs, such as Fullscreen and Rights of use, are in the package's own language,
`defaultLanguage` (or `language`) in its `h5p.json`, so they match the content's text (player 1.1.0). The frame document
takes the same language, for screen readers. `&lang=<tag>` on the address, `de` or `pt-BR`, is the language for a
package that names none. The translations come from the runtime (runtime 0.1.2): more than fifty languages, from
Moodle's language packs, in a script Vite emits as `assets/l10n-*.js` that the frame fetches only for a language other
than English. The pack's licence list is emitted as
`assets/libraries-LICENSES.txt`.
`&libraries=` in the query string overrides the sources; `&libraries=none` turns them off.

| Path | What it holds |
|---|---|
| `h5p.html`, `src/h5p-page.ts` | The player page: `@missing-elements/h5p-embed`'s embed page, started with this origin's options |
| `build.html`, `src/build-page.ts`, `src/build-source.ts`, `src/build.css` | The build page: the page's wiring, and what it does with a source with no DOM (the link's fragment, the files a source names, the text for the chat) |
| `public/samples/` | The sample packages, copied into the build as they are |
| `e2e/`, `playwright.config.ts` | The browser tests: the page plays a sample, with and without its libraries, a framing page gets its height and the report, a bad link gets the error; the build page builds, plays and downloads a pasted source, one from a link and one with a file of its own, and lists a source's problems for the chat |
| `vite.config.ts` | The page, its Content-Security-Policy, `h5p-resizer.js` and the licence files, copied from their packages |

The page gets a `Content-Security-Policy` in a `<meta>` tag at build: GitHub Pages sends no headers, so the tag is
the only policy there is. The dev server gets none, because it injects scripts and styles of its own. The browser
tests fail on any violation.

## The build page

`/build` is for a chat that wrote an h5p-author source but cannot build it. ChatGPT's sandbox
reaches npm only through OpenAI's own mirror, which was reported refusing every install from July
2026 (503, then 404), and the public registry not at all, so `npx @missing-elements/h5p-author`
does not run there. The skill then hands over the source and
this page's address. The page builds with `@missing-elements/h5p-author/browser`, the same build as
the command's: every problem listed at once by its path, ready to copy back into the chat. Its
libraries are `@missing-elements/h5p-libraries/install`'s pack, which Vite emits here one part per
library, so a build fetches only the parts its package needs and carries the editor libraries an
H5P site's upload check asks for. The package then plays in the player on the page, and downloads
from it.

Nothing leaves the browser. A link can carry the source in its fragment, which no server sees:
`/build#source=<base64url>`, the bytes being the source's JSON as UTF-8, or that JSON compressed
with raw deflate (Node's `zlib.deflateRawSync`, Python's `zlib.compressobj(wbits=-15)`) to keep
the link short. A linked source is built at once, unless it names files of its own: those only the
person can choose, matched by name, and the page waits for them. A source that names a picture by
web address gets it only where that host allows CORS.

The page's address has no "H5P" in it, as H5P Group's trademark policy asks of a name that does
not say who made it; its heading uses the word descriptively.

## Deploy

A push to `main` runs `.github/workflows/deploy.yml`: build, browser tests, then `dist/` goes to GitHub Pages.
Pages has to use **GitHub Actions** as its source (Settings → Pages → Build and deployment) and must have **no
custom domain** set. Actions are pinned to commits; Dependabot keeps the pins and the packages current.

Deploy this origin before the website when both change: the site's preview frames `/h5p` here, and its policy
allows only this origin as a frame.
