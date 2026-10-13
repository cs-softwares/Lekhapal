import { SERVICE_MOBILE_PRESENTATION_SCRIPT } from './serviceMobilePresentation';
import { BHU_NAKSHA_PRESENTATION_SCRIPT } from './bhuNakshaPresentation';

// User-approved Bhulekh appearance: see docs/approved-bhulekh-baseline.md.
// Presentation-only adjustments to known public UP portal layouts.
// Government form fields, actions and submit handlers remain unchanged.
export const UP_PORTAL_PRESENTATION_SCRIPT =
  BHU_NAKSHA_PRESENTATION_SCRIPT +
  SERVICE_MOBILE_PRESENTATION_SCRIPT +
  `(function () {
  if (location.origin === 'https://rccms.up.gov.in' && /^\\/dashboard\\/login\\/?$/.test(location.pathname)) {
    function simplifyRc9Login() {
      if (!document.head) return;
      var rc9Style = document.getElementById('lekhpal-rc9-portraits') || document.createElement('style');
      rc9Style.id = 'lekhpal-rc9-portraits';
      rc9Style.textContent = 'header:has(img[alt="Board of Revenue Logo"]), .card:has(> .card-body > img[alt="श्री नरेंद्र मोदी"]), .card:has(> .card-body > img[alt="श्री योगी आदित्यनाथ"]) { display: none !important; }';
      if (!rc9Style.parentNode) document.head.appendChild(rc9Style);
    }
    simplifyRc9Login();
    if (!document.head) document.addEventListener('DOMContentLoaded', simplifyRc9Login, { once: true });
    return;
  }
  if (location.origin !== 'https://upbhulekh.gov.in') return;
  function apply() {
    if (!document.documentElement) return;
    document.documentElement.toggleAttribute('data-lekhpal-directory', /^#\\/(districts_list|tehsils_list|parganaReport|landTypeReports|login)(?:[?]|$)/.test(location.hash));
    if (!document.head) return;
    var style = document.getElementById('lekhpal-portal-presentation') || document.createElement('style');
    // The app toolbar does not use the website icon. Its uncached 700 KB icon
    // otherwise downloads again on hash navigation and competes with service data.
    var icon = document.querySelector('link[rel~="icon"]') || document.createElement('link');
    icon.rel = 'icon';
    var emptyIcon = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    if (icon.href !== emptyIcon) icon.href = emptyIcon;
    if (!icon.parentNode) document.head.appendChild(icon);
    style.id = 'lekhpal-portal-presentation';
    // Hide the shared website masthead on every Bhulekh screen.
    // The official service forms and the native app toolbar stay unchanged.
    style.textContent = 'app-root > section:has(img[alt="State Emblem of India"]), div.d-flex:has(> div.text-center > a > img[alt="PM Narendra Modi"]), div.text-center:has(> a > img[alt="PM Narendra Modi"]), div.text-center:has(> a > img[alt="CM Yogi Adityanath"]) { display: none !important; }';
    if (/^\\/bhulekh\\/(?:index\\.jsp)?$/.test(location.pathname)) {
      var viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) { viewport = document.createElement('meta'); viewport.name = 'viewport'; document.head.appendChild(viewport); }
      viewport.content = 'width=device-width, initial-scale=1, user-scalable=yes';
      style.textContent += 'html, body { margin: 0 !important; width: 100% !important; } header, main, .container, ul.login-types { min-width: 0 !important; width: 100% !important; box-sizing: border-box; } header { position: relative !important; } header > .float-left, header > .float-right { float: none !important; } header .logo { padding: 8px 12px !important; } header .nav-menu { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px; margin: 0 !important; } header .nav-menu li a span { padding: 10px !important; } header + .gap-type-8 { display: none !important; } main .block-1 { display: block !important; height: auto !important; min-width: 0 !important; width: 100% !important; max-width: 100% !important; } main .container { padding: 12px !important; } main .container > div[style*="font-size: 4em"] { font-size: 26px !important; } main .container > div[style*="font-size: 3em"] { font-size: 22px !important; } main .container > div[style*="font-size: 1.5em"] { font-size: 16px !important; } ul.login-types { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 12px; overflow: visible !important; } ul.login-types li { width: auto !important; margin: 0 !important; opacity: 1 !important; left: 0 !important; transform: none !important; } ul.login-types li a .tab { height: auto !important; min-height: 190px; } ul.login-types li a .tab .text { height: auto !important; min-height: 90px; padding: 12px 6px !important; } ul.login-types li a .tab .icon { padding: 12px 6px !important; }';
    }
    // Let the document own vertical scrolling, so Android can reach the final row.
    // Keep every column inside the phone viewport instead of a 600px canvas.
    style.textContent += \`
      @media (max-width: 600px) {
        html[data-lekhpal-directory], html[data-lekhpal-directory] body {
          width: 100% !important;
          height: auto !important;
          min-height: 100% !important;
          margin: 0 !important;
          overflow: visible !important;
        }
        html[data-lekhpal-directory] app-root {
          display: block !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
        }
        html[data-lekhpal-directory] .container-fluid,
        html[data-lekhpal-directory] .card,
        html[data-lekhpal-directory] .card-body,
        html[data-lekhpal-directory] .table-responsive {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          box-sizing: border-box;
        }
        html[data-lekhpal-directory] .container-fluid { padding: 0 8px !important; }
        html[data-lekhpal-directory] .card-body { padding: 8px !important; }
        html[data-lekhpal-directory] .table-responsive table {
          table-layout: fixed;
          width: 100% !important;
          min-width: 0 !important;
          margin-bottom: 0;
        }
        html[data-lekhpal-directory] .table-responsive th,
        html[data-lekhpal-directory] .table-responsive td {
          position: static !important;
          padding: 8px 4px !important;
          font-size: 13px;
          line-height: 1.5;
          white-space: normal !important;
          overflow-wrap: anywhere;
        }
        html[data-lekhpal-directory] .table-responsive th:first-child,
        html[data-lekhpal-directory] .table-responsive td:first-child { width: 48px; }
      }
    \`;
    if (!style.parentNode) document.head.appendChild(style);
  }
  apply();
  if (typeof window.__lekhpalDirectoryPresentation === 'function') {
    window.removeEventListener('hashchange', window.__lekhpalDirectoryPresentation);
  }
  window.__lekhpalDirectoryPresentation = apply;
  window.addEventListener('hashchange', apply);
  if (!document.head) document.addEventListener('DOMContentLoaded', apply, { once: true });
})(); true;`;
