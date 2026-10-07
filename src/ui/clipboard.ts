/**
 * Copies text to the clipboard, or, where the browser refuses (an http page, an old browser, a
 * frame without the permission), selects `fallback` so the visitor can copy it themselves.
 * Call it straight from the click handler: the clipboard only opens to a user's gesture.
 */
export async function copyOrSelect(text: string, fallback: Node): Promise<'copied' | 'selected'> {
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    const range = document.createRange()
    range.selectNodeContents(fallback)
    const selection = getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    return 'selected'
  }
}
