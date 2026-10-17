import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.mjs';

function database() {
  const records = new Map();
  return {records, prepare() { return {
    bind(day, path, country) { this.record = {day, path, country}; return this; },
    async run() { const key = JSON.stringify(this.record); records.set(key, (records.get(key) || 0) + 1); },
    async all() {
      const countries = new Map();
      for (const [key, views] of records) { const {country} = JSON.parse(key); countries.set(country, (countries.get(country) || 0) + views); }
      return {results: [...countries].map(([country, views]) => ({country, views}))};
    }
  }; }};
}
function visit(path = '/', country = 'SG', headers = {}) {
  return Object.assign(new Request('https://example.workers.dev/visit', {method: 'POST', headers: {
    Origin: 'https://yufannnn.github.io', 'User-Agent': 'Mozilla/5.0', ...headers
  }, body: JSON.stringify({path})}), {cf: {country}});
}
const stats = env => worker.fetch(new Request('https://example.workers.dev/stats'), env).then(r => r.json());

test('portfolio and CV views aggregate without identifiers or benchmark traffic', async () => {
  const env = {DB: database(), COLLECTED_SINCE: '2026-10-17'};
  assert.equal((await worker.fetch(visit(), env)).status, 201);
  assert.equal((await worker.fetch(visit('/resume.html', 'US'), env)).status, 201);
  assert.equal((await worker.fetch(visit('/QuasiLeak-Bench/'), env)).status, 400);
  assert.equal((await worker.fetch(visit('/EncFormer/'), env)).status, 400);
  const result = await stats(env);
  assert.equal(result.pageViews, 2);
  assert.equal(result.countries, 2);
  assert.deepEqual(result.countryVisits.map(x => x.code).sort(), ['SG', 'US']);
  assert.equal('visitors' in result, false);
  assert.equal('ip' in result, false);
});
test('privacy signals, bots, wrong origins, and query strings do not record views', async () => {
  const env = {DB: database()};
  for (const headers of [{DNT: '1'}, {'Sec-GPC': '1'}, {'User-Agent': 'HeadlessChrome'}]) {
    assert.equal((await worker.fetch(visit('/', 'SG', headers), env)).status, 200);
  }
  assert.equal((await worker.fetch(visit('/', 'SG', {Origin: 'https://other.example'}), env)).status, 403);
  assert.equal((await worker.fetch(visit('/?private=value'), env)).status, 400);
  assert.equal((await stats(env)).pageViews, 0);
});
test('unknown locations count as views without inventing a country', async () => {
  const env = {DB: database()};
  await worker.fetch(visit('/', 'ZZ'), env);
  assert.equal((await stats(env)).pageViews, 1);
  assert.equal((await stats(env)).countries, 0);
});
