# Security

Embed My has no accounts, no server and no data of its own: the site is static files on GitHub Pages, and
an H5P package plays in the visitor's browser. What can go wrong is therefore in one of two places.

- **The player** (how a package is read and run, the worker, the frame it builds): report it under the
  [h5p-offline-player security policy](https://github.com/missing-elements/h5p-offline-player/blob/main/SECURITY.md).
- **This site** (the snippet it writes, the `/h5p` page, `h5p-resizer.js`, the pages' Content-Security-Policy):
  report it privately through
  [GitHub's security advisory form](https://github.com/embed-my/embed-my.github.io/security/advisories/new)
  for this repository, not as a public issue.

Please include the address you used, the browser, and what you expected to happen. There is no bounty; there
is a thank-you in the release notes if you want one.

## What is by design

- The `/h5p` page runs any package a link names, as any H5P site runs the packages uploaded to it. It runs on
  Embed My's own origin, apart from the embedding site, with storage partitioned per embedding site. What a
  hostile package can do there is described in the [privacy and security guide](https://embed-my.org/docs/privacy-and-security).
- The pages carry their policy in a `<meta>` tag, written at build, because GitHub Pages sends no security
  headers. A `<meta>` policy cannot set `frame-ancestors`; `/h5p` is meant to be framed by anyone.
