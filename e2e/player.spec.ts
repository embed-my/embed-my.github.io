import { expect, test, type Page } from '@playwright/test'

/*
 * The player page in a real browser against the built files: it plays a package and speaks the
 * resizer protocol upward. The package is one of the origin's own samples, so nothing here leaves
 * the machine. Any Content-Security-Policy violation fails the test, because the policy is
 * written at build and only a browser checks it.
 */

const SAMPLE = '/samples/quiz.h5p'

/** Fails the test on any CSP report or uncaught error the page logs. */
function watchConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    if (message.type() === 'error' || /Content.Security.Policy/i.test(text)) problems.push(text)
  })
  page.on('pageerror', (error) => problems.push(error.message))
  return problems
}

/**
 * Collects every request that leaves the origin under test, and any for the whole library pack,
 * which this origin no longer serves. The pack's parts come from here and from nowhere else, so a
 * library source of whatever name, jsDelivr's copy of the pack, another CDN or the H5P hub, shows
 * up as a request to another origin: no list of hosts to keep. The listener is on the context, not
 * the page, so that it also hears the Service Worker's own requests, which a page does not.
 */
function watchLeaving(page: Page, baseURL: string | undefined): string[] {
  if (!baseURL) throw new Error('playwright.config.ts sets no baseURL')
  const own = new URL(baseURL).origin
  const leaving: string[] = []
  page.context().on('request', (request) => {
    const { protocol, origin, pathname } = new URL(request.url())
    if (protocol !== 'http:' && protocol !== 'https:') return // data: and blob:
    if (origin !== own || /\/libraries-[^/]*\.h5p$/.test(pathname)) leaving.push(request.url())
  })
  return leaving
}

test('the player page plays a package', async ({ page, baseURL }) => {
  const problems = watchConsole(page)
  const leaving = watchLeaving(page, baseURL)
  await page.goto(`/h5p?src=${baseURL}${SAMPLE}`)

  const player = page.locator('h5p-player')
  await expect(player).toHaveAttribute('src', `${baseURL}${SAMPLE}`)
  await expect.poll(async () => player.evaluate((element: HTMLElement & { state?: string }) => element.state)).toBe('ready')

  // The content is up: the worker served the runtime's frame, and the loader is gone.
  await expect(page.locator('#loader')).toBeHidden()
  await expect(page.locator('#notice')).toBeHidden()
  const frame = page.frameLocator('h5p-player iframe').first()
  await expect(frame.locator('.h5p-content, .h5p-container').first()).toBeVisible()

  // A complete package costs at most the parts of the libraries it carries at older versions than
  // the pack's, from this origin: never the pack whole, and nothing from anywhere else.
  expect(leaving, 'nothing left this origin, and the whole pack was not asked for').toEqual([])
  expect(problems, problems.join('\n')).toEqual([])
})

test('a package exported without its libraries plays from the pack served here, part by part', async ({ page, baseURL }) => {
  const problems = watchConsole(page)
  const parts: number[] = []
  const leaving = watchLeaving(page, baseURL)
  // On the context, as in `watchLeaving`, so that a part the Service Worker fetches is counted too.
  page.context().on('response', (response) => {
    const url = response.url()
    if (url.startsWith(`${baseURL}/assets/`) && url.endsWith('.h5p')) parts.push(response.status())
  })
  // The quiz as H5P.com would export it: `content/` and a manifest that names only the main library.
  // It was written for Question Set 1.20 and the pack serves 1.21, so the frame runs the library's
  // upgrade steps on it first; a failed upgrade logs a console error, which fails this test.
  await page.goto(`/h5p?src=${baseURL}/samples/quiz-without-libraries.h5p`)
  const player = page.locator('h5p-player')
  // The pack served here, and nothing behind it: the player has no hub to fall back to.
  await expect(player).toHaveAttribute('libraries', 'pack')
  await expect.poll(async () => player.evaluate((element: HTMLElement & { state?: string }) => element.state), { timeout: 40_000 }).toBe('ready')
  await expect(page.frameLocator('h5p-player iframe').first().locator('.h5p-content, .h5p-container').first()).toBeVisible()
  // The parts the quiz needs, a handful of the pack's hundred and more, each from this origin.
  expect(parts.length, 'parts were fetched from this origin').toBeGreaterThan(0)
  expect(parts.length, 'only the parts the quiz needs').toBeLessThan(40)
  expect(parts.filter((status) => status !== 200), 'every part answered').toEqual([])
  expect(leaving, 'nothing left this origin, and the whole pack was not asked for').toEqual([])
  expect(problems, problems.join('\n')).toEqual([])
})

/**
 * Serves a page that frames the player at `/framing.html` on the test server's origin and opens
 * it. Served rather than `setContent`: a frame under `about:blank` gets no Service Worker, and
 * the player page's policy allows no inline script. The page
 * keeps every message the frame posts that is not the resizer's, in `window.reports`.
 */
async function framingPage(page: Page, baseURL: string | undefined, body: string): Promise<void> {
  await page.route('**/framing.html', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><meta charset="utf-8">${body}
        <script>window.reports = []; addEventListener('message', (e) => { if (e.data?.context === 'h5p-offline-player') window.reports.push(e.data) })</script>`
    })
  )
  await page.goto(`${baseURL}/framing.html`)
}

const reports = (page: Page) => page.evaluate(() => (window as unknown as { reports: Record<string, unknown>[] }).reports)

test('opened on its own, a package from another site plays untrusted, without a click', async ({ page, baseURL }) => {
  const problems = watchConsole(page)
  // 127.0.0.1 and localhost are different origins: to this page the package comes from another site.
  const elsewhere = `${baseURL}${SAMPLE}`.replace('127.0.0.1', 'localhost')
  await page.goto(`/h5p?src=${elsewhere}`)
  const player = page.locator('h5p-player')
  await expect.poll(async () => player.evaluate((element: HTMLElement & { state?: string }) => element.state)).toBe('ready')
  // Played as data: none of the package's own code, its libraries from the pack served here, and
  // its content shown only after the runtime's boot script has checked it against their semantics.
  expect(await player.evaluate((element: HTMLElement & { untrusted?: boolean }) => element.untrusted)).toBe(true)
  await expect(player).toHaveAttribute('libraries', 'pack')
  await expect(page.getByRole('button', { name: 'Open with its own scripts' })).toHaveCount(0)
  await expect(page.frameLocator('h5p-player iframe').first().locator('.h5p-content, .h5p-container').first()).toBeVisible()
  expect(problems, problems.join('\n')).toEqual([])
})

test("H5P's own buttons are in the package's language, whatever &lang= says", async ({ page, baseURL }) => {
  const problems = watchConsole(page)
  await page.goto(`/h5p?src=${baseURL}${SAMPLE}&frame&copyright&lang=de`)
  const player = page.locator('h5p-player')
  await expect(player).toHaveAttribute('lang', 'de')
  await expect.poll(async () => player.evaluate((element: HTMLElement & { state?: string }) => element.state)).toBe('ready')
  const frame = page.frameLocator('h5p-player iframe').first()
  // The package names English in its h5p.json, so the toolbar's Rights of use button matches its
  // text (player 1.1.0); &lang= is for a package that names no language.
  await expect(frame.getByText('Rights of use')).toBeVisible()
  await expect(frame.getByText('Nutzungsrechte')).toHaveCount(0)
  // The frame document says the same to a screen reader.
  await expect(frame.locator('html')).toHaveAttribute('lang', 'en')
  expect(problems, problems.join('\n')).toEqual([])
})

test('a page that frames it gets a hello, a height and a report', async ({ page, baseURL }) => {
  // The snippet's two lines, on a page of the same origin as the test server.
  await framingPage(
    page,
    baseURL,
    `<iframe id="f" src="${baseURL}/h5p?src=${baseURL}${SAMPLE}" style="width: 100%; min-height: 100px; border: 0"></iframe>
     <script src="${baseURL}/h5p-resizer.js"></script>`
  )
  // The resizer script sets the frame's height from what the frame reports; the default would be the browser's 150px.
  await expect.poll(async () => page.locator('#f').evaluate((element) => Number.parseInt((element as HTMLElement).style.height, 10)), {
    timeout: 30_000
  }).toBeGreaterThan(200)

  // The report: what the player learnt, in the shape the website reads (website, `src/report.ts`).
  await expect.poll(async () => (await reports(page)).length).toBe(1)
  const [report] = await reports(page)
  expect(report).toMatchObject({
    action: 'report',
    source: { type: 'range-http', size: expect.any(Number) },
    metadata: { title: 'Do you know what just happened?', license: 'CC0 1.0', authors: ['missing-elements'], mainLibrary: 'H5P.QuestionSet' },
    // The quiz carries its libraries, older than the pack's, so it plays the pack's newer versions
    // from this origin (player 0.10) and the report names them; the website says so under its preview.
    libraryBundle: {
      url: `${baseURL}/assets/`,
      origin: baseURL,
      fromCache: expect.any(Boolean),
      refreshed: expect.arrayContaining([{ library: 'H5P.QuestionSet', from: '1.20.31', to: expect.stringMatching(/^1\.\d+\.\d+$/) }])
    },
    downgradedLibraries: [],
    elapsedMs: expect.any(Number)
  })
})

test('a page that frames a package no browser can fetch is told so', async ({ page, baseURL }) => {
  // `/nothing.h5p` is a 404 on this origin: the fetch fails before the content is up, and the frame says why.
  await framingPage(page, baseURL, `<iframe id="f" src="${baseURL}/h5p?src=${baseURL}/samples/nothing.h5p"></iframe>`)
  await expect.poll(() => reports(page), { timeout: 30_000 }).toMatchObject([
    { action: 'error', code: expect.stringMatching(/^(network|no-cors|bad-archive)$/) }
  ])
})
