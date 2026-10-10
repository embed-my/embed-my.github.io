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

test('the player page plays a package', async ({ page, baseURL }) => {
  const problems = watchConsole(page)
  const bundle: string[] = []
  page.on('request', (request) => {
    if (/\/assets\/libraries-.*\.h5p|api\.h5p\.org/.test(request.url())) bundle.push(request.url())
  })
  await page.goto(`/h5p?src=${baseURL}${SAMPLE}`)

  const player = page.locator('h5p-player')
  await expect(player).toHaveAttribute('src', `${baseURL}${SAMPLE}`)
  await expect.poll(async () => player.evaluate((element: HTMLElement & { state?: string }) => element.state)).toBe('ready')

  // The content is up: the worker served the runtime's frame, and the loader is gone.
  await expect(page.locator('#loader')).toBeHidden()
  await expect(page.locator('#notice')).toBeHidden()
  const frame = page.frameLocator('h5p-player iframe').first()
  await expect(frame.locator('.h5p-content, .h5p-container').first()).toBeVisible()

  // A complete package never costs the library bundle, or a request anywhere else for libraries.
  expect(bundle, 'no library source was asked for').toEqual([])
  expect(problems, problems.join('\n')).toEqual([])
})

test('a package exported without its libraries plays from the bundle', async ({ page, baseURL }) => {
  const problems = watchConsole(page)
  const bundle: number[] = []
  const elsewhere: string[] = []
  page.on('response', (response) => {
    if (/\/assets\/libraries-.*\.h5p/.test(response.url())) bundle.push(response.status())
  })
  page.on('request', (request) => {
    if (/api\.h5p\.org|cdn\.jsdelivr\.net/.test(request.url())) elsewhere.push(request.url())
  })
  // The quiz as H5P.com would export it: `content/` and a manifest that names only the main library.
  await page.goto(`/h5p?src=${baseURL}/samples/quiz-without-libraries.h5p`)
  const player = page.locator('h5p-player')
  // The pack served here, and nothing behind it: the player has no hub to fall back to.
  await expect(player).toHaveAttribute('libraries', /^\/assets\/libraries-[^ ]*\.h5p$/)
  await expect.poll(async () => player.evaluate((element: HTMLElement & { state?: string }) => element.state), { timeout: 40_000 }).toBe('ready')
  await expect(page.frameLocator('h5p-player iframe').first().locator('.h5p-content, .h5p-container').first()).toBeVisible()
  expect(bundle.length, 'the bundle was fetched from this origin').toBeGreaterThan(0)
  expect(elsewhere, 'no library source off this origin was asked for').toEqual([])
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
    libraryBundle: null,
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
