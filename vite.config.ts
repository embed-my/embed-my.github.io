import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeBundles } from '@missing-elements/h5p-author'
import { build, defineConfig, type Plugin } from 'vite'

/*
 * The player origin, embed-my.github.io: the page the snippet frames (`/h5p`), the sizing script
 * (`/h5p-resizer.js`) and the sample packages.
 * Nothing here has a custom domain, on purpose: a GitHub Pages address is one the project keeps
 * for as long as it exists, so every snippet ever pasted keeps working, and the pages a package
 * runs on are apart from the site's own origin.
 */

type Policy = Record<string, string[]>

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
 * Writes the page's Content-Security-Policy into a <meta> tag at build. GitHub Pages sends no
 * headers of its own, so the tag is the only policy the page gets. Inline scripts are allowed by
 * hash rather than by 'unsafe-inline'. Build only: the dev server injects scripts and styles of
 * its own that no fixed policy covers.
 */
function cspMeta(): Plugin {
  return {
    name: 'embed-my:csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const policy = structuredClone(PLAYER_POLICY)
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
 * The files that are not modules, copied from their packages: `h5p-resizer.js`, the sizing script
 * the snippet's second line names, from `@missing-elements/h5p-embed`; and the runtime's licence and
 * notice and the library bundle's licence list, served beside their files. The runtime is GPL-3.0
 * and asks that the two travel with copies of it, and the bundle's libraries ask the same; Vite
 * emits scripts, fonts and the bundle as hashed assets and would leave the text files behind.
 */
function packageFiles(): Plugin {
  const runtime = new URL('./node_modules/@missing-elements/h5p-runtime/dist/', import.meta.url)
  const libraries = new URL('./node_modules/@missing-elements/h5p-libraries/', import.meta.url)
  const embed = new URL('./node_modules/@missing-elements/h5p-embed/site/', import.meta.url)
  return {
    name: 'embed-my:package-files',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'h5p-resizer.js', source: readFileSync(new URL('resizer.js', embed)) })
      for (const file of ['LICENSE.txt', 'NOTICE.txt']) {
        this.emitFile({ type: 'asset', fileName: `assets/runtime-${file}`, source: readFileSync(new URL(file, runtime)) })
      }
      // The library bundle's licences, each library's own, which ask to travel with its code.
      this.emitFile({ type: 'asset', fileName: 'assets/libraries-LICENSES.txt', source: readFileSync(new URL('libraries.txt', libraries)) })
    }
  }
}

/**
 * `/bundles/`, for a chat that runs Node and can fetch a file but reaches no npm registry, as in
 * ChatGPT's sandbox (#14). The h5p-author skill builds there from two files fetched from here: the
 * command line, and the bundle of the source's content type.
 *
 * - `<type>.zip`, one per content type in the pack (`h5p-author bundle --all`): `parts/`, the
 *   pack's whole index with the parts a build of that type can read, and `libraries.txt`.
 * - `parts/`: every part of the pack under its own name, and its index. A bundle holds no addon,
 *   so a build whose text calls for one stops and names its part, which the chat fetches from here.
 * - `h5p-author.mjs`: the command line as one file, everything it imports bundled in by Vite, so it
 *   runs with nothing installed. It takes `--libraries`: the npm package's pinned pack is not with
 *   it, nor the package.json `--version` reads, so `index.json` says the versions.
 * - `index.json`: the author's and the pack's versions, and each bundle's file, size and parts.
 * - `libraries.txt`: the pack's licence list, which asks to travel with its libraries.
 *
 * Written after the pages, from the packages the lockfile pins: `dist/` holds them, git does not.
 */
function bundles(): Plugin {
  const root = fileURLToPath(new URL('.', import.meta.url))
  const author = new URL('./node_modules/@missing-elements/h5p-author/', import.meta.url)
  const libraries = new URL('./node_modules/@missing-elements/h5p-libraries/', import.meta.url)
  const version = async (from: URL) => (JSON.parse(await readFile(new URL('package.json', from), 'utf8')) as { version: string }).version
  let outDir = ''
  return {
    name: 'embed-my:bundles',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    async writeBundle() {
      const folder = join(outDir, 'bundles')
      const written = await writeBundles(folder)
      const parts = join(folder, 'parts')
      await mkdir(parts)
      const index = JSON.parse(await readFile(new URL('parts/index.json', libraries), 'utf8')) as { libraries: Array<{ folder: string }> }
      for (const { folder: part } of index.libraries) await copyFile(new URL(`parts/${part}.h5p`, libraries), join(parts, `${part}.h5p`))
      await copyFile(new URL('parts/index.json', libraries), join(parts, 'index.json'))
      await copyFile(new URL('libraries.txt', libraries), join(folder, 'libraries.txt'))
      await build({
        configFile: false,
        root,
        logLevel: 'warn',
        publicDir: false,
        build: {
          ssr: fileURLToPath(new URL('bin/h5p-author.mjs', author)),
          outDir: folder,
          emptyOutDir: false,
          copyPublicDir: false,
          minify: false,
          reportCompressedSize: false,
          rolldownOptions: { output: { entryFileNames: 'h5p-author.mjs', format: 'es', codeSplitting: false } }
        },
        ssr: { noExternal: true, target: 'node' }
      })
      const listing = {
        author: await version(author),
        pack: await version(libraries),
        tool: 'h5p-author.mjs',
        parts: 'parts/',
        licences: 'libraries.txt',
        bundles: written.map(({ output, type, parts, size }) => {
          const [machineName, typeVersion] = type.split(' ')
          return { type: machineName, version: typeVersion, file: basename(output), size, parts: parts.length }
        })
      }
      await writeFile(join(folder, 'index.json'), `${JSON.stringify(listing, null, 2)}\n`)
    }
  }
}

export default defineConfig({
  plugins: [cspMeta(), packageFiles(), bundles()],
  build: {
    rollupOptions: {
      input: { h5p: 'h5p.html', build: 'build.html' }
    }
  }
})
