# embed-my.github.io

The player origin of Embed My: what a snippet points at. The site people use to make a snippet is
[embed-my.org](https://embed-my.org/), in [embed-my/website](https://github.com/embed-my/website).

| Path | What it serves |
|---|---|
| `/h5p?src=<package url>` | The player page the snippet frames: the player alone, driven by the query string. Upward it speaks the resizer protocol, and posts one `report` on what it learnt about the package, or the `error` that stopped it |
| `/h5p-resizer.js` | The sizing script the snippet's second line names |
| `/samples/*.h5p` | The three demo packages the site offers (CC0 and CC BY), and `quiz-without-libraries.h5p`, the quiz as H5P.com would export it, which the browser tests play |

It has no custom domain, on purpose. A GitHub Pages address stays with the project for as long as it
exists, with nothing to renew and nothing anyone else can register, so every snippet ever pasted
keeps working. It is also an origin apart from the site's: a package's scripts run here and not
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

The player is `@missing-elements/h5p-offline-player` (MIT). The H5P runtime it loads inside the frame is
`@missing-elements/h5p-runtime` (GPL-3.0), a package of its own since player 0.5: `src/h5p-page.ts` hands its
`runtime` export to the element before setting `src`. Both name their files relative to their own modules, and
Vite emits them into `dist/assets/` with everything else; the runtime's licence and notice are emitted beside
them as `assets/runtime-LICENSE.txt` and `assets/runtime-NOTICE.txt`.

A package exported without its libraries, as H5P.com and h5p.org export them, gets them from
`@missing-elements/h5p-libraries`: one `.h5p` with the H5P hub's libraries for every content type it serves, about
10 MB, which Vite emits as a hashed asset and the page names as the player's default `libraries` source, with the
hub (`api.h5p.org`) behind it for a type the bundle lacks. That hub request is the only request the page makes to a
third party by itself, and only then. The bundle's licence list is emitted as `assets/libraries-LICENSES.txt`.
`&libraries=` in the query string overrides the sources; `&libraries=none` turns them off.

| Path | What it holds |
|---|---|
| `h5p.html`, `src/h5p-page.ts`, `src/styles/h5p-page.css` | The player page: query string in; resizer protocol, report and xAPI relay out |
| `public/` | Copied into the build as it is: `h5p-resizer.js` and `samples/` |
| `e2e/`, `playwright.config.ts` | The browser tests: the page plays a sample, with and without its libraries, a framing page gets its height and the report, a bad link gets the error |
| `vite.config.ts` | The page, its Content-Security-Policy, and the licence files |

The page gets a `Content-Security-Policy` in a `<meta>` tag at build: GitHub Pages sends no headers, so the tag is
the only policy there is. The dev server gets none, because it injects scripts and styles of its own. The browser
tests fail on any violation.

## Deploy

A push to `main` runs `.github/workflows/deploy.yml`: build, browser tests, then `dist/` goes to GitHub Pages.
Pages has to use **GitHub Actions** as its source (Settings → Pages → Build and deployment) and must have **no
custom domain** set. Actions are pinned to commits; Dependabot keeps the pins and the packages current.

Deploy this origin before the website when both change: the site's preview frames `/h5p` here, and its policy
allows only this origin as a frame.
