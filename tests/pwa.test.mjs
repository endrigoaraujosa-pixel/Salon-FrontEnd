import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
function worker(fetch) {
  const handlers = {}, stored = new Map(), deleted = [];
  const cache = { put: async (key, value) => stored.set(key, value), match: async key => stored.get(key) };
  const self = { location: { origin: 'https://salon.example' }, addEventListener: (name, handler) => handlers[name] = handler, skipWaiting: async () => {}, clients: { claim: async () => {} } };
  const source = readFileSync(new URL('public/sw.js', root), 'utf8');
  const prefix = source.match(/const PREFIX = '([^']+)'/)[1];
  vm.runInNewContext(source, { self, URL, Response, fetch, caches: { open: async () => cache, keys: async () => [prefix + 'v0', 'other-app-cache'], delete: async name => deleted.push(name) } });
  return { handlers, stored, deleted, prefix };
}
test('cache contains only generic offline HTML and leaves foreign caches alone', async () => {
  const calls = [];
  const w = worker(async (url, options) => { calls.push([url, options]); return new Response('offline'); });
  let done;
  w.handlers.install({ waitUntil(p) { done = p; } }); await done;
  assert.deepEqual([...w.stored.keys()], ['/offline.html']);
  assert.equal(calls.length, 1);
  w.handlers.activate({ waitUntil(p) { done = p; } }); await done;
  assert.deepEqual(w.deleted, [w.prefix + 'v0']);
});
test('API, photos, assets, external origins and writes are never intercepted', () => {
  const w = worker(() => { throw new Error('unexpected fetch'); });
  for (const [url, method, mode] of [
    ['/api/clientes', 'GET', 'navigate'], ['/api', 'GET', 'navigate'], ['/api/agendamentos', 'PUT', 'cors'],
    ['/foto.webp', 'GET', 'no-cors'], ['/assets/app.js', 'GET', 'cors'], ['https://b2.example/photo', 'GET', 'navigate'], ['/', 'POST', 'navigate']
  ]) w.handlers.fetch({ request: { url: new URL(url, 'https://salon.example').href, method, mode }, respondWith() { assert.fail('Must pass through'); } });
});
test('navigation uses network; failure returns generic fallback without caching pages', async () => {
  let fail = false;
  const w = worker(async (url, options) => { assert.equal(options.cache, 'no-store'); if (fail) throw new Error('offline'); return new Response('private page'); });
  w.stored.set('/offline.html', new Response('generic fallback'));
  let response;
  const event = { request: { url: 'https://salon.example/agenda', method: 'GET', mode: 'navigate' }, respondWith(p) { response = p; } };
  w.handlers.fetch(event); assert.equal(await (await response).text(), 'private page');
  fail = true; w.handlers.fetch(event); assert.equal(await (await response).text(), 'generic fallback');
  assert.deepEqual([...w.stored.keys()], ['/offline.html']);
});
test('manifest has installable PNGs with declared dimensions', () => {
  const manifest = JSON.parse(readFileSync(new URL('public/manifest.json', root)));
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.scope, '/');
  for (const icon of manifest.icons) {
    const png = readFileSync(new URL('public' + icon.src, root));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
});
