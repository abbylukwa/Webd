// Debug the failing selftest paths directly
import fs from 'fs';
import os from 'os';
import path from 'path';

const prevDir = process.env.BEAST_DATA_DIR;
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'beast-debug-'));
process.env.BEAST_DATA_DIR = sandbox;
process.env.BEAST_IMAGES = '0';
delete process.env.BEAST_GH_TOKEN;
delete process.env.BEAST_AI_VAULT;

const engine = await import('../src/lib/beast/engine');
const { validateValues, SOCIAL_PLATFORMS, MAX_PRODUCTS, MAX_PHONES } = await import('../src/lib/beast/values');

const state = engine.loadState();
state.owner = 'Test Owner';
engine.bootStudio(state);
await engine.runStudio(state); // drain the whole ledger — sites ship

const site = state.sites.find((s) => s.status === 'for-sale');
console.log('== shipped:', site?.brand, site?.status, 'price', site?.price, '©', site?.copyright);
console.log('art.values keys:', site?.art.values ? Object.keys(site.art.values) : 'NULL');
if (site?.art.values) {
  console.log('phones:', site.art.values.phones.length, 'products:', site.art.values.products.length, 'socials:', site.art.values.socials.length);
  console.log('values.brand:', JSON.stringify(site.art.values.brand));
}
const dir = path.join(sandbox, 'sites', site.id);
console.log('files:', fs.readdirSync(dir).join(', '));
const vj = fs.readFileSync(path.join(dir, 'values.json'), 'utf8');
console.log('values.json head:', vj.slice(0, 200).replace(/\n/g, ' '));
const contact = fs.readFileSync(path.join(dir, 'contact.html'), 'utf8');
console.log('contact has brand:', contact.includes(site.brand), '| phones in html:', (contact.match(/tel:/g) || []).length);

// C3 probe
const bloated = {
  brand: 'Cap Test', tagline: 't', domain: 'https://cap.site/',
  phones: Array.from({ length: 14 }, (_, i) => ({ label: `L${i}`, number: `+1 555 000 ${1000 + i}` })),
  emails: ['a@b.site'], socials: SOCIAL_PLATFORMS.map((p) => ({ platform: p.key, handle: 'h', url: p.url('h') })),
  hoursDisplay: ['Mon–Fri 9–17'], address: '1 Way', mapEmbed: '',
  products: Array.from({ length: 35 }, (_, i) => ({ name: `Item ${i}`, desc: 'd', price: 5 })),
};
const vres = validateValues(bloated);
console.log('== caps:', vres.clean.phones.length, vres.clean.products.length, vres.clean.domain, vres.ok, vres.issues);

// C10 editor
const edited = JSON.parse(JSON.stringify(site.art.values));
edited.brand = 'Edited Brand';
edited.phones = [...edited.phones, { label: 'E1', number: '+1 555 111 0000' }];
const res = await engine.setValues(state, site.id, edited);
const stored = state.sites.find((s) => s.id === site.id).art.values;
const rebuilt = fs.readFileSync(path.join(dir, 'contact.html'), 'utf8');
console.log('== editor:', res, '| stored brand:', stored.brand, '| phones:', stored.phones.length, '| rebuilt has brand:', rebuilt.includes('Edited Brand'));

// C11 ops
const st1 = { ...state };
await engine.setOwner(st1, 'Renamed Owner');
console.log('== owner:', st1.owner);
const beforeDel = st1.sites.length;
const delTarget = st1.sites[0]?.id;
const deleted = delTarget ? engine.deleteSite(st1, delTarget) : false;
console.log('deleted:', deleted, 'before', beforeDel, 'after', st1.sites.length);
engine.clearWorkspace(st1);
console.log('after clear:', st1.sites.length, 'dirs left:', st1.sites.filter((s) => fs.existsSync(path.join(sandbox, 'sites', s.id))).length);
console.log('state.sites len (shared ref?):', state.sites.length);

if (prevDir === undefined) delete process.env.BEAST_DATA_DIR; else process.env.BEAST_DATA_DIR = prevDir;
fs.rmSync(sandbox, { recursive: true, force: true });
process.exit(0);
