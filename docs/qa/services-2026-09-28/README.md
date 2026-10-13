# Bhulekh opening checks — 28 September 2026

## Change

The Bhulekh menu now reuses one WebView for Copy, Certified Copy, Sale Status, Dispute Status and all five directories. Returning to the menu keeps both the loaded document and menu scroll position. Switching services uses official menu handlers or directory hash routes, without downloading the entire Angular application again. The four public services now use the unmodified official website forms in this shared browser; app-added record layouts and native entry-point redirects have been removed.

A slow load no longer disconnects the launcher or blocks the official page. The app’s loading-text/spinner banner has been removed; only the thin toolbar progress line remains. Closing a service cancels its observer without returning to the image-heavy homepage. The embedded browser uses an inline icon instead of repeatedly fetching the official uncached 700 KB favicon. Government form controls, CAPTCHA, authentication, live record requests and server cache rules remain intact.

Preloading is limited to the Bhulekh menu. Dashboard-wide preloading was evaluated and removed because its large download competed with unrelated department pages.

## Emulator verification

Android 15, com.lekhpal, Metro port 8082. No physical phone was connected. Checks used real app buttons and WebView DOM inspection; no credentials, OTP requests, CAPTCHA submissions or payments were used.

- Copy, Sale and Dispute opened their official location selection. Certified Copy opened the mobile OTP/CAPTCHA login.
- Districts, Tehsils, Parganas, Land Types and Government Land opened their distinct routes. Government Land presented its user login. Timings in opening-checks.json measure the first rendered screen; directory rows can arrive afterwards.
- The nine public/directory checks reused the same WebView ID and downloaded the main bundle only once. Representative warm opening samples: Copy 1.6 s, Certified 0.6 s, directories 0.4–1.5 s. Sale/Dispute varied up to 11.3 s. These are single emulator samples including automation overhead, not speed guarantees.
- Khatauni Login and Real-time Login rendered their department choices. Corrections rendered its public login and department link. Allotment returned its login/notice DOM in one run; a repeat cold load remained blank while its script was still downloading. It is not a consistent-speed pass. Map Digitisation rendered the username, password and CAPTCHA login at phone width.
- Menu return and scrolling were checked. The menu remains mounted using opacity and touch/accessibility gating so its layout and scroll state survive service visits.

## External limits

The official root bundle was 7,421,787 bytes with Cache-Control: no-cache, no-store, must-revalidate. It took about 76 s in the baseline; another cold sample took longer. Khatauni Login's 1.76 MB script took about 60 s; the Corrections 5.44 MB script took about 142 s in one run. A host-side download of the root bundle also stalled and reached only 955,492 bytes within 30 s. These cold-download delays cannot be eliminated by app navigation changes. Authentication and downstream records were not tested.

## Automated checks

TypeScript passed. Jest: 25 suites, 141 tests passed. Targeted ESLint had no errors (one existing inline-style warning in the browser header). Regressions cover retaining the browser across services, late website readiness beyond 60 seconds, absence of loading banners while retaining the browser header, cancellation without homepage reload, and idempotent hash navigation.

## Corrections mobile follow-up

Corrections remains inside the Lekhpal WebView with its title and back button. Its mobile CSS hides the large duplicate website masthead and repeated introduction, compacts the navigation, and brings the official login fields into a phone-width card. Public manual, departmental login, accessibility controls, OTP and CAPTCHA remain the original website controls. No login or OTP submission was performed. One pre-change cold check took 54 s, including 48 s downloading the official JavaScript; removing app feedback does not remove this server download time.

Follow-up validation: 25 Jest suites / 141 tests and TypeScript passed; targeted ESLint had no errors. The updated app displayed its title/back toolbar with no loading banner. The Corrections CSS was also injected into the already-loaded official Chrome page: viewport and document width both 412 px, duplicate masthead hidden, Mobile/OTP/CAPTCHA inputs at y=334/413/535 px, and both manual/department links retained. The updated WebView cold retest stalled downloading the official JavaScript for over seven minutes; this is not a successful latency check.

## Four-service routing recheck

Sequentially opened Copy, Certified Copy, Sale and Dispute from the real app menu in one retained WebView. Copy/Sale/Dispute share the official `#/selection` location screen. Selecting Amroha → Amroha → Akbarpur Sakinya (117944) led respectively to `#/khatauni_rtk`, `#/gata_wise`, and `#/vaad_grasht`, with matching rendered components and distinct action controls. Certified Copy opened `#/index-login` with Mobile OTP and CAPTCHA. No cross-service routing issue reproduced. No application code change was needed. The 13 routing/session tests passed. See `four-service-routing-check.json`; authentication and final record results were not exercised.

## Directory transition flash fix

The retained browser used to become visible before Angular replaced its previous page. Directory requests now hide the browser content immediately (including touch/accessibility access) while retaining the app toolbar. A request-specific message reveals it only after the requested route's actual component exists and two animation frames have elapsed. A URL change alone is insufficient, and obsolete readiness messages are ignored. No loading text, fixed timer delay, or additional page download was added.

Live Android recheck passed for Districts, Tehsils, Parganas, Land Types and Government Land in the same WebView. Each readiness message matched the selected route and component; captured frames showed the correct destination. Directory API rows can still load after the correct heading/table appears. See `directory-transition-check.json`. Jest: 25 suites / 143 tests; TypeScript passed; targeted ESLint had no errors and one existing header inline-style warning.

## Official website parity — final four-service check

Removed the custom Copy/Sale/Dispute presentation script from the active session and removed native-screen redirects from `openUpHomeEntry`. The official root service pages keep their original headers, portraits, labels, selectors, fields and buttons. All four service launches now use request-specific page readiness, so the previous service/homepage is concealed until the requested official component renders. This also applies to direct service launches through the general browser. There is no fixed launch delay or loading banner; navigation uses the official menu button as soon as it exists. Directory presentation remains scoped to directory routes.

Captured a baseline by clicking the official homepage buttons without app presentation CSS, then restarted the updated app and opened all four through its real menu. Selected the same public location (Amroha → Amroha → Akbarpur Sakinya, 117944) for Copy/Sale/Dispute. All four actual route/component/label/input/button snapshots exactly matched the baseline, and the app's custom record stylesheet/summary elements were absent. Certified Copy matched its OTP/CAPTCHA login. See `original-site-baseline.json` and `official-service-verification.json`.

Warm menu-to-initial-page samples including automation overhead: Copy 1.234 s, Certified 0.822 s, Sale 0.539 s, Dispute 1.226 s. These are single samples, not latency guarantees; site assets, APIs and network timing remain external. One earlier emulator inspection timed out and the complete comparison was rerun successfully. Screenshots of all four official forms were visually checked. Verification stops at the search/login screens: no record search, OTP request, authentication, CAPTCHA submission or payment was performed.

Final checks: 25 Jest suites / 151 tests passed; TypeScript passed; targeted ESLint had no errors (one existing inline-style warning).

## Requested header removal (latest presentation preference)

The user subsequently requested hiding the Modi/Yogi portraits and all website branding/text above Janpad on every Bhulekh screen. The common masthead selector is now hidden across all root service routes, instead of only directories. The app title/back toolbar and official forms remain intact. This deliberately supersedes the earlier choice to show the original masthead; it does not reintroduce custom record forms. Targeted presentation/browser checks: 13 tests passed.

Live verification applied the source presentation script to the loaded emulator session and checked all four service routes: mastheads hidden and every form snapshot unchanged. Copy and Certified screenshots visually checked. See `header-removal-verification.json`.
