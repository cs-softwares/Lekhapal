> Later ERO update, 12 October 2026: the reference ERO PDF workflow is implemented and checked with a two-record native emulator batch. See [ERO implementation](ERO_PDF_IMPLEMENTATION.md). The historical ERO gap below is superseded; order/application templates remain separate. The later Census/e-Chawadi update is recorded in [parity status](FASTWORK_PARITY_STATUS.md).

# Remaining-work implementation, 11 October 2026

This update implements further census, Khasra and Maharashtra e-Chawadi work. It is **not a claim of complete FastWork parity**. The earlier all-state rollout remains in place; UP's approved public Bhulekh screens and Khasra Custom Tab login were not edited. Only Lekhpal on emulator-5556 was used for UI checks; the DSA emulator was not modified.

## Implemented

### Census

- Separate settings/presets for individual/joint, institutional, continuation, Block D, operational-holder and Phase 2 workflows. State-specific storage remains isolated; the existing UP storage key remains compatible.
- Dynamic Block C rules use current row identifiers, including non-contiguous/different row counts. Land use is filled before dependent land type/holder controls. Each change waits for a new snapshot; missing controls, unavailable options and values that do not stick stop automation.
- Small-area rules compare the complete official decimal area. Non-operated land requires an explicitly selected subtype. Institutional mode identifies the actual institutional radio and requires an official sector; it does not fabricate names or gender.
- Maharashtra split area conversion previews fixed-point, four-decimal results in the editable draft. The user reviews and fills them; conversion is not repeated automatically across refreshes.
- Phase 2 Schedule H reads the official operated holding area, stages one/two crop rows, fills irrigated or unirrigated totals and crop areas, and validates the actual irrigation-source option. Each crop uses the full operated area, matching the reference's simple case. Mixed/partial areas remain manual. Crop selection and calculation use the official controls.
- Operational-holder selection uses actual checkboxes carrying the reference's `checkbox_update_1` handler, rather than blindly calling numeric row indices.
- Current-record application is bound to the document, URL, official context and holder identity. Serial batches retain a snapshot of the reviewed rules/preset and the existing durable submission journal.
- Presets exclude names, serial/account identities, plot counts and plot/crop areas. Old indexed row presets cannot overwrite a different holding's plot layout.

Reference: `FastAgriCensus/FastCensus{Web,InstitutionalWeb,ContinueWeb,BlockDWeb}Activity.java`, `OprationalHolderActivity.java`, `Phase2/Phase2Activity.java`.

### Khasra feeding

- Follow-up implementation: dedicated UP subsection automation now supplements the generic presets. It is enabled through Khasra Feeding → Work settings → Presets → Advanced feeding rules → Use subsection automation. Settings remain isolated by village code, Fasli year and season. Existing saved settings migrate with this option disabled.
- Land mode selects the reference's `option1`, handles cultivated/fully fallow plots with zero non-agricultural area, and fills a verified non-agricultural type with the current official area. Government-land inclusion requires an explicit non-agricultural rule; review/skip remain available.
- Fallow mode selects `option2`, writes zero for cultivated plots or the official remaining area for fully fallow plots. Non-agricultural and fully fallow workflows can finish at their respective sections; automatic lock remains separately enabled and requires a confirmed save and matching official context.
- Tree rules implement the reference's two `vrikshType1` categories, explicit counts (including verified zero entries), sequential confirmed saves, and recovery from a uniquely labelled category/count table. Save controls are associated with the matching official form. A table refresh preceding its success notice cannot skip the second category.
- Crop mode selects `option3`, uses the current Kharif/Rabi/Zaid crop options, stages irrigation changes before reading dependent controls, validates the official irrigation method, and fills current plot areas. It supports the existing small-area रिक्त rule and percentage crop plans without requiring a generic form preset. Matching single-crop records can advance without another save; conflicting entries stop.
- Configurable remarks are filled before the existing confirmed-save/final-lock/list-return sequence. Angular mode/type changes are separate operations from the final fill. Missing or ambiguous controls, unavailable choices, lost field identities, failed saves and uncertain results stop progression. Existing official entries are never deleted to force a match.
- Reads a uniquely labelled official crop table, including Devanagari area values and explicit irrigation labels.
- Reconciles already-entered rows against crop option identities, four-place areas, irrigation and remaining area. A matching partial plan resumes at the next crop. An already-complete plan asks for review; mismatches, extra rows or ambiguous crop names stop instead of resubmitting.
- Existing success-receipt progression remains available when the table layout cannot be read. Remaining area alone never establishes recovery.
- The gata queue can follow uniquely identified Next controls within official pagination, avoids repeated requests for the same page, limits traversal to 500 pages, and stops on a village/year/season mismatch or stalled page. Exact gata matching remains mandatory before opening a record.

Reference for subsection rules: `FastKhasra/Khasra1432/AllInOneWebViewActivity.java` (`ChooseLandType`, `FillKrishit`, `FillAkrishit`, `insertFollowLand`, tree callbacks, `chooseFasal`, remarks/final-lock flow). The older Kharif/Rabi/Jayad advanced activities were compared for season/irrigation behavior; their legacy DOM selectors and hardcoded crop IDs are not imposed on the current portal.

Subsection verification: **461 tests / 68 suites passed** in the full suite, including the approved Bhulekh regressions. TypeScript, targeted ESLint and whitespace checks passed. Integration tests execute the complete cultivated sequence for all three seasons, the two early-finish branches, tree refresh ordering, multi-crop feeding, and interrupted-save behavior. The bridge tests execute the actual injected JavaScript against DOM fixtures. Khasra's setup screen opens at phone width on emulator-5556; DSA emulator-5554 was not operated. Evidence: `outputs/qa/khasra-subsections-2026-10-11/`.

Authenticated official land/tree/crop forms and real saves/locks were **not** exercised. Unrecognized authenticated layouts may still need adapter changes. This completes the described subsection implementation; it does not assert full parity for every FastWork module or legacy portal layout.

### Maharashtra e-Chawadi

- Added reviewed demand submission through a uniquely identified official action. Pending history is persisted before clicking; only a new positive official notice confirms it.
- Added explicit Cash preparation and an opt-in account batch. It searches exact accounts, checks village/session, named Cash mode and a positive labelled amount, and waits for confirmation before the next account. Uncertain history blocks another batch until the user checks the official record. Previously confirmed accounts in the same context must be removed from a new batch or reviewed individually.
- Pending writes recover as uncertain after interruption; storage failure prevents submission. Native and bridge timeouts stop a stalled run. Backgrounding, navigation and Stop interrupt work.
- Form 8B reads the reference's `#table-to-xls` report. The official-layout export preserves table cells, spans and computed typography/borders, while removing scripts, controls and external images. The existing collected-table PDF remains separately labelled.
- A labelled account-number column can populate the payment queue. Marathi/Hindi digits normalize before deduplication.

Reference: `Maharastra/EChawaniActivity.java`, callbacks `h.java`, `j.java`, `d.java`, `B7/g.java`, and `p016b/d.java`.

## Still outstanding

These are implementation gaps, not just testing:

1. Phase 2's complete multi-window serial/survey/crop chooser sequence and unattended mixed-irrigation batch. The current-record helper does not replace the reference's native child-WebView transport. Phase 2 and operational-holder screens therefore do not offer the L1/L2 serial-batch button.
2. e-Chawadi's unattended final demand confirmation dialog after collecting selections across pages. Demand submission is reviewed in-app; any official confirmation dialog is completed on the official page. Unknown account/amount/notice layouts and receipt-print-only success transitions stop for review.
3. Remaining ERO PDF/list/layout/filename variants and order/application templates. Missing source templates or representative outputs are still needed for exact output parity.
4. Expert/community voice service requires this app's own backend/provider configuration. No reference credentials, accounts or paid service are reused.
5. Additional authenticated portal layout variants may need adapter changes. No authenticated government save/payment was performed during this update.

## Verification

- Final full Jest suite: **437 tests / 67 suites passed** (6.702 seconds), including all approved Bhulekh regression suites.
- Final TypeScript, targeted ESLint (zero warnings/errors), and `git diff --check` passed.
- Unit/integration coverage includes dynamic census rows, sensitive-field exclusions, decimal conversion, Phase 2 holding-area use, crop recovery/mismatches, list paging/scope changes, durable payment history, interrupted writes, incorrect account/amount/mode rejection and waiting for confirmation before the next account.
- Public census page and native settings were checked on emulator-5556. Official authenticated crop-popup behavior, payments, final demand confirmation and printed report appearance still require acceptance testing on the user's account. Passwords and OTPs should be entered directly into the official portal.

Evidence: `outputs/qa/remaining-work-2026-10-11/` contains the isolated emulator screenshots and final test log. The emulator was already using Assam; that selection was preserved.
