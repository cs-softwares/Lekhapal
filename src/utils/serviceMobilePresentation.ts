// Scoped presentation fixes for the official layouts verified on Android.
// Keep the original form controls, validation, links and session untouched.
export const SERVICE_MOBILE_PRESENTATION_SCRIPT = `(function () {
  var host = location.hostname, path = location.pathname.toLowerCase(), css = '';
  if (host === 'bor.up.gov.in' && path === '/revenuesoft/login.aspx') {
    css = \`
      .main-container { width: 100% !important; min-width: 0 !important; max-width: 100% !important; padding: 16px; box-sizing: border-box; }
      .main-container .left-cp { width: 100% !important; max-width: 440px; float: none !important; margin: 0 auto; }
      .main-container input, .main-container select { max-width: 100%; box-sizing: border-box; }
      header .logo { max-width: 100%; box-sizing: border-box; }
    \`;
  } else if (host === 'igrsup.gov.in' && path === '/igrsup/defaultaction.action') {
    css = \`
      #prerna4_header_div, #prerna4_header_div .row { width: 100% !important; min-width: 0 !important; margin-left: 0 !important; margin-right: 0 !important; }
      .header.surround-border { width: auto !important; max-width: 100%; white-space: normal !important; overflow-wrap: anywhere; height: auto !important; }
      #prerna4_header_div .navbar-brand { display: block; white-space: normal !important; overflow-wrap: anywhere; max-width: 100%; margin-right: 0; }
    \`;
  } else if (host === 'svamitva.up.gov.in' && path === '/') {
    css = \`
      .header-container { flex-wrap: wrap !important; gap: 16px; }
      .header-container > div { min-width: 0; max-width: 100%; }
      .pmcm-section { flex-wrap: wrap; justify-content: center; width: 100%; gap: 12px !important; }
      .pmcm-section .pm-box { flex: 1 1 120px; max-width: 145px; }
    \`;
  } else if (host === 'vaad.up.nic.in' && /^\\/default(?:_new)?\\.aspx$/.test(path)) {
    css = \`
      .container_cs { width: 100% !important; max-width: 100% !important; min-width: 0 !important; box-sizing: border-box; }
      .slideLeft, .slideRight { animation: none !important; transform: none !important; }
      .header-container table, .header-container table > tbody, .header-container table > tbody > tr { display: block !important; width: 100% !important; min-width: 0 !important; }
      .header-container table > tbody > tr > td { display: block !important; width: 100% !important; box-sizing: border-box; padding: 8px !important; }
      .header-container table td > div { white-space: normal !important; overflow-wrap: anywhere; }
      .header-container table td:nth-child(2) > div:first-child { font-size: 24px !important; }
    \`;
  } else if (host === 'bor.up.gov.in' && path === '/department_login.aspx') {
    css = '.container, .container-fluid { max-width: 100%; box-sizing: border-box; } .navbar .d-flex { min-width: 0; flex-wrap: wrap; }';
  } else if (host === 'upbhulekh.gov.in' && /^\\/ansh(?:\\/|$)/.test(path)) {
    css = \`
      body { margin: 0 !important; background: #f4f7fb !important; }
      #root .container { width: 100% !important; max-width: 100% !important; box-sizing: border-box; padding-left: 12px !important; padding-right: 12px !important; }
      #b-header, .b-bg-image .col-lg-5:has(.b-left-head) { display: none !important; }
      #b-accessibility { flex-wrap: wrap; gap: 4px; padding-top: 6px; padding-bottom: 6px; }
      #b-accessibility .b-ministryname { font-size: 11px !important; }
      #b-accessibility .b-acc-icons { margin-left: 0 !important; }
      #b-accessibility .b-acc-icons .px-3 { padding-left: 8px !important; padding-right: 8px !important; }
      #b-accessibility img { width: 20px; height: 20px; }
      .globalnav-bg .navbar { padding-top: 6px !important; padding-bottom: 6px !important; }
      .b-nav-mobile { gap: 8px; flex-wrap: wrap; }
      .globalnav-bg a { font-size: 13px !important; white-space: normal; }
      .b-bg-image { padding-top: 12px !important; padding-bottom: 12px !important; background-image: none !important; }
      .b-bg-image .row { margin: 0 !important; }
      .b-login-sec { width: 100% !important; padding: 0 !important; background: #ffffff !important; opacity: 1 !important; border-radius: 12px; color: #172033; }
      .b-login-w { width: 100% !important; max-width: 100% !important; padding: 16px !important; box-sizing: border-box; }
      .b-login-head { margin: 0 0 12px !important; color: #172033 !important; font-size: 22px !important; }
      .b-login-sec label, .b-login-sec .labelColor { color: #334155 !important; font-size: 15px !important; }
      .b-login-sec .form-group { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin-bottom: 12px !important; }
      .b-login-sec .form-control { min-height: 44px; font-size: 16px !important; }
      .b-login-sec #refreshCaptcha { color: #1e40af !important; min-width: 44px; min-height: 44px; }
      .b-login-sec button[type=submit] { min-height: 44px; width: 100%; }
      .footer-bs { padding: 12px !important; font-size: 11px; }
    \`;
  } else if (host === 'upbhulekh.gov.in' && path.startsWith('/bhulekh_login/')) {
    css = '.navbar, .row { margin-left: 0 !important; margin-right: 0 !important; max-width: 100%; box-sizing: border-box; }';
  } else if (host === 'www.india.gov.in' || host === 'india.gov.in') {
    css = '.cc-window { max-width: calc(100vw - 24px) !important; left: 12px !important; right: 12px !important; box-sizing: border-box; } header { max-width: 100vw; box-sizing: border-box; }';
  } else if (host === 'voters.eci.gov.in' && path === '/') {
    css = '.homepage-left-section, .homepage-left-section .row { margin-left: 0 !important; margin-right: 0 !important; max-width: 100%; box-sizing: border-box; }';
  } else return;
  function apply() {
    if (!document.head) return;
    var viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) { viewport = document.createElement('meta'); viewport.name = 'viewport'; document.head.appendChild(viewport); }
    viewport.content = 'width=device-width, initial-scale=1, user-scalable=yes';
    var style = document.getElementById('lekhpal-service-mobile') || document.createElement('style');
    style.id = 'lekhpal-service-mobile';
    style.textContent = '@media (max-width: 600px) {' + css + '}';
    if (!style.parentNode) document.head.appendChild(style);
  }
  apply();
  document.addEventListener('DOMContentLoaded', apply, { once: true });
})(); true;`;
