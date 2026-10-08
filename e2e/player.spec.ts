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
  await page.goto(`/h5p?src=${baseURL}${SAMPLE}`)

  const player = page.locator('h5p-player')
  await expect(player).toHaveAttribute('src', `${baseURL}${SAMPLE}`)
  await expect.poll(async () => player.evaluate((element: HTMLElement & { state?: string }) => element.state)).toBe('ready')

  // The content is up: the worker served the runtime's frame, and the loader is gone.
  await expect(page.locator('#loader')).toBeHidden()
  await expect(page.locator('#notice')).toBeHidden()
  const frame = page.frameLocator('h5p-player iframe').first()
  await expect(frame.locator('.h5p-content, .h5p-container').first()).toBeVisible()

  expect(problems, problems.join('\n')).toEqual([])
})

test('a page that frames it gets a hello and a height', async ({ page, baseURL }) => {
  // A page of the same origin as the test server, with the snippet's two lines in it.
  await page.setContent(
    `<iframe id="f" src="${baseURL}/h5p?src=${baseURL}${SAMPLE}" style="width: 100%; min-height: 100px; border: 0"></iframe>
     <script src="${baseURL}/h5p-resizer.js"></script>`
  )
  // The resizer script sets the frame's height from what the frame reports; the default would be the browser's 150px.
  await expect.poll(async () => page.locator('#f').evaluate((element) => Number.parseInt((element as HTMLElement).style.height, 10)), {
    timeout: 30_000
  }).toBeGreaterThan(200)
})

test('the landing page points at the site', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'embed-my.org' })).toHaveAttribute('href', 'https://embed-my.org/')
  await expect(page.getByRole('link', { name: 'licence' })).toHaveAttribute('href', '/assets/runtime-LICENSE.txt')
  expect(problems, problems.join('\n')).toEqual([])
})
