# Yufan Zhu — Academic Website

Personal academic website for Yufan Zhu, a Computer Science PhD student at the National University of Singapore researching secure and privacy-preserving machine learning systems.

Live site: [yufannnn.github.io](https://yufannnn.github.io/)

## Contents

- Research profile and interests
- Selected publications
- Education
- Professional service
- Curriculum vitae and contact links
- Research activity calendar, Singapore clock, and downloadable/copyable BibTeX
- Visitor Atlas with country-level page views

The site is a static HTML/CSS/JavaScript project hosted with GitHub Pages.

The activity calendar reads the same public aggregate snapshot as the GitHub
profile, with a local fallback in `assets/data/research-activity.json`. It counts
deduplicated authored commits, including private work, rather than GitHub profile
contributions. No private repository names or commit records are published.

The Atlas uses its own Cloudflare Worker and D1 database, configured under
`tools/visitor-atlas/`. Only UTC day, public page path, country code, and view count
are stored. Collection covers `/`, `/index.html`, and `/resume.html`; research
project sites have separate counters. IP addresses, cookies, session IDs, and
fingerprints are not stored. Do Not Track, Global Privacy Control, and common bots
are excluded. Country locations are approximate; these are page views, not unique
people. Map outlines are from Natural Earth (public domain), reused from the
QuasiLeak-Bench Atlas.

```sh
node --test tools/visitor-atlas/worker.test.mjs
npx wrangler@4 deploy --config tools/visitor-atlas/wrangler.toml
```

Credentials stay in the owner's local Cloudflare login; none are needed by the
browser or committed to this repository.
