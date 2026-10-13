import { buildBhulekhServiceLaunch } from './bhulekhServiceLaunch';

// Read only public location labels. Selection uses the website's own click handlers.
// Search, CAPTCHA, and the issued copy remain in the same official browser session.
export function buildBhulekhRecordScript(service: 'copy' | 'sale' | 'dispute') {
  const formTag = {
    copy: 'khatauni_rtk',
    sale: 'gata_wise',
    dispute: 'vaad_grasht',
  }[service];
  return (
    `(function installKhatauniCopy() {
  if (location.origin !== 'https://upbhulekh.gov.in') return;
  if (!document.documentElement) { document.addEventListener('DOMContentLoaded', installKhatauniCopy, { once: true }); return; }
  if (window.__lekhpalKhatauniVersion === '${service}-7') { window.__lekhpalKhatauniCopy(); return; }
  if (window.__lekhpalKhatauniCleanup) window.__lekhpalKhatauniCleanup();
  document.querySelectorAll('.lekhpal-location-summary').forEach(function (summary) { summary.remove(); });
  window.__lekhpalKhatauniVersion = '${service}-7';
  var last = '', timer;
  function update() {
    if (!document.head || !document.body) return;
    var viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) { viewport = document.createElement('meta'); viewport.name = 'viewport'; document.head.appendChild(viewport); }
    viewport.content = 'width=device-width, initial-scale=1, user-scalable=yes';
    var style = document.getElementById('lekhpal-khatauni-copy');
    if (!style || style.dataset.version !== '${service}-7') {
      if (!style) { style = document.createElement('style'); style.id = 'lekhpal-khatauni-copy'; document.head.appendChild(style); }
      style.dataset.version = '${service}-7';
      style.textContent = \`
        html, body { margin: 0 !important; width: 100% !important; min-width: 0 !important; background: #f7f9fc !important; color: #152238; font-family: sans-serif; }
        app-root > section:has(img[alt="State Emblem of India"]) { display: none !important; }
        ${formTag} { display: block; padding: 16px; width: 100%; box-sizing: border-box; }
        ${formTag} *, ${formTag} *::before, ${formTag} *::after { box-sizing: border-box; }
        ${formTag} .container-fluid { padding: 0 !important; }
        ${formTag} .height { height: auto !important; min-height: 0 !important; }
        ${formTag} .header_botton { background: #fff !important; color: #152238 !important; border: 1px solid #e2e8f0; border-radius: 18px !important; box-shadow: none !important; margin: 0 0 16px !important; padding: 14px !important; }
        ${formTag} .header_botton > div { gap: 14px !important; text-align: left !important; }
        ${formTag} .header_botton > div > div { min-width: 0 !important; width: 100% !important; }
        ${formTag} .header_botton label { color: #64748b !important; font-size: 12px !important; text-align: left; }
        ${formTag} .header_botton .invisible { display: none !important; }
        ${formTag} .header_botton button { min-height: 44px; background: #eef3ff !important; color: #2457a7 !important; border: 0 !important; border-radius: 12px; }
        ${formTag} .ng-select-container, ${formTag} .form-select { min-height: 48px !important; border: 1px solid #dce3ed !important; border-radius: 12px !important; font-size: 15px !important; background: #fff !important; }
        ${formTag} .ng-dropdown-panel { border-radius: 12px; background: #fff !important; border: 1px solid #dce3ed; box-shadow: 0 8px 24px #0f172a24; z-index: 1050 !important; }
        ${formTag} .ng-option { min-height: 48px; white-space: normal !important; font-size: 14px; }
        ${formTag} .layout { display: flex !important; flex-wrap: wrap !important; gap: 8px; height: auto !important; min-height: 0 !important; background: #fff !important; padding: 16px !important; border: 1px solid #e2e8f0 !important; border-radius: 18px !important; margin: 0 !important; width: 100% !important; box-sizing: border-box; }
        ${formTag} .layout > input[type="radio"] { position: absolute !important; opacity: 0; width: 1px; height: 1px; }
        ${formTag} .layout > label.nav { order: 0; flex: 1 1 calc(50% - 8px) !important; min-width: 0 !important; width: auto !important; height: auto !important; min-height: 52px; display: flex !important; align-items: center; padding: 10px !important; margin: 0 !important; font-size: 12px !important; line-height: 18px !important; color: #334155 !important; background: #f1f5f9 !important; border: 1px solid #e2e8f0 !important; border-radius: 12px !important; box-sizing: border-box; }
        ${formTag} .layout > input:checked + .page + label { background: #2457a7 !important; color: #fff !important; border-color: #2457a7 !important; }
        ${formTag} .layout > .page { order: 1; position: relative !important; z-index: 2; overflow: visible !important; width: 100% !important; min-width: 0 !important; height: auto !important; margin: 8px 0 0 !important; padding: 0 !important; border: 0 !important; background: transparent !important; display: none !important; }
        ${formTag} .layout > input:checked + .page { display: block !important; }
        ${formTag} .page-contents { width: 100% !important; min-width: 0 !important; padding: 0 !important; margin: 0 !important; height: auto !important; }
        ${formTag} .inputAndSeacrh { margin: 0 !important; }
        ${formTag} .inputAndSeacrh > .d-flex { display: flex !important; flex-wrap: wrap !important; gap: 8px; padding: 0 !important; }
        ${formTag} .inputAndSeacrh > .d-flex > input { width: 100% !important; flex: 1 0 100%; min-width: 0 !important; height: 50px !important; min-height: 50px; border: 1px solid #dce3ed; border-radius: 12px !important; font-size: 15px !important; padding: 12px !important; }
        ${formTag} .inputAndSeacrh button { flex: 1; min-width: 0; height: 48px !important; min-height: 48px; border-radius: 12px !important; font-size: 14px !important; margin: 0 !important; }
        ${formTag} button.btn-primary { background: #2457a7 !important; border-color: #2457a7 !important; }
        ${formTag} .inputAndSeacrh button.btn-danger { background: #16826b !important; border-color: #16826b !important; }
        ${formTag} .owner-list { height: auto !important; max-height: 320px; min-height: 0 !important; border: 0 !important; margin: 12px 0 !important; }
        ${formTag} .owner-list:empty { display: none !important; }
        ${formTag} .owner-list label { white-space: normal !important; padding: 10px 0; font-size: 14px; }
        ${formTag} .keyNum { min-width: 0 !important; width: 100% !important; padding: 0 !important; margin: 12px 0 0 !important; }
        ${formTag} .keyboard1 { width: 100% !important; table-layout: fixed; font-size: 14px !important; }
        ${formTag} .keyboard1 td { padding: 4px !important; }
        ${formTag} .keyboard1 .tab { display: flex; align-items: center; justify-content: center; min-width: 0 !important; min-height: 44px; width: 100% !important; border-radius: 8px; background: #eef3ff; color: #2457a7; overflow-wrap: anywhere; }
        ${formTag} .table-responsive { max-width: 100% !important; overflow-x: auto !important; }
        ${formTag} .modal-dialog { width: auto !important; max-width: calc(100% - 24px) !important; margin: 20px auto !important; }
        ${formTag} .modal-content { border-radius: 18px; }
        ${formTag} .modal input { min-height: 48px; font-size: 16px; }
        ${formTag} .modal button { min-height: 44px; }
        ${formTag} .modal .container { width: 100% !important; }
        ${formTag} .lekhpal-location-summary { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
        ${formTag} .lekhpal-location-text { flex: 1; min-width: 0; }
        ${formTag} .lekhpal-location-text strong { display: block; font-size: 15px; line-height: 22px; color: #152238 !important; overflow-wrap: anywhere; }
        ${formTag} .lekhpal-location-text span { display: block; color: #475569; font-size: 13px; line-height: 21px; white-space: pre-line; overflow-wrap: anywhere; }
        ${formTag} .lekhpal-location-summary button { flex: none; padding: 8px 12px; min-height: 44px; font-size: 13px; }
        ${formTag}:not([data-edit-location]) .header_botton > div:not(.lekhpal-location-summary) > div:not(:has(#fasliSelect)) { display: none !important; }
        /* Changing location shows only the three dependent place selectors. */
        ${formTag}[data-edit-location] .header_botton > div:not(.lekhpal-location-summary) > div:not(:has(#districtSelect, #tehsilSelect, #villageSelect)),
        ${formTag}[data-edit-location] .layout { display: none !important; }
        ${formTag}[data-edit-location] .header_botton > div:not(.lekhpal-location-summary) { display: flex !important; flex-direction: column; align-items: stretch !important; text-align: left !important; }
        ${formTag}[data-edit-location] .header_botton > div > div:has(#districtSelect, #tehsilSelect, #villageSelect) { padding: 12px; background: #f7f9fc; border: 1px solid #e2e8f0; border-radius: 14px; }
        ${formTag} .header_botton label:is([for="districtSelect"], [for="tehsilSelect"], [for="villageSelect"]) { display: block !important; color: #152238 !important; font-size: 15px !important; font-weight: 700 !important; line-height: 22px; margin: 0 0 10px !important; }
        ${formTag}[data-edit-location] ng-select { display: block; width: 100%; min-width: 0; }
        ${formTag}[data-edit-location] .ng-select-container { height: auto !important; min-height: 48px !important; }
        /* Keep each list in the page flow so it cannot cover the next selector. */
        ${formTag}[data-edit-location] .ng-dropdown-panel { position: relative !important; top: auto !important; bottom: auto !important; left: auto !important; width: 100% !important; margin: 8px 0 0 !important; overflow: hidden; box-shadow: none; }
        ${formTag}[data-edit-location] .ng-dropdown-panel .ng-option { display: flex; align-items: center; padding: 12px !important; border-bottom: 1px solid #eef2f6; color: #152238; text-align: left; }
        ${formTag}[data-edit-location] .ng-dropdown-panel .ng-option-selected { background: #eef3ff !important; color: #2457a7 !important; font-weight: 600; }
        ${formTag} .header_botton > div > div:has(#fasliSelect) { display: flex; align-items: center; gap: 12px; }
        ${formTag} .header_botton label[for="fasliSelect"] { flex: 1; margin: 0 !important; font-size: 11px !important; line-height: 17px; }
        ${formTag} #fasliSelect { flex: 1.3; width: 0; min-width: 0; font-size: 13px !important; padding: 8px 26px 8px 10px !important; }
        ${formTag} .header_botton:has(.ng-select-opened) { position: relative; z-index: 10; }
        ${formTag} .page .row { margin: 0 !important; --bs-gutter-x: 0; }
        ${formTag} .page .row > [class*="col-"] { padding: 0 !important; }
        ${formTag} .page .mt-4 { margin-top: 8px !important; }
        ${formTag} .owner-list { max-height: none !important; overflow: visible !important; }
        ${formTag} .owner-list table { width: 100% !important; table-layout: fixed; font-size: 13px !important; }
        ${formTag} .owner-list td, ${formTag} .owner-list th { white-space: normal !important; overflow-wrap: anywhere; padding: 8px 4px !important; }
        ${formTag} .owner-list .data-item { min-width: 0; gap: 8px; min-height: 48px; padding: 12px 0 !important; align-items: flex-start !important; }
        ${formTag} .owner-list .data-item .text-wrap { flex: 1; min-width: 0; font-size: 13px; line-height: 21px; overflow-wrap: anywhere; }
        ${formTag} .owner-list td:first-child:has(input) { width: 36px; }
        ${formTag} .owner-list input[type="radio"], ${formTag} .owner-list input[type="checkbox"] { flex: 0 0 22px !important; width: 22px !important; height: 22px !important; min-width: 22px; min-height: 22px; padding: 0 !important; }
        ${formTag} .keyboard1 { display: block; margin: 0 !important; border: 0 !important; border-collapse: separate; border-spacing: 4px; }
        ${formTag} .keyboard1 tbody, ${formTag} .keyboard1 thead { display: block; width: 100%; border: 0 !important; }
        ${formTag} .keyboard1 tr { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 8px; border: 0 !important; }
        ${formTag} .keyboard1 td, ${formTag} .keyboard1 th { display: block; width: auto !important; min-width: 0 !important; height: auto !important; border: 0 !important; padding: 0 !important; }
        ${formTag} .keyboard1 .thCellChild { display: block; width: 100%; padding: 0 !important; border: 0 !important; line-height: normal; }
        ${formTag} .keyboard1 .tab { font-size: 16px !important; margin: 0 !important; height: 44px !important; box-shadow: none !important; }
        ${formTag} .keyNum:has(.thCellHindi) .keyboard1 { display: block; }
        ${formTag} .keyNum:has(.thCellHindi) .keyboard1 tbody { display: block; }
        ${formTag} .keyNum:has(.thCellHindi) .keyboard1 tr { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-bottom: 6px; }
        ${formTag} .keyNum:has(.thCellHindi) .keyboard1 .tab { font-size: 13px !important; }
        ${formTag} .ng-dropdown-panel .scroll-host { max-height: 240px !important; overscroll-behavior: contain; }
        ${formTag} .ng-dropdown-panel .ng-option { white-space: normal !important; overflow-wrap: anywhere; line-height: 21px; background: #fff; }
        ${formTag} .ng-dropdown-panel .ng-option-marked { background: #eef3ff !important; }
        ${formTag} .ng-value-label { white-space: normal !important; overflow-wrap: anywhere; }
        ${formTag} .modal { overflow-y: auto !important; }
        ${formTag} .modal-body { flex-wrap: wrap; gap: 12px; padding: 16px; }
        ${formTag} .modal-dialog { max-height: calc(100dvh - 24px); }
        ${formTag} .modal-content { max-height: calc(100dvh - 24px); overflow-y: auto; }
        @media (max-width: 360px) {
          ${formTag} { padding: 12px; }
          ${formTag} .layout { padding: 12px !important; }
        }
        @media print { app-root > section { display: block !important; } .lekhpal-location-summary { display: none !important; } }

      \`;
    }
    var form = document.querySelector('${formTag}');
    if (form) {
      var modes = { home: 'गाटा संख्या', khataBar: 'खाता संख्या', contact: 'खातेदार का नाम', bhumitype: 'भूमि श्रेणी', date: 'नामांतरण दिनांक' };
      Object.keys(modes).forEach(function (id) {
        var label = form.querySelector('.layout > label[for="' + id + '"]');
        if (label && label.textContent !== modes[id]) label.textContent = modes[id];
      });
    }
    var header = form && form.querySelector('.header_botton');
    if (header) {
      var placeLabels = { districtSelect: 'जिला / District', tehsilSelect: 'तहसील / Tehsil', villageSelect: 'ग्राम / Village' };
      Object.keys(placeLabels).forEach(function (id) {
        var label = header.querySelector('label[for="' + id + '"]');
        if (label && label.textContent !== placeLabels[id]) label.textContent = placeLabels[id];
        var input = header.querySelector('#' + id + ' input');
        if (input && input.getAttribute('aria-label') !== placeLabels[id]) input.setAttribute('aria-label', placeLabels[id]);
      });
      var summary = header.querySelector('.lekhpal-location-summary');
      if (!summary) {
        summary = document.createElement('div'); summary.className = 'lekhpal-location-summary';
        var details = document.createElement('div'); details.className = 'lekhpal-location-text';
        details.appendChild(document.createElement('strong')); details.appendChild(document.createElement('span'));
        var change = document.createElement('button'); change.type = 'button'; change.setAttribute('aria-expanded', String(form.hasAttribute('data-edit-location')));
        change.textContent = form.hasAttribute('data-edit-location') ? 'हो गया' : 'बदलें';
        change.addEventListener('click', function () {
          if ('${service}' !== 'copy') {
            var back = header.querySelector('button:not(.lekhpal-location-summary button)');
            if (back) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'khatauni-copy', stage: 'change-location' }));
              back.click();
            }
            return;
          }
          var open = form.toggleAttribute('data-edit-location');
          change.setAttribute('aria-expanded', String(open)); change.textContent = open ? 'हो गया' : 'बदलें';
        });
        summary.appendChild(details); summary.appendChild(change); header.prepend(summary);
      }
      function place(id) {
        if ('${service}' !== 'copy') {
          var index = { districtSelect: 0, tehsilSelect: 1, villageSelect: 2 }[id];
          var label = header.querySelectorAll('.row label')[index];
          return label ? label.textContent.replace(/^[^:：]*[:：]\\s*/, '').trim() : '';
        }
        var value = form.querySelector('#' + id + ' .ng-value-label');
        return value ? value.textContent.trim() : '';
      }
      var village = 'ग्राम: ' + (place('villageSelect') || 'चुनें');
      var area = 'तहसील: ' + (place('tehsilSelect') || 'चुनें') + '\\nजिला: ' + (place('districtSelect') || 'चुनें');
      var title = summary.querySelector('strong'), subtitle = summary.querySelector('span');
      if (title.textContent !== village) title.textContent = village;
      if (subtitle.textContent !== area) subtitle.textContent = area;
    }
    var selection = document.querySelector('selection');
    if (location.hash === '#/home' && !document.querySelector('.modal.show')) return;
    var message = { type: 'khatauni-copy', stage: 'official' };
    if (selection) {
      var field = selection.querySelector('input.search-input');
      var placeholder = (field && field.placeholder || '').toLowerCase();
      var level = placeholder.includes('district') ? 'district' : placeholder.includes('tehsil') ? 'tehsil' : 'village';
      message = { type: 'khatauni-copy', stage: 'location', level: level,
        choices: Array.from(selection.querySelectorAll('tbody tr')).map(function (row) { return row.textContent.trim(); }).filter(Boolean) };
    }
    var serialized = JSON.stringify(message);
    if (serialized !== last) { last = serialized; window.ReactNativeWebView.postMessage(serialized); }
  }
  window.__lekhpalKhatauniCopy = update;
  function schedule() { if (timer) return; timer = setTimeout(function () { timer = null; update(); }, 16); }
  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.__lekhpalKhatauniCleanup = function () { observer.disconnect(); clearTimeout(timer); window.removeEventListener('hashchange', schedule); };
  window.addEventListener('hashchange', schedule);
  update();
})(); true;` + buildBhulekhServiceLaunch(service)
  );
}

export const KHATAUNI_COPY_SCRIPT = buildBhulekhRecordScript('copy');
export const PLOT_SALE_SCRIPT = buildBhulekhRecordScript('sale');
export const PLOT_DISPUTE_SCRIPT = buildBhulekhRecordScript('dispute');

export function selectKhatauniPlace(name: string) {
  return `(function () {
    if (location.origin !== 'https://upbhulekh.gov.in') return;
    var rows = Array.from(document.querySelectorAll('selection tbody tr'));
    var row = rows.find(function (item) { return item.textContent.trim() === ${JSON.stringify(
      name,
    )}; });
    if (row) (row.querySelector('td') || row).click();
  })(); true;`;
}

export function backToKhatauniPlace(level: 'district' | 'tehsil') {
  return `(function () {
    if (location.origin !== 'https://upbhulekh.gov.in') return;
    var steps = 0;
    function back() {
      var root = document.querySelector('selection');
      if (!root || steps++ > 2) return;
      var field = root.querySelector('input.search-input');
      if (field && field.placeholder.toLowerCase().includes(${JSON.stringify(
        level,
      )})) return;
      var button = Array.from(root.querySelectorAll('button')).find(function (item) { return item.textContent.includes('वापस जाएँ'); });
      if (button) { button.click(); setTimeout(back, 100); }
    }
    back();
  })(); true;`;
}
