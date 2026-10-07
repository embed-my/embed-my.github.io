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

The preview frames the hosted player at `h5p-offline-player.vercel.app`. To try a local player instead, put
`VITE_PLAYER_URL=http://localhost:5173/embed` in `.env.local`; Vite then serves this site on the next free port.

## Where things are

| Path | What it holds |
|---|---|
| `index.html` | The page's markup and its icon sprite |
| `src/main.ts` | Wires the page together; every element lookup is here |
| `src/config.ts` | The origin the snippet points at, the player the preview uses, the formats |
| `src/snippet.ts` | Builds the embed address and the snippet; touches no DOM |
| `src/resizer.ts` | Reads the H5P resizer messages the preview frame sends |
| `src/ui/` | One module per part of the page: package form, preview, options, snippet board, theme switch |
| `src/styles/` | `main.css` imports the fonts, the tokens, then one file per part of the page |
| `public/` | Copied into the build as it is: `CNAME`, `logo.svg` (the full logo) and `favicon.svg` (its mark alone, also the header logo) |

Tests sit next to the code they test. `snippet.test.ts` holds the example from the embedding guide word for word, so
change the two together. `page.test.ts` checks rules that live in `index.html`: the link field's pattern and the icon
sprite.

## Deploy

A push to `main` runs `.github/workflows/deploy.yml`: tests, build, then `dist/` goes to GitHub Pages. Pull requests
get the tests and the build only. Pages has to use **GitHub Actions** as its source (Settings → Pages → Build and
deployment); the custom domain is kept in those settings, and `public/CNAME` records it in the build.
