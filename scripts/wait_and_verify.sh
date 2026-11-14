#!/usr/bin/env bash
# wait_and_verify.sh — poll deploy, drive work, verify vault writes land.
set -u
B='https://webd-1-zb89.onrender.com/api/beast'
TOK="${BEAST_GH_TOKEN:?export BEAST_GH_TOKEN first}"
for i in $(seq 1 28); do
  sleep 55
  curl -s -m 90 "$B" -o /tmp/poll.json 2>/dev/null
  python3 - <<'PY'
import json
try:
    s = json.load(open('/tmp/poll.json'))
except Exception:
    print('  (api not ready)')
    raise SystemExit
tot = sum(len(x['tasks']) for x in s['sites'])
acc = sum(1 for x in s['sites'] for t in x['tasks'] if t['status'] == 'accepted')
builts = []
for st in s['sites']:
    built = sum(1 for t in st['tasks'] if t['kind'] == 'page.build' and t['status'] == 'accepted')
    sale = st.get('status')
    print(f"  {st['id']:30} {sale:10} {acc and ''}stage {st['stageIndex']} builds {built}")
    if built > 0 or sale == 'for-sale':
        builts.append(st['id'])
print(f"  progress {acc}/{tot} ({100 * acc // max(1, tot) if tot else 0}%)  sites {len(s['sites'])}  ready={builts}")
open('/tmp/ready_ids', 'w').write(' '.join(builts[:3]))
PY
  if [ -s /tmp/ready_ids ]; then
    echo 'READY — checking vault write:'
    curl -s -m 30 -H "Authorization: token $TOK" 'https://api.github.com/repos/abbylukwa/beast-studio-vault/contents/beast-state.json' | python3 -c "
import json,sys,base64
d=json.load(sys.stdin)
if 'content' in d:
    st=json.loads(base64.b64decode(d['content']).decode('utf-8','ignore'))
    print(f\"VAULT LIVE: version {st.get('version')} sites {len(st.get('sites',[]))}\")
else:
    print('vault still old:', d.get('message','?'))
"
    break
  fi
done
