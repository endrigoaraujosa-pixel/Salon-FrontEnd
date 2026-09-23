import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startVisiblePolling } from '../src/lib/visiblePolling.js';

function environment() {
  const page = new EventTarget(); page.visibilityState = 'visible';
  const browser = new EventTarget(); browser.navigator = { onLine: true };
  let tick;
  browser.setInterval = (fn, ms) => { assert.equal(ms, 30000); tick = fn; return 1; };
  browser.clearInterval = () => { tick = null; };
  return { page, browser, tick: () => tick?.() };
}
test('polling skips hidden/offline pages and resumes; cleanup stops listeners', async () => {
  const env = environment(); let calls = 0;
  const stop = startVisiblePolling(async () => { calls++; }, () => {}, env.browser, env.page);
  await Promise.resolve(); assert.equal(calls, 1);
  env.page.visibilityState = 'hidden'; await env.tick(); assert.equal(calls, 1);
  env.page.visibilityState = 'visible'; env.browser.navigator.onLine = false;
  await env.tick(); assert.equal(calls, 1);
  env.browser.navigator.onLine = true; env.browser.dispatchEvent(new Event('online'));
  await Promise.resolve(); assert.equal(calls, 2);
  stop(); env.page.dispatchEvent(new Event('visibilitychange')); assert.equal(calls, 2);
});
test('pending requests never overlap and are aborted on unmount', async () => {
  const env = environment(); let calls = 0; let signal;
  const stop = startVisiblePolling(s => { calls++; signal = s; return new Promise(() => {}); }, () => {}, env.browser, env.page);
  await env.tick(); await env.tick(); assert.equal(calls, 1);
  stop(); assert.equal(signal.aborted, true);
});
test('failure clears the indicator and subsequent polling can recover', async () => {
  const env = environment(); let calls = 0; let failures = 0;
  const stop = startVisiblePolling(async () => { if (++calls === 1) throw new Error('offline'); }, () => { failures++; }, env.browser, env.page);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(failures, 1);
  await env.tick(); assert.equal(calls, 2);
  stop();
});
