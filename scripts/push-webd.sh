#!/usr/bin/env bash
# push-webd.sh — one-command deploy of Beast Web Developer v4 to GitHub.
#
# Credentials: the token is read TRANSIENTLY from one of (first match wins):
#   1. $BEAST_GH_TOKEN  2. $GITHUB_TOKEN  3. ./.deploy-token (gitignored file)
# It is NEVER written to the repo, the log, or stdout. The git remote is
# configured with an embedded credential URL, used for this push only, then
# the credential is scrubbed from .git/config.
#
# Usage:  BEAST_GH_TOKEN=ghp_xxx bash scripts/push-webd.sh
set -euo pipefail
cd "$(dirname "$0")/.."

TOKEN="${BEAST_GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [[ -z "$TOKEN" && -f .deploy-token ]]; then
  TOKEN="$(tr -d '[:space:]' < .deploy-token)"
fi
if [[ -z "$TOKEN" ]]; then
  echo "NO TOKEN: export BEAST_GH_TOKEN=<token> (or write it to .deploy-token) and re-run."
  exit 2
fi
if [[ ${#TOKEN} -lt 20 ]]; then echo "Token looks too short — refusing."; exit 2; fi

REMOTE="https://x-access-token:${TOKEN}@github.com/abbylukwa/Webd.git"
cleanup() { git remote remove deploy >/dev/null 2>&1 || true; }
trap cleanup EXIT
git remote remove deploy >/dev/null 2>&1 || true
git remote add deploy "$REMOTE"

echo "== pushing main → github.com/abbylukwa/Webd =="
if git push deploy main --force-with-lease=main; then
  echo "PUSH OK."
else
  echo "PUSH FAILED (bad token? expired? no repo access?)."
  exit 1
fi

echo "== verifying remote head =="
CODE=$(curl -s -o /tmp/webd-head.json -w '%{http_code}' \
  -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/abbylukwa/Webd/commits/main)
if [[ "$CODE" == "200" ]]; then
  python3 - <<'PY'
import json
d = json.load(open('/tmp/webd-head.json'))
print("REMOTE HEAD:", d['sha'][:9], '—', d['commit']['message'].splitlines()[0][:70])
PY
else
  echo "verify api http $CODE"
fi
echo "== done. Render will auto-deploy this commit. =="
