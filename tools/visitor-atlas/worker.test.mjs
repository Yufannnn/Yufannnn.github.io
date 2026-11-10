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
      for (const [key, views] of records) {
        const {country, day} = JSON.parse(key);
        const total = countries.get(country) || {country, views: 0, lastSeen: ''};
        total.views += views;
        if (day > total.lastSeen) total.lastSeen = day;
        countries.set(country, total);
      }
      return {results: [...countries.values()]};
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
  assert.deepEqual(result.recentCountries.map(x => x.code), ['SG', 'US']);
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
  assert.deepEqual((await stats(env)).recentCountries, []);
});

test('recent countries use UTC recency, not cumulative visit counts', async t => {
  t.mock.timers.enable({apis: ['Date'], now: Date.parse('2026-11-10T00:05:00Z')});
  const env = {DB: database()};
  const seed = (country, day, views) => env.DB.records.set(JSON.stringify({day, path: '/', country}), views);
  seed('SG', '2026-11-04', 10000); // Old volume must not determine the ordering.
  seed('SG', '2026-10-20', 5000);
  seed('US', '2026-11-10', 1);
  seed('JP', '2026-11-09', 1);
  seed('CA', '2026-11-09', 2); // Same-day ties use country code, not volume.
  seed('DE', '2026-11-03', 999); // Outside the seven calendar-day window.
  seed('ZZ', '2026-11-10', 3);
  const result = await stats(env);
  assert.equal(result.recentSince, '2026-11-04');
  assert.deepEqual(result.recentCountries, [
    {code: 'US', lastSeen: '2026-11-10'},
    {code: 'CA', lastSeen: '2026-11-09'},
    {code: 'JP', lastSeen: '2026-11-09'},
    {code: 'SG', lastSeen: '2026-11-04'}
  ]);
  assert.equal(result.pageViews, 16006);
  assert.equal(result.countries, 5);
  assert.ok(result.recentCountries.every(row => !('visits' in row)));
});

test('a quiet week has no recent countries but preserves overall totals', async t => {
  t.mock.timers.enable({apis: ['Date'], now: Date.parse('2026-11-10T23:59:59Z')});
  const env = {DB: database()};
  env.DB.records.set(JSON.stringify({day: '2026-11-03', path: '/', country: 'SG'}), 500);
  const result = await stats(env);
  assert.deepEqual(result.recentCountries, []);
  assert.equal(result.pageViews, 500);
  assert.equal(result.countries, 1);
});
