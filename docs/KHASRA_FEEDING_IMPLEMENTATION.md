> **Latest status:** [FASTWORK_PARITY_STATUS.md](FASTWORK_PARITY_STATUS.md) records the new optional final-lock progression, official context checks, crop plan and other reference modules. Earlier remaining-work statements below are historical.

# Khasra feeding implementation status

Updated: 10 October 2026. Working branch: `sneha_dev`.

The user requested Fast Work functional parity, beginning with Khasra feeding, with subscriptions deferred. This includes the assisted-entry, queue and advanced-rule implementations. It is **not yet complete Fast Work feeding parity or a production-verified government submission integration**.

## Reference evidence

Read `/Users/sneha/Work/Apps/LekhpalFastWorkCode/APP_ANALYSIS.md` first. The traced combined workflow is `FastKhasra/Khasra1432/AllInOneWebViewActivity.java`, launched by `FastFeedMain.java`. Older JSP/1431 activities are retained legacy code, not the implementation target.

Fast Work operates the official website using a desktop-UA WebView, JavaScript field setters, input/change events, route monitoring, loader checks and success messages. It does not submit crops through the developer's `updateKhasra.php` endpoint; that endpoint controls subscription access.

Observed survey routes: `lekhpalGataList`, `lekhpalOwnerDetails`, `lekhpalCroppingPattern`, `lekhpalInsertFallow`, `lekhpalInsertTree`, `lekhpalInsertFasal`, `lekhpalInsertRemark`.

## Implemented

- A separate **Dashboard → Revenue feeding → Khasra Feeding** entry, also available through Services and Khasra options. Existing Khasra Login still uses its supported Custom Tab, and Khasra Dekhein still opens native public search.
- Explicit Fasli year, Kharif/Rabi/Zaid, village name and six-digit village code. These scope local settings; they do **not** change or verify the official portal's selected context. The operator must match the official selection.
- Separate official-site WebView and route-aware adapter; desktop UA follows the reference. The live Lekhpal link hands off to `https://rccms.up.gov.in/dashboard/login/`; that exact HTTPS host is allowed for login only. Feeding runs exclusively on eKhasra. The helper does not read passwords, CAPTCHA, OTP or authentication fields.
- Manual mode leaves entry to the website. Normal mode mirrors editable survey fields and current dropdown options, including available crop/area/irrigation controls.
- Fill dispatches input/change events. Filling and saving are distinct operations.
- Presets match form field identities and current options. Storage is separated by UP/year/season/village code, avoiding collisions between villages with identical names.
- Presets keep the current plot's area instead of copying a saved area from another plot. A missing required area stops preset filling. Area validation also covers official text inputs, not only numeric inputs.
- A persistent gata queue accepts numeric ranges (up to 500), individual subdivisions such as `12/1`, Hindi digits, and available gatas from the current official page. Exact matches are required; duplicate matches stop the queue. Recognized locked/completed rows are skipped. Missing rows can be filtered using the official search; the helper does not assume a partial match or invent pagination.
- Start/resume, pause, skip, local reviewed status, current/next gata and queue reset are available. Progress is saved before opening a gata. Page changes during confirmation or persistence prevent dispatch. Interrupted active work reopens paused for review. Returning to the list alone never proves completion. A matching lock-success receipt can finish the queue item; failed/uncertain operations pause it. Queue setup collapses while working on a plot.
- Preset mode starts only on an explicit user action. Village/year/season-scoped advanced settings now include optional small-area रिक्त/unirrigated handling, government-land review/include/skip, section progression and automatic submission of reviewed presets. Defaults remain review/off. Starting automatic submission requires confirmation. Locking remains separate.
- Small-area rules use the current plot area and a unique actual रिक्त option; ambiguous or missing fields stop the rule. A uniquely labelled remaining-area field can supply an empty crop area. Government-land handling follows the reference dropdown-count heuristic and is explicitly presented as a signal requiring ownership verification. Government land uses a separate preset.
- Automatic survey-start/section progression uses unique semantic actions, never arbitrary button positions. Submission requires matching values, current gata and one attempt per stage; only confirmed saves permit the next section. Stop, changed context and failures halt progression.
- Explicit confirmation for detected official Save/Submit/Lock actions. Commands are bound to the current document and revision, with duplicate-command rejection and validation before filling.
- Busy/unsupported/changed-page handling, stop controls, and local history (last 100 actions). Timeouts, navigation interruptions and leaving with an operation pending are marked uncertain. No automatic retry of a write.
- Portal success means a new visible website success message was observed. Locks additionally recognize the reference's `Gata Locked Success` SweetAlert message, without automatically clicking dialog confirmations. Old dialogs, confirmation questions and generic “Saved” toasts cannot establish lock success. This does not independently prove the saved government record. Each operation is persisted locally before dispatch; recovery moves an unfinished attempt into uncertain history without retrying it. Storage failure or Stop before dispatch prevents the operation from being sent.
- No subscription gate or competitor backend dependency was added.

## Validation so far

- Automated checks cover domain, injected-script and screen behavior, the login presentation check and the required approved-Bhulekh regressions. The final validation run is recorded below.
- TypeScript passed; lint passed for the new feeding files.
- Bridge tests execute the actual injected script against controlled DOM fixtures: live option changes, stale revisions/documents, duplicate commands, sensitive-field exclusion, fresh versus old success messages, errors, timeout/route/stop uncertainty and disposal.
- Screen tests cover confirmations, direct official-form edits, foreign-message rejection, missing confirmation, pending locks on unmount, and explicit preset start without submission.
- These are fixtures, **not captured authenticated government pages**. They do not establish full authenticated portal behavior.
- A separate read-only Android AVD was started as `emulator-5556`; no commands targeted the user's other emulator. It initially contained an old app build. The current debug APK was installed with data preservation and pointed at Metro port 8082.
- The test emulator opened handwriting input; disabling its `stylus_handwriting_enabled` setting restored the normal keyboard. The login layout was adjusted to scroll with the keyboard, keeping navigation unchanged.
- The app was signed in and the new feeding screen opened successfully. The eKhasra role-selection page and subsequent RCCMS eHRMS/username, password and OTP login form loaded in the new WebView. This verifies the public login handoff, not completion of government sign-in. The portal was slow to load during this check.
- The user confirmed they **do not have government access**. No further credentials are requested from them. Authenticated acceptance requires a separate authorized operator/tester later.
- No government credentials, OTP, crop submission or gata lock was used during verification.

## Remaining Fast Work parity

| Capability | Status / next step |
| --- | --- |
| Authenticated one-plot feeding | Public eKhasra → RCCMS login handoff verified. Operator sign-in, return to survey forms and actual record behavior remain unverified; original Custom Tab login remains available. |
| Official context and gata identity | Read and validate selected village/year/season/gata before enabling cross-plot automation; local setup fields alone are insufficient. |
| Range/next/skip queue | Implemented and fixture-tested for exact matching, subdivisions, locked rows, persistence, stop and interrupted recovery. Automatic pagination is not implemented; authenticated list compatibility remains unverified. |
| Normal mode / progression | Individual form helpers and exact gata queue exist. Optional semantic survey-start and confirmed-save section progression are implemented; current authenticated portal compatibility remains unverified. |
| Advanced mode | Crop/irrigation presets, government-land review/include/skip, optional auto-submit and auto-next implemented. Defaults and ambiguous-page stopping are tested. This is not verified full parity on live authenticated records. |
| Small-area रिक्त rule | Explicit opt-in threshold rule implemented with current plot area, unique official रिक्त option and irrigation field. Area units must match the portal. |
| Mixed crop / partial areas | Generic fields may be readable, but repeated-row entry and remaining-area reconciliation are unverified. |
| Confirmation and locking | Detected controls can be confirmed individually; current portal dialogs and authoritative record verification remain. Local crash recovery is implemented and fixture-tested. |
| Revenue Inspector approval | Not implemented; requires separate role-specific inspection and acceptance cases. |
| Non-UP feeding | Not implemented. The JSON state foundation does not make this UP adapter work in other states. |

Ansh Nirdharan/removal and Prapatra-5 are now implemented at the scope documented in `REVENUE_FEEDING_IMPLEMENTATION.md`. Continue the agreed sequence in `ALL_INDIA_CONFIGURATION_DESIGN.md`: Ansh Nirdharan/removal, Prapatra-5, approvals and document export; map/KMZ workflows; census, Farmer Registry and other reference modules. Portal links and generic PDF export do not count as equivalent completed workflows.

## Inputs needed for the live pilot

For later acceptance, an authorized operator signs into the government portal themselves. Confirm their government role, Fasli year and season, then inspect a representative village/gata and its expected crop, area and irrigation values. A real submission/lock requires a concrete reviewed record and authorization for that action; no passwords or OTPs should be sent in chat. The current user has no government access, so this is an external validation dependency, not an unfinished sign-in request to them.

## Final validation for this stage

The earlier queue/lock/area stage passed 108 tests in 14 suites. The newer advanced rules and revenue helpers are covered by the run documented in REVENUE_FEEDING_IMPLEMENTATION.md. `npx tsc --noEmit` and targeted ESLint passed. The required approved-Bhulekh regressions are included. No authenticated record was submitted or locked.

```sh
npm test -- --runInBand __tests__/FeedingQueuePanel.test.tsx __tests__/KhasraQueue.test.ts __tests__/PremiumPresentation.test.tsx __tests__/KhasraFeedingScreen.test.tsx __tests__/KhasraFeeding.test.ts __tests__/KhasraFeedingBridge.test.ts __tests__/ServicePresentation.test.ts __tests__/BhulekhServiceLaunch.test.ts __tests__/BhulekhSession.test.ts __tests__/BhulekhPreload.test.tsx __tests__/WebViewPortalScreen.test.tsx __tests__/NationalWorkspace.test.ts __tests__/KhasraSearchScreen.test.tsx __tests__/PortalBrowser.test.ts
npx tsc --noEmit
npx eslint src/components/khasra/FeedingQueuePanel.tsx src/domain/khasraQueue.ts src/domain/khasraFeeding.ts src/utils/khasraFeedingBridge.ts src/screens/KhasraFeedingScreen.tsx src/screens/KhasraOptionsScreen.tsx
```

Preserve `docs/approved-bhulekh-baseline.md` and `AGENTS.md` throughout this work. Do not reroute existing Khasra Login into the new embedded browser.

## Source-to-implementation comparison, 10 October

All reference paths below are relative to `/Users/sneha/Work/Apps/LekhpalFastWorkCode/sources/com/lekhapal5441/app/`.

| Reference evidence | Current implementation / remaining difference |
| --- | --- |
| `FastKhasra/Khasra1432/AllInOneWebViewActivity.java`: `clickOngataList`, `SkipGata` | `src/domain/khasraQueue.ts`, `src/components/khasra/FeedingQueuePanel.tsx` and `src/utils/khasraFeedingBridge.ts` implement ranges, exact row selection, search, skip and progress. They do not select arbitrary `.btn-info` positions. |
| Same activity: `chooseFasal`, `FeedFasal` | Official crop options and irrigation fields are mirrored and presettable. Areas are plot-specific. Explicit remaining-area copying, government-land preset/skip rules and optional small-area रिक्त handling are implemented; ambiguous fields stop. |
| Same activity: `FinalGataLocked`, `checkGataInsertedIfLock` | Individual reviewed lock actions, fresh success-message detection, uncertain recovery and queue receipt matching exist. Optional confirmed-save section progression and reviewed preset submission are implemented; locking remains separately confirmed. |
| `FastKhatoni/AnshPageScripts.java`, `Prapatra5Activity.java`, `EntryUserPdfActivity.java` | Share determination/removal and Prapatra-5 helpers now exist; see REVENUE_FEEDING_IMPLEMENTATION.md for exact scope and tests. SVAMITVA/tehsil export parity remains missing. |
| `FastBhulekh/Bhunaksha/BhunakshaPlotActivity.java`, `BhunakshaKmzPackageWriter.java` | Existing map access/GPS tools are not equivalent to parcel-specific map and KMZ extraction/export. This remains a separate implementation task. |
| `FastAgriCensus/FastCensusWebActivity.java`, `FastFarmerRegistry/FarmerRegistryActivity.java` | Census feeding and role-specific Farmer Registry assistance remain to inspect and implement. |
| `Maharastra/EChawaniActivity.java`, `AdeshPrint/WebActivity.java`, community/consultation modules | Department-specific work, order printing, community and consultation need their own module review and implementation. Developer-hosted service behavior cannot be reconstructed from client code alone. |

The reference is being used as behavioral evidence, not copied wholesale into React Native. These remaining implementation items are not blocked merely because the current user lacks government access. Live authenticated acceptance is a separate dependency. Subscriptions remain excluded.
