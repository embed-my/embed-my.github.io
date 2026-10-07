/*
 * Finding the page's elements. The markup and the script meet by id and selector; when the two
 * drift apart, these fail at load and name what is missing, instead of a null failing later.
 */

/** The element with this id, checked to be of the expected type. */
export function byId<T extends Element>(id: string, type: new () => T): T {
  const element = document.getElementById(id)
  if (!(element instanceof type)) throw new Error(`#${id} is missing from the page or is not a ${type.name}`)
  return element
}

/** Every element under `root` that matches, each checked to be of the expected type. */
export function allOf<T extends Element>(root: ParentNode, selector: string, type: new () => T): T[] {
  const elements = [...root.querySelectorAll(selector)]
  if (!elements.every((element): element is T => element instanceof type)) {
    throw new Error(`${selector} matched an element that is not a ${type.name}`)
  }
  return elements
}
