import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'

/** The rules index.html itself carries, which the script relies on but cannot check by type. */

describe('the link field', () => {
  // Compiled the way browsers compile a `pattern`: against the whole value, with the `v` flag.
  const source = /<input[^>]*\sid="src"[^>]*>/.exec(html)?.[0].match(/\spattern="([^"]*)"/)?.[1]
  const pattern = new RegExp(`^(?:${source})$`, 'v')

  it('has a pattern', () => {
    expect(source).toBeTruthy()
  })

  it.each([
    'https://courses.example.edu/activities/week-1-quiz.h5p',
    'https://cdn.example.org/packages/QUIZ.H5P',
    'https://files.example.com/quiz.h5p?token=abc&expires=1',
    // The one plain-http address the player runs on: a local build playing its own samples.
    'http://localhost:4173/samples/quiz.h5p'
  ])('takes %s', (url) => {
    expect(pattern.test(url)).toBe(true)
  })

  it.each([
    'http://courses.example.edu/quiz.h5p',
    'https://drive.example.com/file/d/abc/view',
    'https://example.com/quiz.h5p.zip',
    'https://example.com/my quiz.h5p',
    'week-1-quiz.h5p'
  ])('refuses %s', (url) => {
    expect(pattern.test(url)).toBe(false)
  })
})

describe('the icon sprite', () => {
  it('has a symbol for every icon the page uses', () => {
    const markup = html.replace(/<!--[\s\S]*?-->/g, '')
    const symbols = new Set([...markup.matchAll(/<symbol id="([^"]+)"/g)].map((match) => match[1]))
    const used = [...markup.matchAll(/<use href="#([^"]+)"/g)].map((match) => match[1])
    expect(used.length).toBeGreaterThan(0)
    expect(used.filter((id) => !symbols.has(id))).toEqual([])
  })
})
