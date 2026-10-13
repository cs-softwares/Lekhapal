// Keep the official map, location selection and plot search; adapt their layout.
export const BHU_NAKSHA_PRESENTATION_SCRIPT = `(function () {
  if (location.origin !== 'https://upbhunaksha.gov.in') return;
  function apply() {
    if (!document.head) return;
    var viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1, user-scalable=yes';
    var style = document.getElementById('lekhpal-bhunaksha-mobile');
    if (style) return;
    style = document.createElement('style');
    style.id = 'lekhpal-bhunaksha-mobile';
    style.textContent = \`
      @media (max-width: 900px) {
        html, body { width: 100%; margin: 0 !important; }
        body:has(app-home) { overflow: hidden !important; }
        app-layout:has(app-home) > app-header {
          height: 44px !important;
          box-shadow: none !important;
        }
        app-layout:has(app-home) app-header .header {
          height: 44px !important;
          min-height: 44px !important;
          padding: 0 12px !important;
          flex-direction: row !important;
          background: #f8fafc !important;
          color: #334155 !important;
          box-shadow: none !important;
          border-bottom: 1px solid #e2e8f0;
          box-sizing: border-box;
        }
        app-layout:has(app-home) app-header .logoStyle { font-size: 16px !important; color: #334155 !important; }
        app-layout:has(app-home) app-header .header a.text-white,
        app-layout:has(app-home) app-header button { color: #1e40af !important; }
        app-layout:has(app-home) > .content { margin-top: 44px !important; }
        app-home, app-home > .app-container {
          display: block;
          height: calc(100vh - 44px) !important;
          height: calc(100dvh - 44px) !important;
          min-height: 0 !important;
          width: 100% !important;
        }
        app-home .main-content { height: 100% !important; min-height: 0 !important; }
        app-home #mapData {
          inset: 0 !important;
          height: 100% !important;
          width: 100% !important;
          min-height: 0 !important;
          padding: 0 !important;
        }
        app-home .left-sidebar, app-home .right-sidebar {
          top: 44px !important;
          bottom: 0 !important;
          width: min(340px, calc(100% - 56px)) !important;
          max-width: calc(100% - 56px) !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior: contain;
          box-sizing: border-box;
          z-index: 40 !important;
          padding: 0 0 16px !important;
        }
        app-home .left-sidebar .sidebar { width: 100% !important; border: 0 !important; }
        app-home .left-sidebar mat-card {
          background: #fff !important;
          animation: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        app-home .sidebar-header { padding: 16px 52px 12px 16px !important; margin: 0 0 12px !important; }
        app-home mat-card-title { font-size: 18px !important; }
        app-home mat-card-content { padding: 0 16px !important; }
        app-home app-levels form > mat-label { display: block; font-size: 14px; }
        app-home .small-select, app-home .search-form mat-form-field { width: 100% !important; min-width: 0 !important; }
        app-home .search-form { margin: 8px 0 !important; }
        app-home .mat-mdc-form-field-infix { min-width: 0 !important; width: auto !important; }
        app-home .toggle-left-button, app-home .toggle-right-button,
        app-home .toggle-inside-button {
          width: 44px !important; height: 44px !important;
          display: flex !important; align-items: center; justify-content: center;
          padding: 0 !important; font-size: 24px !important;
          box-sizing: border-box;
          border-radius: 12px !important;
          box-shadow: 0 2px 8px #0f172a24 !important;
        }
        app-home .toggle-left-button, app-home .toggle-right-button { top: 12px !important; background: #16826b !important; }
        app-home .toggle-left-button { left: 12px !important; }
        app-home .toggle-right-button { right: 12px !important; }
        app-home .toggle-inside-button { top: 8px !important; right: 8px !important; box-shadow: none !important; }
        app-home .right-sidebar app-layer > .container { padding: 68px 16px 16px !important; }
        app-home:has(.right-sidebar.open) .toggle-right-button { z-index: 50 !important; }
        app-home .ol-zoom { top: auto !important; left: 12px !important; bottom: 56px !important; }
        app-home .ol-control button { min-width: 40px !important; min-height: 40px !important; font-size: 24px !important; }
        app-home #map-label { bottom: 44px !important; max-width: 65%; font-size: 12px !important; }
        app-home #disclaimer { bottom: 8px !important; margin: 0 52px 0 8px !important; font-size: 10px !important; }
        app-home .modal-small-bottom-left { left: 12px !important; right: 12px !important; bottom: 12px !important; }
        app-home .modal-content-small { width: 100% !important; height: auto !important; max-height: 55dvh; box-sizing: border-box; }
        .cdk-overlay-pane { max-width: calc(100vw - 24px) !important; }
        .mat-mdc-option { min-height: 48px !important; white-space: normal !important; }
      }
    \`;
    document.head.appendChild(style);
    requestAnimationFrame(function () { window.dispatchEvent(new Event('resize')); });
  }
  apply();
  if (!document.head) document.addEventListener('DOMContentLoaded', apply, { once: true });
})(); true;`;
