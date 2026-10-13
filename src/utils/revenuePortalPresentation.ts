const ENTRY_CSS = `
      html { -webkit-text-size-adjust: 100%; }
      body { margin: 0 !important; background: #f3f6fc !important; font-family: sans-serif !important; }
      body > center { width: 100%; }
      header, main, .container, ul.login-types { min-width: 0 !important; width: 100% !important; box-sizing: border-box; }
      header { position: relative !important; background: #fff !important; color: #1e293b !important; box-shadow: none !important; padding: 12px !important; border-bottom: 1px solid #dde5f0; }
      header > .float-left, header > .float-right { float: none !important; }
      header .logo { display: flex; align-items: center; justify-content: center; padding: 0 !important; }
      header .logo > .float-left { padding: 0 5px !important; color: #1e293b !important; }
      header .logo img { width: 36px; height: auto; }
      header .nav-menu { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; padding: 0 !important; margin: 12px 0 0 !important; }
      header .nav-menu li { margin: 0 !important; }
      header .nav-menu li a span { padding: 12px !important; background: #e8effc !important; color: #1e40af !important; font-size: 14px !important; border-radius: 8px !important; }
      main { padding: 20px 14px !important; }
      main .block-1 { display: block !important; height: auto !important; background: none !important; overflow: visible !important; }
      main .container { max-width: 640px !important; }
      main .container > div:not([class]) { color: #1e293b !important; font-size: 17px !important; line-height: 1.5 !important; text-shadow: none !important; }
      main .container > div:not([class]):nth-child(2) { font-size: 23px !important; font-weight: 700; }
      main [class^="gap-type-"], center > .gap-type-8 { display: none !important; }
      ul.login-types { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 20px 0 0 !important; padding: 0 !important; overflow: visible !important; }
      ul.login-types li { display: block !important; width: auto !important; margin: 0 !important; left: 0 !important; opacity: 1 !important; }
      ul.login-types li a { display: block; height: 100%; }
      ul.login-types li a .tab { height: 100% !important; box-sizing: border-box; border: 1px solid #dce4ef; border-radius: 12px; overflow: hidden; background: #fff !important; box-shadow: none !important; }
      ul.login-types li a .tab .icon { display: flex; align-items: center; justify-content: space-between; gap: 4px; padding: 12px !important; background: #e8effc !important; color: #1e40af !important; border: 0 !important; }
      ul.login-types li a .tab .icon span { font-size: 15px !important; font-weight: 700; }
      ul.login-types li a .tab .icon i { font-size: 20px !important; }
      ul.login-types li a .tab .text { padding: 14px 10px !important; height: auto !important; font-size: 16px !important; line-height: 1.45 !important; color: #1e293b !important; overflow-wrap: anywhere; }
      ul.login-types li a .tab .note:empty { display: none !important; }
      ul.login-types li a:focus-visible .tab { outline: 3px solid #2563eb; outline-offset: 2px; }
      header a, ul.login-types a { -webkit-tap-highlight-color: transparent; }
      footer { position: static !important; padding: 16px !important; box-sizing: border-box; background: #1e3a5f !important; }
      footer .float-left, footer .float-right { float: none !important; width: auto !important; padding: 8px 0 !important; }
      @media (max-width: 320px) { ul.login-types { grid-template-columns: minmax(0, 1fr); } }
    `;

const LOGIN_CSS = `
  main .main-container { width: 100% !important; min-width: 0 !important; max-width: 520px !important; margin: 0 auto !important; box-sizing: border-box; }
  .main-container .left-cp, .main-container .right-cp { width: 100% !important; float: none !important; height: auto !important; box-sizing: border-box; }
  .main-container .box-shadow-1 { border: 1px solid #dce4ef; border-radius: 14px; overflow: hidden; box-shadow: none !important; }
  .main-container .padding-20 { padding: 18px !important; }
  #frmLogin { width: 100%; box-sizing: border-box; }
  #frmLogin .input-wrap { margin-bottom: 16px !important; }
  #frmLogin label { display: block; font-size: 17px !important; line-height: 1.5; margin-bottom: 6px; }
  #frmLogin .text-field, #frmLogin .input-select { width: 100% !important; max-width: 100% !important; box-sizing: border-box; min-height: 48px; font-size: 18px !important; border-radius: 8px; }
  #frmLogin .input-wrap > .float-left, #frmLogin .input-wrap > .float-right { float: none !important; width: 100% !important; box-sizing: border-box; }
  #frmLogin img.captcha-img { width: 139px !important; max-width: 100% !important; height: auto; }
  #frmLogin #ref-captcha { display: inline-block; min-width: 44px; min-height: 44px; text-align: center; }
  #frmLogin #cap { margin-top: 10px; }
  #frmLogin #capdiv { margin-top: 12px; }
  #frmLogin button[type="submit"], #frmLogin #btnLogin { float: none !important; width: 100%; min-height: 48px; font-size: 18px; border-radius: 8px; background: #1e40af !important; border-color: #1e40af !important; }
  #frmLogin .actionMessage, #frmLogin .error { font-size: 16px !important; line-height: 1.5; overflow-wrap: anywhere; }
  header .back-btn { color: #1e40af !important; background: #e8effc !important; padding: 12px 18px !important; border-radius: 8px; margin-top: 10px; display: inline-block; }
  header a:hover .back-btn, header a:active .back-btn { background: #dbe7ff !important; }
  header a:focus-visible .back-btn { outline: 2px solid #2563eb; outline-offset: 2px; }
`;

// Only the legacy role-selection and login pages. Original forms and their
// handlers stay mounted; authenticated work and public Khatauni are untouched.
export const REVENUE_PORTAL_PRESENTATION = String.raw`
(function () {
  var entryPage = (
    (location.hostname === 'upbhulekh.gov.in' && location.pathname === '/bhulekh/') ||
    (location.hostname === 'svamitva.up.gov.in' && location.pathname === '/public/homePage_login.jsp')
  );
  var loginPage = (
    (location.hostname === 'upbhulekh.gov.in' && ['/bhulekh/indexLogin', '/bhulekh/Login'].indexOf(location.pathname) !== -1) ||
    (location.hostname === 'svamitva.up.gov.in' && ['/app/indexLogin.jsp', '/app/Login'].indexOf(location.pathname) !== -1)
  );
  if (location.protocol !== 'https:' || (!entryPage && !loginPage) || window.top !== window.self) return;
  function apply() {
    if (!document.head) return;
    if (entryPage && !document.querySelector('main .login-types')) return;
    if (loginPage && !document.querySelector('#frmLogin input[type="password"]')) return;
    // The legacy SVAMITVA Home link is HTTP and is rejected by our HTTPS-only
    // navigation policy. On login, Home returns to the official role selector,
    // matching Bhulekh's login Home behavior. Do not alter form destinations.
    if (location.hostname === 'svamitva.up.gov.in') {
      Array.prototype.forEach.call(document.querySelectorAll('header a'), function (link) {
        var href = link.getAttribute('href');
        if (href === 'http://svamitva.up.gov.in/' || href === 'https://svamitva.up.gov.in/') {
          link.setAttribute('href', loginPage
            ? 'https://svamitva.up.gov.in/public/homePage_login.jsp'
            : 'https://svamitva.up.gov.in/');
        }
      });
    }
    var viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1';
    var style = document.getElementById('lekhpal-revenue-entry-mobile');
    if (!style) {
      style = document.createElement('style');
      style.id = 'lekhpal-revenue-entry-mobile';
      document.head.appendChild(style);
    }
    style.textContent = ${JSON.stringify(ENTRY_CSS)} + (loginPage ? ${JSON.stringify(LOGIN_CSS)} : '');
  }
  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
})(); true;
`;
