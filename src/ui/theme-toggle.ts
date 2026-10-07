/*
 * The light/dark switch. Two states, not three: following the system, or pinned to the other
 * theme. A press pins the theme the visitor is not seeing; a press that would pin the system's own
 * theme clears the pin instead, so the page follows the system again and a pin never outlives its
 * point. The pin is `data-theme` on <html>, which src/styles/tokens.css reads; the inline script in
 * index.html applies a stored pin before the first paint, under the same storage key.
 */

const KEY = 'theme'

type Theme = 'light' | 'dark'

const asTheme = (value: string | null | undefined): Theme | null => (value === 'light' || value === 'dark' ? value : null)

export function initThemeToggle(button: HTMLButtonElement): void {
  const root = document.documentElement
  const system = matchMedia('(prefers-color-scheme: dark)')

  const systemTheme = (): Theme => (system.matches ? 'dark' : 'light')
  const shown = (): Theme => asTheme(root.dataset.theme) ?? systemTheme()

  const pin = (theme: Theme | null) => {
    if (theme) root.dataset.theme = theme
    else delete root.dataset.theme
  }

  const stored = (): Theme | null => {
    try {
      return asTheme(localStorage.getItem(KEY))
    } catch {
      return null
    }
  }

  // The label names what a press does, which is the one thing the icon cannot say.
  const describe = () => {
    const label = `Switch to the ${shown() === 'dark' ? 'light' : 'dark'} theme`
    button.setAttribute('aria-label', label)
    button.title = label
  }

  button.addEventListener('click', () => {
    const next: Theme = shown() === 'dark' ? 'light' : 'dark'
    const choice = next === systemTheme() ? null : next
    pin(choice)
    try {
      if (choice) localStorage.setItem(KEY, choice)
      else localStorage.removeItem(KEY)
    } catch {
      // No storage: the choice holds for this page and no longer.
    }
    describe()
  })

  // The system setting can change under a page that follows it, and another tab can change the
  // pin. The stylesheet follows both by itself; the label follows here.
  system.addEventListener('change', describe)
  addEventListener('storage', (event) => {
    if (event.key !== KEY && event.key !== null) return
    pin(stored())
    describe()
  })

  describe()
}
