## Session handoff 14 October 2026

Today's work is saved on `sneha_dev`. The next session should begin with the internal-testing bundle and the outstanding verification below. No further feature work or Play rollout is requested tonight.

### Completed today

- Reorganized the UP dashboard into four bilingual tabs: Land records, Feeding, Fieldwork, and Documents. Land records starts with Khatauni/Bhulekh, Khasra, RC-9, Varasat and corrections. Existing services remain reachable; measurement and calculator tools are available in Fieldwork. The bottom navigation and other states' dashboard flows are retained.
- Added coverage for tab grouping, every UP portal remaining reachable, Hindi selection, and existing government/tool destinations. Visually checked all four tabs on emulator-5556. See `outputs/qa/work-tabs-2026-10-14/`.
- Committed the complete app source, tests, assets and documentation as `ba4da4b`, then pushed through HTTPS to `https://github.com/cs-softwares/Lekhapal.git`. SSH authentication as `sneha-shankhwar` was denied; the configured origin now uses HTTPS.
- Increased Android `versionCode` from 4 to 5 for internal testing; `versionName` remains `1.1.0`. Commit `4341cf3` is pushed to `sneha_dev`.
- GitHub has two distinct branch names: `sneha_dev` (underscore, current work) and `sneha-dev` (hyphen, older code). Continue on `sneha_dev`. Neither `main` nor the hyphen branch was changed by this work; both were last verified at `a159141`.

### Internal testing AAB

The user ultimately requested **only an AAB**, superseding the earlier APK request. Deliverable: `outputs/releases/1.1.0-5/lekhpal-1.1.0-5-internal.aab`.

- Package `com.lekhpal`; version `1.1.0` (5); 43,196,755 bytes; ARM64; minimum Android API 24, target API 36.
- SHA-256: `e46370b584188f4fc070ccbeaf13494237e9a224d13be8d745346e5616e0b773`.
- Signed with the existing release certificate, confirmed identical to build 4. Bundletool 1.18.3 validation and JAR signature verification passed. JavaScript is bundled, so the release runs without Metro.
- Built using `:app:bundleRelease -PinternalTestAds --offline --max-workers=2`. Test ads are enabled; Premium remains disabled. Official government portal URLs are retained.
- The AAB was provided locally; it has **not** been uploaded or rolled out in Play Console by this session. Generated packages and QA outputs are ignored by Git and remain on this computer.
- Verification details, checksums, build/test logs and screenshots are in `outputs/releases/1.1.0-5/verification.json` and the same directory.

### Verification and limits

- Full Jest: **652 tests across 79 suites passed**. TypeScript passed. Approved Bhulekh regression tests are included.
- An AAB-derived release package was installed over `com.lekhpal` on **emulator-5556**, using the existing emulator debug certificate solely for this smoke test. App data was preserved. The deliverable AAB retains its release certificate. The emulator now runs release code at build 5; do not assume it is still a Metro/debug build or uninstall it to switch builds.
- Release smoke checks passed: cold startup, updated dashboard, measurement screen, calculator `12+3=15`, Khasra menu, and official eKhasra login-selection entry in the supported Custom Tab. The last browser action returned to the app. No government credentials were entered or official records changed in these checks.
- **Full Android lint is incomplete.** After fetching the initially missing Robolectric dependency, `:react-native-worklets:lintAnalyzeRelease` crashed with `Cannot find a KaModule for the VirtualFile`. Retrying with `-Dlint.use.fir.uast=false` and requesting app lint analysis separately did not resolve it. See `lint-blocker.log`; do not describe lint as passed or disable checks just to make it green.
- Authenticated government saves/approvals, physical-device GPS accuracy, and all-state portal automation have not been established by these checks. Community/voice backend integration remains outstanding. Earlier implementation and fixture-test details below remain applicable; full FastWork parity is not claimed.

### Resume next session

1. Read `AGENTS.md` and preserve `docs/approved-bhulekh-baseline.md`. Keep Khasra Login in `openPortalBrowser`; do not move it to an embedded WebView.
2. Confirm `sneha_dev` and current working-tree state. Keep changes off `main` and do not rename/delete either similarly named development branch without a request.
3. Start with the user's Play internal-testing upload or device feedback. Build 5 is prepared; verify available Play version codes before preparing any later upload. Do not upload or roll out a release merely because the AAB exists.
4. Resolve the Worklets/Kotlin lint-tool crash without weakening app checks. The existing signed AAB and runtime smoke results remain available while investigating.
5. With the user's own government login, validate one small, reviewed workflow at a time: correct village/year/season, plot/crop/area/irrigation values, confirmed official save, next-record progression, stop/resume and completion reports. Then cover Ansh/removal, Prapatra-5, approvals, Farmer Registry, Census and ERO downloads according to the user's access. Government writes require the user's authorized test scope; a successful login screen is not end-to-end automation proof.
6. Leave broader state automation, voice integration and proposed measurement-to-worksheet enhancements as separate work. New automation additions still follow the user's request for a proposal and approval first.

Use emulator-5556 for Lekhpal QA; do not disturb the DSA emulator. Preserve saved records, local conversion standards, login sessions, and the approved portal presentation.

> Result presentation and date update, 13 October 2026: removed the on-screen all-area-units grid. Field/irregular plots, area conversion, map-area conversion and GPS results now offer a single unit dropdown inside their result card. The chosen unit is retained in each state-scoped tool draft and saved record; clearing field measurements preserves the output unit and local conversion standards. Area-converter result selection updates its To selector. Reports retain the selected result plus conversion details. Missing local standards never produce an invented result. Calendar popups (month navigation, direct year entry, leap-day validation) now accompany both date-difference dates and the irrigation date; date differences also include explicitly approximate months using days / 30.4375, matching the reference. These supersede the date-picker/approximate-month gaps reported earlier. Full suite: **649 tests / 78 suites passed**; TypeScript passed; targeted lint has no errors (six existing inline-style warnings). The calendar and the single-result layout were visually checked in emulator-5556; no government writes were involved. See `outputs/qa/tools-2026-10-13/calendar-popup.png` and `single-area-result.png`.

> Calculator and measurement update, 13 October 2026: added 12 offline calculators, bringing the calculator list to 19; expanded area conversion to 14 units. A conventional scientific keypad replaces the initial worksheet-style keypad. Length and area conversion now use two compact From/To boxes, a swap button and a unit-selection popup. Full Jest: **646 tests / 78 suites passed**; TypeScript passed. Targeted lint has no errors. Existing inline-style warnings remain. This does not establish complete UP government-automation parity.

### Calculator / measurement comparison, 13 October 2026

Reference inspected under `sources/com/lekhapal5441/app/FrontActivity/`: `ToolDetailActivity.java`, `Main2Activity.java`, `B.java`, `s0.java`, `C2948b.java`, `EnumC2946a.java` and `ViewOnClickListenerC2955i.java`.

| Reference function | Current app |
| --- | --- |
| General/scientific arithmetic | Offline bounded expression parser; conventional number/operator keypad, equals, clear, backspace, percentage, parentheses, powers, factorial, logarithms and degree/radian trigonometry. Invalid operations cannot be saved as successful calculations. |
| Percentage, date difference, interest, EMI, amount in words | Added. Includes leap-day validation, explicit inclusive/elapsed counts, four interest frequencies, zero-interest EMI, Indian lakh/crore English wording and exact paise input. These use entered values rather than inferred official rates or legal deadlines. |
| Length conversion | Eight units, From/To popup selectors, swap, all-unit results; direct shortcut from Measurement. |
| Seed, fertilizer, spray, yield, irrigation date | Added quantities based on user-entered field area/rates; proportional final spray tank; optional yield value; chosen irrigation interval. No automatic agronomic dosage recommendations. |
| Area conversion | Fourteen units including Decimal, Cent, Guntha, Biswansi, Marla, Kanal and square kilometres. Local recorded standards are explicitly entered and retained in saved reports. |
| Rectangle area and land shares | Existing rectangle/triangle/trapezoid, irregular quadrilateral with diagonal, map-scale, GPS boundary and exact fraction/co-owner tools retained. Malformed or oversized owner lists now fail validation instead of silently dropping owners. |

New worksheets reuse state-scoped drafts, saved notes, text sharing and PDF reports. Hindi/English controls are available; amount-in-words output is explicitly English. New calculator features are available without a subscription in the shipping configuration.

Emulator evidence (`outputs/qa/tools-2026-10-13/`): conventional keypad entry `12+3=15`; leap-year range 28/02/2024–01/03/2024 returns 2 elapsed / 3 inclusive days; worksheet save and actual native PDF generation succeeded. The generated one-page PDF was rendered and visually inspected. Area conversion 10,000 square metres to one hectare and additional conversion rows were checked. Existing field dimensions were preserved; the initially blank area-converter draft was restored after the sample. Compact From/To boxes were visually checked in the emulator; popup selection and swap-to-report behaviour are covered by component integration tests. All device commands targeted emulator-5556 and com.lekhpal only.

Scope limits: this update covers calculation and measurement. It does not add a photo compressor or general PDF editor; the reference delegates PDF utilities externally. Reference QR scanner/generator and clipboard history call `Main2Activity.k1`, which is explicitly a disabled coming-soon placeholder, not working functionality. Physical GPS survey accuracy requires a real-device field check. Government-account acceptance, additional-state portal automation and community/voice integration remain separate outstanding work.

Potential next time-saving addition, not implemented without the user's requested approval: carry a measured area, unit, village and plot reference directly into share or valuation worksheets, with a review step before use.

> UP Khasra bulk update, 12 October 2026: user-approved per-plot import, row validation, exact crop-area and mixed-irrigation plans, scoped drafts, durable queue recovery and daily CSV/PDF reports are implemented. An Android synthetic batch automatically saved three crop rows across two plots, saved configured remarks, locked both plots and returned to the list; the report showed two confirmed plots with confirmation IDs. Fixed SPA navigation incorrectly stopping automation and cleanly stop the controller after the final list return. Full Jest: **564 tests / 77 suites**; TypeScript passed. Public Khasra Login remains a Custom Tab, and approved Bhulekh behavior is preserved. Government-account acceptance and additional state-specific automation remain pending. See [implementation and verification](KHASRA_BULK_AUTOMATION.md).

> Daily-document update, 12 October 2026: the user approved original useful templates instead of exact sampled formats. Six Hindi/English document workflows now include reusable office profiles, searchable drafts, automatic letter structure, validated 1–50-person PDF batches, durable Stop/Resume, native A4 generation, print/share/Downloads, and state-separated storage. Full Jest: **530 tests / 75 suites**. Twelve bilingual Android render fixtures and a real UI batch with background pause and app-restart resume were checked on emulator-5556. This supersedes the template-gap wording in the older notes below for these six original workflows; it does not establish parity with every prescribed form. See [implementation and evidence](DOCUMENT_AUTOMATION.md). Community/voice integration and authenticated government acceptance remain separate work.

> ERO update, 12 October 2026: the reference first-Format-A-per-row download workflow is implemented, including current ECINet sign-in, serial ranges, pagination, validated native saving, paused resume, filename metadata, PDF library, printing, sharing and Downloads export. Full Jest: **501 tests / 73 suites passed**. A real emulator batch downloaded two synthetic PDFs across a page boundary; public login and print preview were checked. Government-account acceptance remains pending. See [ERO implementation and evidence](ERO_PDF_IMPLEMENTATION.md). Order/application templates and community/voice remain separate unfinished work.

> Latest update, 12 October 2026: Census Phase 2 now has a serial/survey/calculation/crop-popup batch controller, explicit one/two-crop settings and mixed-irrigation allocation. Confirmed saves are journaled before advancing; changed village/holding, ambiguous choices, mismatched crop order and stalled transitions stop the batch. e-Chawadi cross-page demand selection and automatic confirmation have additional manifest/duplicate/last-page tests. Targeted verification: 52 tests in seven suites; approved Bhulekh regressions: 44 tests in six suites; TypeScript and targeted ESLint passed. Debug build installed only on emulator-5556; Census public entry, phone settings, crop search and keyboard visibility checked. These are fixture and public-screen checks, **not authenticated government acceptance**. ERO PDF implementation is now covered by the later ERO update above; order/application templates and community/voice remain unfinished; exact order/application templates are absent from the supplied client, and voice needs this app's own provider configuration. Evidence: `outputs/qa/census-phase2-2026-10-12/`. Government-login testing is not the only remaining work.

> Subsection update, 11 October 2026: dedicated UP Khasra land/fallow, two-category tree entry, seasonal crop/irrigation, remarks and early-finish progression are implemented alongside presets. Full-suite verification: 461 tests / 68 suites. Authenticated portal acceptance is still outstanding. See [the detailed changes and remaining module gaps](FASTWORK_REMAINING_WORK_2026-10-11.md#khasra-feeding).

> Remaining-work update, 11 October 2026: census controls, Khasra crop recovery/list pagination, and e-Chawadi payment history/batches and Form 8B layout export are implemented. See [the detailed changes and outstanding gaps](FASTWORK_REMAINING_WORK_2026-10-11.md). This supersedes the older descriptions of those modules below; full parity is not yet claimed.

> Update, 11 October 2026: the user requested all non-UP states from FastWork. See [the implemented state rollout and remaining limits](FASTWORK_STATE_ROLLOUT.md). Earlier UP-only/five-region gate statements below describe the previous rollout stage. UP remains the default and its approved behavior is preserved.

# FastWork comparison and implementation status

Updated 10 October 2026. Reference: `/Users/sneha/Work/Apps/LekhpalFastWorkCode/APP_ANALYSIS.md`, followed by the specific Java classes below. Implementation is on the existing `sneha_dev` branch. Subscriptions are excluded.

This document distinguishes implemented code, local verification, and still-missing functionality. A dashboard card or a successful login-page load is not proof of full workflow parity. Authenticated government acceptance will be performed by the user later; it is not a prerequisite for implementing the remaining modules.

## Implemented in this update

| Module | Reference evidence (under `sources/com/lekhapal5441/app/`) | App implementation |
| --- | --- | --- |
| Khasra final progression | `FastKhasra/Khasra1432/AllInOneWebViewActivity.java`, final-lock/list-return logic | Optional automatic final lock after confirmed remarks save, followed by official gata-list return and the existing queue. Requires matching official village, Fasli year, season and gata. Ambiguous/missing controls stop the batch. Existing public Khasra Login remains in the supported Custom Tab. |
| Multiple crops | Same Khasra activity, crop entry/area handling | A 1–10 crop plan uses current official crop options, irrigation flags and percentages totalling 100. Fixed-point allocation preserves the exact four-place plot total. Every row requires the expected official remaining area; a partial/restarted plan stops for review instead of adding the first crop again. Crop-row cursor itself is session-local. |
| Ansh/removal | `FastKhatoni/AnshPageScripts.java`, `AnshNirdharan.java`, batch scripts | Saved fractional share rules, per-owner area calculation, optional automatic submission/removal, normal/current-gata and advanced/all-gata sequencing, saved completed owner pairs and paused resume. Confirmed completion returns to the owner selector. Captured village changes stop the batch. Uncertain results are not silently retried. |
| Prapatra-5 | `FastKhatoni/Prapatra5Activity.java`, `PrapatraPageScripts.java` | Reviewed per-section presets, automatic property preparation from the persistent village/year/gata queue, section progression, owner-table confirmation, final save and next-property progression. Additional distinct owners can be entered through the official form; this is not an arbitrary multi-owner import engine. |
| Survey-9 | `FastKhatoni/EntryUserUpdateActivity.java` | VillageWise9/disputePlot record range, form9 approval, durable pending journal, positive-result confirmation, return/next-record progression and saved paused batches. |
| Revenue Inspector | `FastKhasra/FastInspectorLogin/FastWebViewActivity.java` | Current HTTPS portal adapter reads row identifiers, applies only the requested checkbox range, clears selections outside it, and invokes the unique official lock/approval control. Ambiguous rows/actions stop. Legacy HTTP/IP-host login and CAPTCHA automation are not implemented. |
| Farmer Registry | `FastFarmerRegistry/c.java`, `h.java`, `FarmerRegistryActivity.java`; callback `sources/A5/d.java` | `.view_btn` record queues; `.nameMAtch` check; automatic APPROVED selection only at 100%; official `.gree_btn` submission; lower/unreadable scores stop for manual review. Configured batches and pending history persist. |
| SVAMITVA documents | `FastKhatoni/EntryUserPdfActivity.java` | Record-range opening from village lists, official `#printarea` extraction, same-origin authenticated image embedding, local PDF generation, persisted file list, Android print and share. Export fails visibly if required images cannot be loaded. |
| Bhunaksha | `FastBhulekh/Bhunaksha/BhunakshaApi.java`, `BhunakshaPlotActivity.java`, `BhunakshaKmlDocument.java`, `BhunakshaKmzPackageWriter.java` | Official district/tehsil/village APIs, parcel-report URL, village extent/WMS requests, WGS84 northern UTM conversion, KML ground overlay, offline KMZ containing `doc.kml` and PNG, 4K PNG, local library and sharing. The reference's KML/KMZ path exports a **village raster overlay**, not parcel boundary vectors. |
| Agricultural census foundation | `FastAgriCensus/FastCensusWebActivity.java` | L1/L2 page detection, current editable fields/options, separate radio choices, preset fill, serial-number ranges, official Save, request/success tracking and durable recovery. This does not yet cover the complete census rule engine or all census variants listed below. |
| Maharashtra foundation | `Maharastra/EChawaniActivity.java` | State-gated e-Chawadi browser, demandGeneration/Form8B/receive-money page recognition and live field/preset helpers. Specialized threshold/receipt algorithms remain below. |

The new cards are on **Dashboard → Approvals and other work**, directly after the four Revenue feeding cards, and in Services. This does not change the approved public Bhulekh form/navigation behavior.

## Implementation files

- `src/screens/KhasraFeedingScreen.tsx`, `src/domain/khasraAdvanced.ts`, `src/domain/cropPlan.ts`, `src/utils/khasraFeedingBridge.ts`, `src/components/khasra/CropPlanEditor.tsx`.
- `src/screens/RevenueFeedingScreen.tsx`, `src/domain/revenueAutomation.ts`, `src/utils/revenueFeedingBridge.ts`, `src/components/revenue/PrapatraQueuePanel.tsx`.
- `src/screens/OfficialWorkScreen.tsx`, `src/domain/officialWork.ts`, `src/utils/officialWorkBridge.ts`, `src/components/revenue/OfficialWorkLinks.tsx`.
- `src/screens/MapExportScreen.tsx`, `src/domain/bhunakshaExport.ts`, `src/services/bhunakshaExport.ts`, `src/native/workFiles.ts`, `android/app/src/main/java/com/lekhpal/workfiles/WorkFilesPackage.kt`.

## Remaining implementation gaps — not merely awaiting live verification

1. Census: institutional, continuation, Block D, operational-holder and phase-two adapters; dynamic Block C rules, Maharashtra area-division settings, small-area land-use rules, and reviewed handling of differing plot-row counts. The generic preset helper is not full census parity.
2. e-Chawadi: dedicated demand threshold selection, Form8B export and money-receipt sequence. Existing field helpers do not implement all reference algorithms.
3. Documents: ERO reference PDF workflow is implemented (see the latest ERO update above). Order/application templates remain outstanding; additional authenticated layout variants require acceptance checks.
4. Community, expert consultation and voice: our own data schema, accounts, moderation, UI and voice-provider integration. The reference client depends on Firebase/developer services and Agora. Reusing its private service credentials is not an implementation for this app.
5. Order printing: `AdeshPrint/WebActivity.java` loads `technicalask.in/printApplication/application.php` with a server key. The templates/server code are **absent from the supplied client**. Implementing equivalent templates needs the actual form content or an independently specified template set; the existing generic report writer is not evidence of equivalent forms.
6. Remaining state-specific modules, Malgujari and other reference tools need individual source review and adapters. Khasra automation remains UP-specific. Existing JSON state configuration does not make UP automation valid in another state.
7. Khasra crop-plan recovery is intentionally paused on mismatched remaining area; automatic reconciliation of already-entered crop rows and additional official context/layout variants remain to extend. Queue pagination has not been audited as complete reference parity.

## Checks and evidence

- Android `:app:assembleDebug --offline` succeeded. The APK includes WorkFiles and preserves the existing notification package.
- Installed with `adb -s emulator-5556 install -r`; app data retained. Metro uses port 8082. No commands targeted the other emulator.
- Existing full Jest run: **356 tests, 56 suites passed**, including all six approved-Bhulekh regression suites. New bridge, batch recovery and Khasra auto-lock tests additionally passed; see the final validation note below for totals.
- New tests execute actual injected JavaScript against controlled DOM fixtures for Survey-9, Inspector checkbox ranges, census radio/numeric validation, registry approval controls, stale revisions and uncertain results. Native screen tests cover persistence-before-write, interruption recovery, Stop during pending persistence and the registry match gate.
- No authenticated official form was saved, deleted, approved or locked during development. Fixtures are not captured authenticated portal pages, so current portal layouts, permissions, final record acceptance and printer output need operator acceptance later.

Do not claim all FastWork functionality is complete while the implementation gaps above remain.

## Feeding screen layout follow-up — 10 October 2026

Applied the requested website-first layout to Khasra Feeding, Ansh Nirdharan, Remove Ansh, Prapatra-5 and every module using OfficialWorkScreen (Survey-9, Inspector, Farmer Registry, documents, census and e-Chawadi).

- The official browser fills the available screen. The settings icon opens a separate full-screen work panel; history is inside that panel. Removed the persistent Hide/Show helper and History button row and the split website/helper layout.
- Portal route changes no longer reopen settings. Returning to the official page keeps the browser, field values and queue components mounted. Android Back dismisses the settings panel first.
- Starting automatic feeding returns to the official page. Active work has a compact status/Stop strip; the Khasra queue reports its running state so Stop stays available even between individual requests. Full status details remain readable in settings.
- No portal bridge, official form, authentication flow or public Bhulekh presentation was changed. The remaining functional gaps above still apply.
- Validation: TypeScript and targeted ESLint passed. **97 tests in 11 suites passed**, including all six approved Bhulekh regression suites, feeding/queue checks and settings/browser retention checks across all supported modules.
- Visual evidence from `emulator-5556`: `outputs/qa/feeding-layout-2026-10-10/` (Ansh portal/settings, Prapatra-5 portal and census portal). No commands targeted the DSA emulator, and no government records were submitted during this layout check.

### Phone layout and dashboard follow-up — 10 October 2026

- Removed the Daily work shortcut grid from `StateDashboardScreen`. Measurement and Calculator remain available in their bottom tabs.
- Added a narrowly scoped presentation script for the original Bhulekh role-selection page used by Ansh/Remove Ansh and the original SVAMITVA entry used by Prapatra-5, Survey-9 and SVAMITVA documents. It sets a zoomable device-width viewport, wraps navigation and displays readable role cards in two columns (one on very narrow screens). Original role forms, POST destinations and hidden role values remain intact.
- Extended the same presentation to the original Bhulekh and SVAMITVA login forms (including failed-login endpoints only when the original password form is present). Login cards use the phone width, with readable labels, full-width fields and CAPTCHA controls, and large login buttons. Inputs, hidden fields, validation and submission handlers are not replaced. Authenticated feeding forms, public Khatauni/Bhulekh services and the Khasra Custom Tab are outside this change.
- Validation: 95 tests in eleven suites passed, including all six approved Bhulekh regressions; TypeScript and targeted ESLint passed. Screen integration tests verify presentation injection across RevenueFeeding and OfficialWork modules.
- Emulator evidence: `outputs/qa/revenue-mobile-2026-10-10/`. The Ansh and Prapatra-5 entries measure 412 CSS pixels wide with no horizontal overflow, replacing their forced 1,024-pixel desktop viewports. The original five Bhulekh roles and seven SVAMITVA roles, including Prapatra-5 Lekhpal Halka, remain present with their original POST destinations and role values. Actual Ansh, Survey-9 and Prapatra-5 login pages were also inspected at 412 CSS pixels with no horizontal overflow: visible input/select controls are about 347 pixels wide, 48–53 pixels tall and use 18-pixel text. Prapatra-5’s lower Login button is reachable by scrolling. Remove Ansh uses the same verified Bhulekh login presentation, covered by its screen integration test. No credentials were entered and no government records were submitted.

### Login Home control follow-up — 10 October 2026

- Reproduced the dark Home-button state on the shared SVAMITVA login page. The website's `.back-btn:hover` rule used charcoal, and its HTTP Home destination was rejected by the app's HTTPS-only navigation policy.
- Login Home now returns to the official HTTPS SVAMITVA role selector, matching the existing Bhulekh login Home behavior used by Ansh and Remove Ansh. The entry-page Home keeps its public-home destination using HTTPS. Other links and login form submissions are unchanged.
- Replaced the legacy dark hover color with a light-blue pressed state and removed the browser tap highlight on header/role links. Keyboard focus still has a visible outline. Reinjection updates the existing style without duplicating it.
- Validation: **83 tests in nine suites passed**, including the approved Bhulekh checks and Home-destination regression tests. TypeScript and targeted ESLint passed. Emulator inspection confirmed the repaired HTTPS link and light-blue pressed color; evidence is in `outputs/qa/revenue-home-2026-10-10/`. No account login was submitted.

### Final validation for this update

- `npx tsc --noEmit`: passed.
- Full Jest run after the final changes: **367 tests passed in 58 suites** (33.355 seconds). Existing calculator tests log React `act(...)` warnings but pass.
- Targeted ESLint passed for the new official-work/map modules and revenue screens; the final Khasra wording/test changes are included in the final targeted run.
- Isolated emulator verified the new dashboard cards and Survey-9 public entry/helper screen. Evidence: `outputs/qa/fastwork-parity-2026-10-10/`. A later ADB screenshot attempt stalled; no other emulator was restarted or modified to resolve it. Map/PDF authenticated retrieval and actual print output are not claimed as emulator-verified.
