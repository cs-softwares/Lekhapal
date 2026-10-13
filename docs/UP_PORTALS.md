# UP portal corrections — September 23, 2026

## Bhulekh directories and related services

The native Bhulekh choice screen now includes Districts (Jila), Tehsils, Parganas, Land Types and Government Land Search under Directories. The first four open the exact official directory routes; government-land search opens its official user login. Routes were checked against the live website controls. Directory pages hide the repeated “भूलेख - खतौनी / राजस्व परिषद, उत्तर प्रदेश” website banner, while retaining the app's page title and official domain. Tables use readable mobile text with normal whole-page vertical and horizontal scrolling; there is no height-limited nested table scroller, sticky header or custom scrollbar. The official app-root element fills the WebView and provides one ordinary two-direction page scroller. The body and outer document do not pan or create competing scrolling areas. Directory cards and tables share the same 600px mobile content width, so the last columns remain inside the page rather than overflowing their card. Scrollbars are thin and neutral. Earlier body/document overflow changes only demonstrated viewport panning and were insufficient. Presentation updates replace the existing style and hash listener to avoid stale styles. This presentation applies to these routes and resets when website navigation leaves them.

The related-government-services strip below the choices recreates the official homepage's moving links as accessible text-and-icon buttons. It advances every four seconds while visible, pauses on touch or when the app is inactive, supports manual swiping, and respects reduced-motion settings. There is a pause/play control. Two obsolete Jansunwai `.aspx` links were replaced with its current homepage (registration includes the site's own eligibility step) and `/ComplaintTracker`. The unavailable old Revenue Department root was replaced with the verified Board of Revenue department directory and labelled accordingly.

Final scroll validation in the existing Android debug app: Districts (75 rows), Tehsils (350 rows), Parganas (905 rows) and Land Types (25 rows) each passed right swipe to the final column, left swipe back to zero, vertical swipe down, and vertical swipe back up. Each page reached a 192.38px content scroll offset while the visual viewport stayed at zero; final-column bounds and screenshots were checked. Headers remain non-sticky. TypeScript, targeted lint and injected-script syntax passed.

Portal validation: all 41 expanded UP catalog entry checks returned HTTP 200, including the new directory and related entries. This checks initial documents, not authenticated workflow completion. All 38 tests, TypeScript, targeted lint and injected-JavaScript syntax checks passed. No APK was built, updated or installed.

## Portal presentation and startup improvements

The known Modi/Yogi profile containers are hidden within the UP Bhulekh portal using scoped presentation CSS. The government emblem, portal identity, forms and navigation remain intact. The real-time Khatauni landing page used fixed 1024px minimum widths and initially invisible animated login tiles; the in-app presentation now adds a mobile viewport, wraps the header controls, and displays the existing login tiles in a responsive grid immediately. Form actions and handlers are unchanged.

Bhulekh Options now mounts one browser behind the native choice list and reuses that loaded browser when a public service is selected. The launcher reacts immediately to DOM changes and hash navigation, replacing the previous polling intervals. The “Opening selected service…” message and central spinner are removed; the compact header retains normal load progress. Closing the service returns to all six choices and prepares a fresh home state. Cold network/server load time is not guaranteed to be zero.

Verified in the existing Android debug app: real-time login controls fit the phone width, Khatauni Copy opens the official district-selection page without the two profile cards or opening message, and Back returns to the six choices. All 37 tests passed, including immediate service selection and browser-instance reuse; TypeScript and targeted lint passed. Screenshots were inspected. No APK was built or updated; the release artifact remains September 23 at 01:33:46, 41,794,229 bytes.

## Bhulekh choices and mobile browser

Khatauni & Bhulekh Services now opens six native choices: Khatauni Login, Real-time Khatauni Login, Khatauni Copy, Certified Khatauni Copy, Plot Sale Status and Plot Dispute Status. The two department logins moved into this group, removing duplicate top-level rows. Khasra remains a separate group. The current directory has 20 top-level entries and 26 leaf actions when both groups are expanded.

The four public services are verified against the live official Bhulekh menu. They share `#/selection` and need the official menu action to initialise the selected workflow. A narrowly scoped launcher clicks only the exact selected button on `https://upbhulekh.gov.in/#/home`, then reveals the official page. It does not copy forms, set internal government session state, fill inputs or submit applications. The loading surface has a timeout, retry and Back; polling stops on successful handoff or timeout. Unknown/ambiguous service buttons fail rather than selecting another service.

Android WebView messages may identify the website as `https://upbhulekh.gov.in` without a trailing slash. This is now accepted with strict host boundaries and regression coverage. Mobile pages use the installed WebView's default user agent rather than a fixed Chrome 126 identity; existing legacy desktop exceptions remain. Normal caching remains enabled. No claim of speed parity with Chrome has been benchmarked.

Validation: the six-option screen and direct Khatauni district-selection page were verified in the existing Android debug app. All 26 catalog destinations returned HTTP 200 (the four public Bhulekh actions share the same initial document, so this is not four independent workflow-completion checks). Unit tests exercise all four exact-button selections, duplicate-button rejection, one-time launch and origin validation. Department login submissions and payments were not performed. No APK was built or updated.

## Khasra choice screen

Khasra Portal now opens a native screen containing exactly Khasra Login and Khasra Dekhein from both Dashboard and Services. These open `https://ekhasra.up.gov.in/#/SelectLogin` and `https://ekhasra.up.gov.in/#/khasrareport` in the shared browser. Both routerLink destinations and hash routing were verified in the official site's published client bundle. No portal controls or forms are reproduced in the app.

The directory still has 22 top-level entries; the health audit expands the Khasra menu, checking 23 destinations, all returning HTTP 200 in this run. The choice screen and live district-selection page were confirmed in the Android debug app. All 26 tests, TypeScript and targeted lint passed. Login credentials and form submissions were not used. No APK was built or updated.

## Latest addition: relief, SVAMITVA and public-land access

The current directory contains **22 entries**. Six additions appear in Services for Uttar Pradesh only: Rahat, Flood Management login, SVAMITVA overview, SVAMITVA survey planning/map correction login, Anti Bhu-Mafia public complaints, and Jansunwai officer login. Relief & disaster and Public land have dedicated category filters; SVAMITVA sits under Maps & survey. Category labels, descriptions, search and guidance support Hindi and English. Dashboard remains the existing short quick-access list.

Sources inspected:

- [Relief Commissioner](https://rahat.up.nic.in/) provides department access and the separate Aapda Prahari mobile-app link. Its `/core/` and `/core/login` endpoints returned HTTP 500 during live checking, so the app opens the working official homepage. This does not fix that government-side outage.
- [Flood Management login](https://rahat.up.nic.in/flood/admin/login) is linked by the Relief Commissioner department directory.
- [UP SVAMITVA](https://svamitva.up.gov.in/) links [survey planning/map correction](https://revenuedarms.up.gov.in/soi/). The daily-progress link timed out in research, so no unverified direct shortcut was added; it remains discoverable through the official directory.
- [Anti Bhu-Mafia public complaints](https://jansunwai.up.nic.in/ABMP) is explicitly labelled as public access. The newer `abmp.up.gov.in` destination timed out in research.
- [Jansunwai](https://jansunwai.up.nic.in/) links its separate [officer login](https://jansunwai.up.nic.in/login). This is assigned-grievance access, not a claim that every public-land inventory/task-force reporting workflow is integrated.

Validation: all 22 selected entry URLs returned HTTP 200 with service titles in the latest `up-portal-health-check.json`. All 25 tests, TypeScript and targeted ESLint passed. New entries were visible in the existing Android debug app; Flood Management rendered its login page inside WebView and the app Back button returned to Services. Officer-authenticated submissions, downloads and companion-app installation were not tested. Field inspections and assigned government apps can still be required.

**No APK was built, updated or installed for this addition.** The existing release artifact remains dated September 23, 2026 at 01:33:46 (41,794,229 bytes). The release-build note below belongs to the earlier corrections.

## Earlier portal corrections

The active UP directory now opens 16 verified official entry points in `WebViewPortal`. It no longer routes these entries through the old Bhulekh assistant, which tried to discover controls and reproduce the portal UI. The public Khatauni/certified-copy/sale/dispute actions are grouped under the official Bhulekh menu: these share a client-side route and require the website to initialise the selected workflow. The app does not guess deep links or bypass official steps.

Changes include the direct eDistrict `/edistrictup/` landing page, IGRS `/igrsup/defaultAction.action`, restored revenue-court access, separate RCCMS officer and real-time Bhulekh logins, and Board of Revenue links for RevenueSoft, corrections, pond allotment and map digitisation. Department pages retain their own viewport; the forced `0.42` zoom and horizontal clipping are no longer applied to UP department pages.

The heading “Your government workspace” and its description have been removed from the state portal list. Category filters now appear immediately beneath the app header.

## Sources

- [Live UP Bhulekh menu](https://upbhulekh.gov.in/#/home): inspected service and Login menus in Chrome.
- [Board of Revenue department directory](https://bor.up.gov.in/Department_login.aspx): officer and department links.
- [eDistrict](https://edistrict.up.gov.in/edistrictup/), [eKhasra](https://ekhasra.up.gov.in/), [RCCMS officer login](https://rccms.up.gov.in/dashboard/login/), [Varasat login](https://rccms.up.gov.in/Varasat/userlogin).

## Checks

`python3 scripts/check-up-portals.py` checks every visible UP portal via curl with the platform's normal TLS verification, follows redirects, and records status/title in `up-portal-health-check.json`. All 16 returned HTTP 200 with matching service page titles. No credentials or government applications were submitted. An HTTP response confirms the landing endpoint, not every authenticated operation or future uptime.

25 automated tests passed. TypeScript and targeted ESLint checks passed. Regression tests cover direct browser routing for all UP entries, the restored registration and court entries, and the corrected official destinations.

Android development-build verification: the removed heading/description were visually confirmed. Khasra, RCCMS officer login and eDistrict displayed live page content and returned to the list using the app's Back button. Bhunaksha displayed the live cadastral map (visually confirmed after Android's UI-tree inspection process exited). The signed release APK rebuilt successfully; the existing debug installation was preserved.
