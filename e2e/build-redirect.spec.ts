import { expect, test, type Page } from '@playwright/test'

/*
 * /build was the build page until it moved to missing-elements.github.io/h5p/build/ (#17). A visit
 * goes on there with its fragment, so a link a chat wrote before, `#source=` and all, still builds.
 * The other site is answered here by a stand-in: the tests check where the browser goes.
 */

const TARGET = 'https://missing-elements.github.io/h5p/build/'

/** Answers the other site with a stand-in page, and collects page errors and policy violations. */
async function watch(page: Page): Promise<string[]> {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || /Content.Security.Policy/i.test(message.text())) problems.push(message.text())
  })
  page.on('pageerror', (error) => problems.push(error.message))
  await page.route(/^https:\/\/missing-elements\.github\.io\//, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Stand-in</title>' }))
  return problems
}

test('sends /build on to the build page, keeping the #source= fragment', async ({ page }) => {
  const problems = await watch(page)
  const source = Buffer.from(JSON.stringify({ type: 'H5P.Blanks', title: 'Rivers' })).toString('base64url')
  await page.goto(`/build#source=${source}`)
  await page.waitForURL(`${TARGET}#source=${source}`)

  // A link with a query, as ChatGPT adds one, keeps its fragment too.
  await page.goto(`/build?utm_source=chatgpt.com#source=${source}`)
  await page.waitForURL(`${TARGET}#source=${source}`)

  await page.goto('/build')
  await page.waitForURL(TARGET)
  expect(problems, problems.join('\n')).toEqual([])
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('still sends /build on to the build page', async ({ page }) => {
    await watch(page)
    await page.goto('/build')
    await page.waitForURL(TARGET)
  })
})
