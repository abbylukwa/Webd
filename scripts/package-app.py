#!/usr/bin/env python3
"""Package THE BEAST app into a portable ZIP in download/.

Includes all app source + config, rewrites .env to a portable relative
DATABASE_URL, excludes runtime/infra artifacts (node_modules, .next, the
scraped third-party repo, sandbox infra, the runtime database).
"""
import os
import zipfile
from pathlib import Path

ROOT = Path("/home/z/my-project")
OUT = ROOT / "download" / "beast-web-developer.zip"
OUT.parent.mkdir(parents=True, exist_ok=True)

INCLUDE_DIRS = ["src", "prisma", "public", "scripts"]
INCLUDE_FILES = [
    "package.json",
    "bun.lock",
    "tsconfig.json",
    "next.config.ts",
    "next-env.d.ts",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "eslint.config.mjs",
    "components.json",
    ".gitignore",
    "README-BEAST.md",
    "DEPLOY.md",
    "render.yaml",
    ".node-version",
]
EXCLUDE_PARTS = {"node_modules", ".next", ".git"}

def zip_write(zf: zipfile.ZipFile, arcname: str, data: bytes):
    info = zipfile.ZipInfo(arcname, date_time=(2026, 11, 10, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    zf.writestr(info, data)

with zipfile.ZipFile(OUT, "w") as zf:
    # portable .env (relative sqlite path resolved from prisma/schema.prisma)
    zip_write(zf, "beast-web-developer/.env", b'DATABASE_URL=file:../db/custom.db\n')
    # keep the db folder present with a placeholder
    zip_write(zf, "beast-web-developer/db/.gitkeep", b"")

    for d in INCLUDE_DIRS:
        base = ROOT / d
        if not base.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [x for x in dirnames if x not in EXCLUDE_PARTS]
            for fn in filenames:
                p = Path(dirpath) / fn
                if p.name in EXCLUDE_PARTS or p.suffix in {".db", ".log"}:
                    continue
                arc = "beast-web-developer/" + str(p.relative_to(ROOT))
                zip_write(zf, arc, p.read_bytes())

    for f in INCLUDE_FILES:
        p = ROOT / f
        if p.exists():
            zip_write(zf, "beast-web-developer/" + f, p.read_bytes())

print(f"written: {OUT} ({OUT.stat().st_size/1024:.1f} KB)")

# ── verify ────────────────────────────────────────────────────────────
with zipfile.ZipFile(OUT) as zf:
    names = zf.namelist()
    bad = zf.testzip()
    assert bad is None, f"corrupt entry: {bad}"
    required = [
        "beast-web-developer/src/app/page.tsx",
        "beast-web-developer/src/app/api/beast/route.ts",
        "beast-web-developer/src/app/api/beast/test/route.ts",
        "beast-web-developer/src/app/api/health/route.ts",
        "beast-web-developer/src/app/api/beast/site/[id]/route.ts",
        "beast-web-developer/src/app/api/beast/site/[id]/zip/route.ts",
        "beast-web-developer/src/app/api/beast/zip-all/route.ts",
        "beast-web-developer/src/lib/beast/engine.ts",
        "beast-web-developer/src/lib/beast/render.ts",
        "beast-web-developer/src/lib/beast/spec.ts",
        "beast-web-developer/src/lib/beast/palette.ts",
        "beast-web-developer/src/lib/beast/layouts.ts",
        "beast-web-developer/src/lib/beast/knowledge.ts",
        "beast-web-developer/src/lib/beast/selftest.ts",
        "beast-web-developer/src/lib/beast/rng.ts",
        "beast-web-developer/scripts/test-beast.ts",
        "beast-web-developer/scripts/package-app.py",
        "beast-web-developer/package.json",
        "beast-web-developer/README-BEAST.md",
        "beast-web-developer/DEPLOY.md",
        "beast-web-developer/render.yaml",
        "beast-web-developer/.node-version",
        "beast-web-developer/.env",
        "beast-web-developer/db/.gitkeep",
    ]
    missing = [r for r in required if r not in names]
    assert not missing, f"missing: {missing}"
    # the prisma schema is legacy scaffolding from an earlier iteration —
    # engine v2 is file-based; flag only if it vanished silently
    env_content = zf.read("beast-web-developer/.env").decode()
    assert "file:../db/custom.db" in env_content, "portable .env not applied"
    assert not any("repo-scratch" in n or "node_modules" in n for n in names), "junk leaked in"
    # selftest.ts must be present and reference the engine sandbox
    st = zf.read("beast-web-developer/src/lib/beast/selftest.ts").decode()
    assert "BEAST_DATA_DIR" in st, "selftest sandbox missing"
    html_routes = [n for n in names if n.startswith("beast-web-developer/src/app/api/")]
    print(f"entries: {len(names)} | api routes: {len(html_routes)}")
    print("VERIFY PASS ✅")
