import { describe, expect, it } from 'vitest'
import { EXAMPLE, FORMATS, SITE_ORIGIN } from './config'
import { buildSnippet, displayFlags, embedUrl, originOf, snippetText, titleFromUrl, type SnippetRequest } from './snippet'

const NO_TOOLBAR = { copyright: false, reuse: false }

const request = (overrides: Partial<SnippetRequest> = {}): SnippetRequest => ({
  site: SITE_ORIGIN,
  path: FORMATS.h5p.path,
  src: EXAMPLE.src,
  title: EXAMPLE.title,
  display: NO_TOOLBAR,
  minHeight: 540,
  xapiOrigin: null,
  ...overrides
})

describe('buildSnippet', () => {
  it('writes the example exactly as the embedding guide shows it', () => {
    expect(snippetText(buildSnippet(request()))).toBe(
      [
        '<iframe',
        '  src="https://embed-my.github.io/h5p?src=https://h5p-offline-player.vercel.app/demo/content/quiz.h5p"',
        '  title="Sample quiz"',
        '  loading="lazy"',
        '  allow="fullscreen"',
        '  style="width: 100%; min-height: 540px; border: 0"',
        '></iframe>',
        '<script src="https://embed-my.github.io/h5p-resizer.js"></script>'
      ].join('\n')
    )
  })

  it('adds the display flags and the xAPI origin, with the ampersands escaped for HTML', () => {
    const text = snippetText(
      buildSnippet(request({ display: { copyright: true, reuse: false }, xapiOrigin: 'https://school.example' }))
    )
    expect(text).toContain('quiz.h5p&amp;frame&amp;copyright&amp;xapi=https://school.example"')
  })

  it('escapes the title, so a quote cannot end the attribute', () => {
    const text = snippetText(buildSnippet(request({ title: 'Q&A: "Week 1" <draft>' })))
    expect(text).toContain('title="Q&amp;A: &quot;Week 1&quot; &lt;draft&gt;"')
  })

  it('marks the embed address as the one token of its kind', () => {
    const urls = buildSnippet(request()).filter((token) => token.kind === 'url')
    expect(urls).toHaveLength(1)
    expect(urls[0]?.text).toMatch(/^https:\/\/embed-my\.github\.io\/h5p\?src=/)
  })
})

describe('displayFlags', () => {
  it('leaves the bar out when neither of its buttons is ticked', () => {
    expect(displayFlags({ copyright: false, reuse: false })).toEqual([])
  })

  it('shows the bar with whichever buttons are ticked, by the player’s own parameter names', () => {
    expect(displayFlags({ copyright: true, reuse: true })).toEqual(['frame', 'copyright', 'export'])
    expect(displayFlags({ copyright: true, reuse: false })).toEqual(['frame', 'copyright'])
    expect(displayFlags({ copyright: false, reuse: true })).toEqual(['frame', 'export'])
  })
})

describe('embedUrl', () => {
  it('encodes what would break the package link, leaves `:` and `/` readable, and keeps flags bare', () => {
    expect(embedUrl('https://player.example/embed', 'https://a.example/x y.h5p?v=1&k=2', ['frame'], { xapi: 'https://b.example' })).toBe(
      'https://player.example/embed?src=https://a.example/x%20y.h5p%3Fv%3D1%26k%3D2&frame&xapi=https://b.example'
    )
  })

  it('round-trips through URLSearchParams, the way the player reads it', () => {
    const src = 'https://a.example/x y+z.h5p?v=1&k=2#top'
    const params = new URL(embedUrl('https://player.example/embed', src, ['frame'])).searchParams
    expect(params.get('src')).toBe(src)
    expect(params.has('frame')).toBe(true)
  })
})

describe('originOf', () => {
  it('cuts a page address down to its origin', () => {
    expect(originOf(' https://school.example/courses/1?x=y ')).toBe('https://school.example')
    expect(originOf('http://localhost:5173/')).toBe('http://localhost:5173')
  })

  it('refuses what is not an http(s) address', () => {
    expect(originOf('')).toBeNull()
    expect(originOf('school.example')).toBeNull()
    expect(originOf('javascript:alert(1)')).toBeNull()
    expect(originOf('data:text/html,hi')).toBeNull()
  })
})

describe('titleFromUrl', () => {
  it('makes a sentence-case title from the file name', () => {
    expect(titleFromUrl('https://courses.example.edu/activities/week-1-quiz.h5p')).toBe('Week 1 quiz')
    expect(titleFromUrl('https://x.example/Unit%203_review.H5P?token=abc')).toBe('Unit 3 review')
  })

  it('gives nothing when there is no file name to use', () => {
    expect(titleFromUrl('https://x.example/')).toBe('')
    expect(titleFromUrl('https://x.example/%E0%A4%A.h5p')).toBe('')
    expect(titleFromUrl('not a url')).toBe('')
  })
})
