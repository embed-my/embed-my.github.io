/** `@missing-elements/h5p-embed` ships JavaScript with JSDoc and no declarations; this is the part the page uses. */
declare module '@missing-elements/h5p-embed/embed.js' {
  export function startEmbed(options?: {
    librariesPack?: string | null
    packages?: string[] | null
    defaultLibraries?: string | null
    runtime?: object | null
    askInOwnFrame?: boolean
  }): void
}
