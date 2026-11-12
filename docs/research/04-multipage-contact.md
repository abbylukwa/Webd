# Research 04 — Multi-Page Mandate & Contact Realism

**Owner directive:** "Real multi-page: home, about, contact… full contact info — 12 numbers, WhatsApp, every social, map."

## Findings
- One-pagers cannot carry 12 phone lines, a 30-product catalog and legal pages without becoming scroll abuse. Real SMB sites: home / about / services / shop / gallery / faq / contact / journal / legal.
- Contact realism research: schema.org `ContactPoint` per department line, `wa.me` deep links for WhatsApp, OpenStreetMap embed (free, no API key, no tracking), hours + address block, and a no-backend mailto form (static sites cannot run mail servers honestly).

## Design (implemented)
- Page map (`tasks.planPagesFor`): home always; **contact mandatory and in nav**; Shop page earned when the catalog has ≥ 8 items; gallery, faq, journal, legal per size; hard cap 9 pages (MAX_PAGES).
- `render.renderInnerPage` renders every inner page from the shared token set (Repetition law) with per-page nav highlighting.
- Contact page: ≤ 12 `tel:` links each with department label, emails, hours, address, **all 8 social platforms incl. WhatsApp deep link**, OSM `<iframe>` map, mailto enquiry form.
- JSON-LD on every page: `contactPoint` array mirrors the phone table exactly (count-checked by the suite).
- Support pack: sitemap.xml lists every generated page; robots, 404, DESIGN-NOTES, ATTRIBUTION, values.json ship in folder + ZIP + GitHub repo.

## Verification
- B6 (page-map law), C1d (disk truth), C4 (contact realism: tel counts, WhatsApp, OSM, contactPoints), C5 (multi-page ZIP) — pass.
