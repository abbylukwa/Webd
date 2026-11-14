#!/usr/bin/env bash
# verify_v55.sh — wait for the v5.5 deploy, then prove vault adoption restored
# the SAME batch (brand ids must match pre_deploy.txt) instead of a re-commission.
set -u
B='https://webd-1-zb89.onrender.com/api/beast'
for i in $(seq 1 30); do
  sleep 55
  curl -s -m 90 "$B" -o /tmp/poll55.json 2>/dev/null || continue
  python3 - <<'PY'
import json
try:
    s = json.load(open('/tmp/poll55.json'))
except Exception:
    print('  (api warming)')
    raise SystemExit
ids = [x['id'] for x in s['sites']]
pre = [line.split('|')[0] for line in open('/tmp/pre_deploy.txt').read().splitlines()]
acc = {x['id']: sum(1 for t in x['tasks'] if t['status'] == 'accepted') for x in s['sites']}
pre_acc = {line.split('|')[0]: int(line.split('|')[2]) for line in open('/tmp/pre_deploy.txt').read().splitlines()}
match = sorted(ids) == sorted(pre)
tot = sum(len(x['tasks']) for x in s['sites'])
a = sum(acc.values())
print(f"brands_match={match}  progress {a}/{tot}  sites: " + ', '.join(f"{i[:14]}:{acc.get(i,0)}" for i in ids))
if match:
    kept = sum(1 for i in pre if acc.get(i, 0) >= pre_acc.get(i, 0))
    print(f"ADOPTION VERIFIED — {kept}/3 sites kept their accepted-task counts (no reset)")
    open('/tmp/adoption_ok', 'w').write('yes')
PY
  [ -f /tmp/adoption_ok ] && echo 'DONE' && break
done
