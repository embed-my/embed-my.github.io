/** Step 2: the link to the package, and the sample buttons that fill it in. */

export interface PackageFormParts {
  form: HTMLFormElement
  input: HTMLInputElement
  /** Buttons whose `data-sample` holds a package link. */
  samples: HTMLButtonElement[]
}

export interface PackageFormSettings {
  /** A link to fill in at load, which still waits for the visitor to press Preview. */
  prefill?: string | null
  /**
   * Called with the link once the browser has checked it against the field's own rules
   * (`type="url"`, `required` and the `pattern` in index.html): an invalid link never gets here.
   */
  onPackage: (src: string) => void
}

export function initPackageForm({ form, input, samples }: PackageFormParts, { prefill, onPackage }: PackageFormSettings): void {
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    onPackage(input.value.trim())
  })

  for (const sample of samples) {
    sample.addEventListener('click', () => {
      input.value = sample.dataset.sample ?? ''
      form.requestSubmit()
    })
  }

  if (prefill) input.value = prefill.trim()
}
