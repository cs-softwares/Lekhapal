import { BHULEKH_SERVICE_LABELS, BhulekhService } from '../data/bhulekhOptions';

// Use the official navigation button as soon as Angular renders it.
// No polling delay, guessed session state, field filling or form submission.
export function buildBhulekhServiceLaunch(service: BhulekhService): string {
  return `(function launchBhulekhService() {
    if (location.origin !== 'https://upbhulekh.gov.in' || window.__lekhpalServiceLaunch) return;
    if (!document.documentElement) { document.addEventListener('DOMContentLoaded', launchBhulekhService, { once: true }); return; }
    window.__lekhpalServiceLaunch = true;
    var expected = ${JSON.stringify(BHULEKH_SERVICE_LABELS[service])};
    var clicked = false, finished = false;
    function normalize(value) { return value.normalize('NFC').replace(/[\\uE000-\\uF8FF]/g, '').replace(/\\s+/g, ' ').trim(); }
    function report(status) {
      if (finished) return;
      if (status === 'ready') { finished = true; cleanup(); }
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'bhulekh-service', service: ${JSON.stringify(
        service,
      )}, status: status }));
    }
    function check() {
      if (finished) return;
      if (clicked && location.hash !== '#/home') { report('ready'); return; }
      if (clicked) return;
      if (location.hash !== '#/home') return;
      var matches = Array.from(document.querySelectorAll('button')).filter(function (button) {
        return normalize(button.textContent || '') === normalize(expected);
      });
      if (matches.length === 1) {
        clicked = true;
        matches[0].click();
        if (location.hash !== '#/home') report('ready');
      }
    }
    var observer = new MutationObserver(check);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    window.addEventListener('hashchange', check);
    function cleanup() {
      observer.disconnect();
      clearTimeout(timeout);
      window.removeEventListener('hashchange', check);
    }
    window.__lekhpalServiceLaunchCleanup = cleanup;
    // A slow first download must not disable navigation when the menu finally arrives.
    var timeout = setTimeout(function () { report('unavailable'); }, 60000);
    check();
  })(); true;`;
}

export function isBhulekhWebsiteUrl(url: string): boolean {
  return /^https:\/\/upbhulekh\.gov\.in(?:[/?#]|$)/.test(url);
}
