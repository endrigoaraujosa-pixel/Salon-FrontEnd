// One request at a time, only while the page is visible and connected.
export function startVisiblePolling(task, onUnavailable = () => {}, browser = window, page = document) {
  let stopped = false;
  let active;
  const run = async () => {
    if (stopped) return;
    if (page.visibilityState !== 'visible' || browser.navigator.onLine === false) {
      active?.abort();
      onUnavailable();
      return;
    }
    if (active) return;
    const controller = new AbortController();
    active = controller;
    try { await task(controller.signal); }
    catch { if (!stopped) onUnavailable(); }
    finally { if (active === controller) active = null; }
  };
  const unavailable = () => { if (!stopped) { active?.abort(); onUnavailable(); } };
  const timer = browser.setInterval(run, 30000);
  page.addEventListener('visibilitychange', run);
  browser.addEventListener('online', run);
  browser.addEventListener('offline', unavailable);
  run();
  return () => {
    stopped = true;
    active?.abort();
    browser.clearInterval(timer);
    page.removeEventListener('visibilitychange', run);
    browser.removeEventListener('online', run);
    browser.removeEventListener('offline', unavailable);
  };
}
