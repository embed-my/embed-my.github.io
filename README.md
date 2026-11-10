# embed-my.github.io

The player origin of Embed My: what a snippet points at. The site people use to make a snippet is
[embed-my.org](https://embed-my.org/), in [embed-my/website](https://github.com/embed-my/website).

| Path | What it serves |
|---|---|
| `/h5p?src=<package url>` | The player page the snippet frames: the player alone, driven by the query string. Upward it speaks the resizer protocol, and posts one `report` on what it learnt about the package, or the `error` that stopped it |
| `/h5p-resizer.js` | The sizing script the snippet's second line names |
| `/build` | A redirect to the build page, which moved to [missing-elements.github.io/h5p/build/](https://missing-elements.github.io/h5p/build/) (#17), keeping the link's `#source=` (see *The build page moved*) |
| `/bundles/` | For a chat that runs Node and fetches files but reaches no npm registry: the build tool as one file, a bundle of libraries per content type, every library part on its own, their licences and an `index.json`. Kept until the next pack release (see *The bundles*) |
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
that uses it. Nothing is behind the pack: since player 0.6 there is no H5P hub
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
| `build.html` | `/build`, the redirect to the build page's new address, which keeps the link's fragment when JavaScript runs |
| `public/samples/` | The sample packages, copied into the build as they are |
| `e2e/`, `playwright.config.ts` | The browser tests: the page plays a sample, with and without its libraries, a framing page gets its height and the report, a bad link gets the error; `/build` sends a visit on to the build page's new address, with its fragment when JavaScript runs, and without it when it does not; `/bundles/` lists and serves every bundle and part, and its tool and a bundle build a quiz in an empty folder, a part named by the build fetched for math |
| `vite.config.ts` | The page, its Content-Security-Policy, `h5p-resizer.js` and the licence files, copied from their packages, and `/bundles/`, written from them |

The page gets a `Content-Security-Policy` in a `<meta>` tag at build: GitHub Pages sends no headers, so the tag is
the only policy there is. The dev server gets none, because it injects scripts and styles of its own. The browser
tests fail on any violation.

## The build page moved

`/build` was the build page: a source an AI chat wrote with the
[h5p-author skill](https://github.com/missing-elements/h5p-offline-player/tree/main/skills/h5p-author)
became a `.h5p` file there, built in the browser, played and downloaded. It moved on 2026-11-10 to
[missing-elements.github.io/h5p/build/](https://missing-elements.github.io/h5p/build/), the
Missing Elements site, in that site's own look (#17); its code and tests are there now. `/build`
here sends a visit on to it with the address's fragment, so a link a chat wrote before,
`/build#source=<base64url>`, still builds its source. Without JavaScript the page refreshes to the
new address, which can't carry the fragment, and links to it.

## The bundles

`/bundles/` is for a chat that runs Node and can fetch a file but reaches no npm registry, as
ChatGPT's sandbox can: its download tool takes a file the browsing tool has opened. There the
h5p-author skill fetches two files, the build tool and the bundle of the source's content type,
unzips the bundle and builds with `node h5p-author.mjs build source.json course.h5p --libraries
parts`. The chat then sees every problem itself, fixes its source and hands over the package; the
build page stays for a chat that can fetch nothing.

| Path | What it holds |
|---|---|
| `/bundles/<type>.zip` | One per content type in the pack, `H5P.QuestionSet.zip`: `parts/`, the pack's whole index with the parts a build of that type can read, and `libraries.txt`. Written by `h5p-author bundle --all` |
| `/bundles/parts/<part>.h5p` | Every part of the pack under its own name, and `parts/index.json`. No bundle holds an addon: a source whose text calls for one, H5P.MathDisplay for math, stops the build, which names the part to fetch from here |
| `/bundles/h5p-author.mjs` | The author package's command line as one file, everything it imports bundled in by Vite, so it runs with nothing installed. It needs `--libraries`, and has no `--version`: the npm package's own files are not with it |
| `/bundles/index.json` | The author package's and the pack's versions, and each bundle's file, size and number of parts |
| `/bundles/libraries.txt` | The pack's licence list, which asks to travel with its libraries |

`vite.config.ts` writes them after the pages, from the packages the lockfile pins, so a
Dependabot update of `@missing-elements/h5p-author` or `@missing-elements/h5p-libraries` moves
them, and they live in `dist/` only, not in git: 113 MB with pack 1.1.0, well within GitHub Pages'
1 GB. A question type's bundle is about 1 MB, a Question Set's 2.6 MB, a container's up to 8.4 MB.

They moved with the build page: missing-elements.github.io serves the same files at
[`/h5p/bundles/`](https://missing-elements.github.io/h5p/bundles/index.json), and the skill fetches
them from there. They stay here only for copies of the skill installed before the move, until the
next pack release; then `bundles()` goes, with `e2e/bundles.spec.ts` and the
`@missing-elements/h5p-author` dependency.

## Deploy

A push to `main` runs `.github/workflows/deploy.yml`: build, browser tests, then `dist/` goes to GitHub Pages.
Pages has to use **GitHub Actions** as its source (Settings → Pages → Build and deployment) and must have **no
custom domain** set. Actions are pinned to commits; Dependabot keeps the pins and the packages current.

Deploy this origin before the website when both change: the site's preview frames `/h5p` here, and its policy
allows only this origin as a frame.
