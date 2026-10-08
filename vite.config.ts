import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

/*
 * The player origin, embed-my.github.io: the page the snippet frames (`/h5p`), the sizing script
 * (`/h5p-resizer.js`), the sample packages, and a landing page that says where the site is.
 * Nothing here has a custom domain, on purpose: a GitHub Pages address is one the project keeps
 * for as long as it exists, so every snippet ever pasted keeps working, and the pages a package
 * runs on are apart from the site's own origin.
 */

type Policy = Record<string, string[]>

/** The landing and 404 pages: their own stylesheet and nothing else. */
const SITE_POLICY: Policy = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
}

/**
 * The player page: its own scripts and workers, a package from any host, and the content's
 * frame, which the worker serves from this origin. The content itself runs in that frame under
 * the worker's own per-response policy, not this one.
 */
const PLAYER_POLICY: Policy = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': ['*', 'data:', 'blob:'],
  'worker-src': ["'self'", 'blob:'],
  'frame-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"]
}

/**
 * Writes each page's Content-Security-Policy into a <meta> tag at build. GitHub Pages sends no
 * headers of its own, so the tag is the only policy the pages get. Inline scripts are allowed by
 * hash rather than by 'unsafe-inline'. Build only: the dev server injects scripts and styles of
 * its own that no fixed policy covers.
 */
function cspMeta(): Plugin {
  return {
    name: 'embed-my:csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, { filename }) {
        const policy = structuredClone(filename.endsWith('h5p.html') ? PLAYER_POLICY : SITE_POLICY)
        const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1])
        for (const source of inline) {
          policy['script-src'].push(`'sha256-${createHash('sha256').update(source).digest('base64')}'`)
        }
        const content = Object.entries(policy)
          .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
          .join('; ')
        return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content }, injectTo: 'head-prepend' }]
      }
    }
  }
}

/**
 * The runtime's licence and notice, served beside its files. The runtime is GPL-3.0 and asks that
 * the two travel with copies of it; Vite emits its scripts and fonts as hashed assets and would
 * leave the text files behind. The landing page links to them.
 */
function runtimeNotices(): Plugin {
  const dist = new URL('./node_modules/@missing-elements/h5p-runtime/dist/', import.meta.url)
  return {
    name: 'embed-my:runtime-notices',
    apply: 'build',
    generateBundle() {
      for (const file of ['LICENSE.txt', 'NOTICE.txt']) {
        this.emitFile({ type: 'asset', fileName: `assets/runtime-${file}`, source: readFileSync(new URL(file, dist)) })
      }
    }
  }
}

export default defineConfig({
  plugins: [cspMeta(), runtimeNotices()],
  build: {
    rollupOptions: {
      input: { main: 'index.html', h5p: 'h5p.html', 404: '404.html' }
    }
  }
})
