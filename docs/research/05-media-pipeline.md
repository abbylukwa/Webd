# Research 05 — The Media Pipeline (free, licensed, attributed)

**Owner directive:** "Use free online images; no paid stock."

## Findings
- Licensing is the trap: scrape-generators ship stolen images. Legit free sources: **Openverse API** (CC0/PD/BY/BY-SA filter), **Wikimedia Commons** (license via imageinfo extmetadata), **Picsum** (free placeholder license), gradient art (zero rights).
- Attribution norms: creator + license + source page per image, shipped as a permanent paper trail (ATTRIBUTION.md).
- Audio/video: the same doctrine applies — free sources exist (Wikimedia Commons audio/video, Pixabay/Pexels with keys, archive.org) but hot-linking large media is fragile; **v3 archives media into the site's GitHub repo** (see 07) and renders video/audio via plain `<video>`/`<audio>` tags when values provide URLs; the values layer accepts any URL the owner pastes. LFS quota math in 07.

## Design (implemented) — `images.ts`
- Slot grammar per niche (3 queries each, graceful fallback for unknown niches).
- Resolution chain per slot: **Openverse → Wikimedia → Picsum → gradient floor**; bytes saved into `assets/<slot>.jpg`; hot-link fallback if bytes fail.
- **Determinism law:** first accepted fetch freezes into `site.art.images` — never re-searched, never reshuffled; slots already resolved are reused verbatim (C-suite forces BEAST_IMAGES=0 offline → gradients, pipeline still completes).
- Every live record: source, creator, license, source page → `attributionMarkdown` renders the paper trail.

## Verification
- A10 (attribution paper trail), A11 (query grammar), C1d (assets + ATTRIBUTION on disk), C5 (ATTRIBUTION in ZIP) — pass.
