import type { BhulekhService } from '../data/bhulekhOptions';
import { buildBhulekhServiceLaunch } from './bhulekhServiceLaunch';

export const BHULEKH_HOME = 'https://upbhulekh.gov.in/#/home';

const DIRECTORY_TARGETS: Record<string, string> = {
  '#/districts_list': 'districts_list',
  '#/tehsils_list': 'tehsils_list',
  '#/parganaReport': 'parganareport',
  '#/landTypeReports': 'landtypereports',
  '#/login': 'login',
};

export function getBhulekhPageTarget(url: string, service?: BhulekhService) {
  if (service && url.startsWith('https://upbhulekh.gov.in/#/')) {
    return service === 'certified' ? 'index-login' : 'selection';
  }
  return url.startsWith('https://upbhulekh.gov.in/#/')
    ? DIRECTORY_TARGETS[url.slice(url.indexOf('#'))]
    : undefined;
}

export function buildBhulekhPageReady(
  url: string,
  requestId: string,
  service?: BhulekhService,
) {
  const target = getBhulekhPageTarget(url, service);
  const hash = service
    ? service === 'certified'
      ? '#/index-login'
      : '#/selection'
    : url.slice(url.indexOf('#'));
  if (!target) return '';
  return `(function watchPage() {
    if (location.origin !== 'https://upbhulekh.gov.in' || location.pathname !== '/') return;
    if (!document.documentElement) { document.addEventListener('DOMContentLoaded', watchPage, { once: true }); return; }
    var request = ${JSON.stringify(requestId)};
    if (window.__lekhpalSessionRequest !== request || window.__lekhpalPageReadyRequest === request) return;
    if (window.__lekhpalPageReadyCleanup) window.__lekhpalPageReadyCleanup();
    window.__lekhpalPageReadyRequest = request;
    var cancelled = false, frame = 0;
    function matches() {
      return !cancelled && window.__lekhpalSessionRequest === request &&
        location.hash === ${JSON.stringify(hash)} &&
        document.querySelector(${JSON.stringify(target)});
    }
    function check() {
      if (!matches() || frame) return;
      // The URL can change before Angular replaces the old component. Reveal
      // only after the expected component has had a chance to paint.
      frame = requestAnimationFrame(function () {
        frame = requestAnimationFrame(function () {
          frame = 0;
          if (!matches()) return;
          cleanup();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'bhulekh-page-ready', requestId: request,
          }));
        });
      });
    }
    var observer = new MutationObserver(check);
    function cleanup() {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', check);
    }
    window.__lekhpalPageReadyCleanup = cleanup;
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('hashchange', check);
    check();
  })(); true;`;
}

export function buildBhulekhSessionIdle(requestId: string) {
  return `(function () {
    if (location.origin !== 'https://upbhulekh.gov.in' || location.pathname !== '/') return;
    window.__lekhpalSessionRequest = ${JSON.stringify(requestId)};
    if (window.__lekhpalPageReadyCleanup) window.__lekhpalPageReadyCleanup();
    window.__lekhpalPageReadyRequest = null;
    if (window.__lekhpalServiceLaunchCleanup) window.__lekhpalServiceLaunchCleanup();
    window.__lekhpalServiceLaunch = false;
    if (window.__lekhpalKhatauniCleanup) window.__lekhpalKhatauniCleanup();
    window.__lekhpalKhatauniVersion = null;
  })(); true;`;
}

// Navigate the loaded Angular document instead of downloading its uncached bundle again.
export function buildBhulekhSessionRequest(
  url: string,
  service: BhulekhService | undefined,
  requestId: string,
) {
  if (!/^https:\/\/upbhulekh\.gov\.in\/#\/[\w-]+$/.test(url)) return '';
  const hash = service ? '#/home' : url.slice(url.indexOf('#'));
  const launch = service ? buildBhulekhServiceLaunch(service) : '';
  return `(function () {
    if (location.origin !== 'https://upbhulekh.gov.in' || location.pathname !== '/') return;
    if (window.__lekhpalSessionRequest !== ${JSON.stringify(requestId)}) {
      window.__lekhpalSessionRequest = ${JSON.stringify(requestId)};
      if (window.__lekhpalPageReadyCleanup) window.__lekhpalPageReadyCleanup();
      window.__lekhpalPageReadyRequest = null;
      if (window.__lekhpalServiceLaunchCleanup) window.__lekhpalServiceLaunchCleanup();
      window.__lekhpalServiceLaunch = false;
      if (window.__lekhpalKhatauniCleanup) window.__lekhpalKhatauniCleanup();
      window.__lekhpalKhatauniVersion = null;
      var style = document.getElementById('lekhpal-khatauni-copy');
      if (style) style.remove();
      location.hash = ${JSON.stringify(hash)};
    }
    ${launch}
    ${buildBhulekhPageReady(url, requestId, service)}
  })(); true;`;
}
