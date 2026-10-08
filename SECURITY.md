# Security

This repository is the player origin of Embed My, `embed-my.github.io`: static files on GitHub Pages, no
server and no data of its own. An H5P package plays in the visitor's browser, on this origin, apart from the
site that embeds it and from embed-my.org. What can go wrong is therefore in one of three places.

- **The player** (how a package is read and run, the worker, the frame it builds): report it under the
  [h5p-offline-player security policy](https://github.com/missing-elements/h5p-offline-player/blob/main/SECURITY.md).
- **This origin** (the `/h5p` page, `h5p-resizer.js`, the samples, the pages' Content-Security-Policy):
  report it privately through
  [GitHub's security advisory form](https://github.com/embed-my/embed-my.github.io/security/advisories/new)
  for this repository, not as a public issue.
- **The website** (embed-my.org, the snippet it writes, the preview, the guides): the same form in
  [embed-my/website](https://github.com/embed-my/website/security/advisories/new).

Please include the address you used, the browser, and what you expected to happen. There is no bounty; there
is a thank-you in the release notes if you want one.

## What is by design

- The `/h5p` page runs any package a link names, as any H5P site runs the packages uploaded to it. It runs on
  this origin, with storage partitioned per embedding site. What a hostile package can do there is described
  in the [privacy and security guide](https://embed-my.org/docs/privacy-and-security).
- The pages carry their policy in a `<meta>` tag, written at build, because GitHub Pages sends no security
  headers. A `<meta>` policy cannot set `frame-ancestors`; `/h5p` is meant to be framed by anyone.
- This origin has no custom domain, so a snippet keeps working for as long as the project is on GitHub, and a
  package never runs on the website's origin.
