# embed-my.org

The Embed My website: one page that turns a link to an H5P package into an iframe snippet, with a live preview.
Guides for people embedding activities live in [embed-my/.github](https://github.com/embed-my/.github/tree/main/docs).

## Develop

Needs Node 22.12 or later and pnpm (its version is pinned in `package.json`).

```bash
pnpm install
pnpm dev         # dev server, http://localhost:5173
pnpm test        # unit tests (Vitest)
pnpm typecheck   # TypeScript, no output
pnpm build       # type-check, then build into dist/
pnpm preview     # serve dist/, http://localhost:4173
```

The preview frames this site's own player page, `/h5p`, so on the dev server it plays through the local build.
To frame another player instead, put its address in `VITE_PLAYER_URL` in `.env.local`. The player is the
`@missing-elements/h5p-offline-player` package; it names its worker and frame assets relative to its own module,
and Vite emits them into `dist/assets/` with everything else.

## Where things are

| Path | What it holds |
|---|---|
| `index.html` | The page's markup and its icon sprite |
| `h5p.html`, `src/h5p-page.ts` | The player page the snippet frames: the player alone, driven by the query string |
| `src/main.ts` | Wires the page together; every element lookup is here |
| `src/config.ts` | The origin the snippet points at, the page the preview frames, the formats |
| `src/snippet.ts` | Builds the embed address and the snippet; touches no DOM |
| `src/resizer.ts` | Reads the H5P resizer messages the preview frame sends |
| `src/ui/` | One module per part of the page: package form, preview, options, snippet board, theme switch |
| `src/styles/` | `main.css` imports the fonts, the tokens, then one file per part of the page |
| `public/` | Copied into the build as it is: `CNAME`, `logo.svg` (the full logo), `favicon.svg` (its mark alone, also the header logo), `h5p-resizer.js` (the sizing script the snippet names) |

Tests sit next to the code they test. `snippet.test.ts` holds the example from the embedding guide word for word, so
change the two together. `page.test.ts` checks rules that live in `index.html`: the link field's pattern and the icon
sprite.

## Deploy

A push to `main` runs `.github/workflows/deploy.yml`: tests, build, then `dist/` goes to GitHub Pages. Pull requests
get the tests and the build only. Pages has to use **GitHub Actions** as its source (Settings → Pages → Build and
deployment); the custom domain is kept in those settings, and `public/CNAME` records it in the build.
