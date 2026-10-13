> **Latest status:** [FASTWORK_PARITY_STATUS.md](FASTWORK_PARITY_STATUS.md) supersedes the session-local/manual-only statements and backlog below. This file retains the earlier implementation record.

# FastWork revenue workflow implementation

Updated 10 October 2026, branch `sneha_dev`. Subscriptions are excluded.

## Where the new work is visible

The active home screen is `src/screens/StateDashboardScreen.tsx`, not the legacy `HomeScreen` catalogue. **Dashboard → Revenue feeding** now exposes Khasra Feeding, Ansh Nirdharan, Remove Ansh Entry and Prapatra-5 Feeding directly after Daily Work. The same cards are searchable in Services under All, Land records and Revenue services. These adapters are UP-only; other states do not receive UP mutation links.

The existing Khasra Login stays in its supported Custom Tab. Khasra Dekhein and the four approved public Bhulekh flows retain their existing navigation. New revenue helpers use a separate `RevenueFeeding` browser route keyed by module.

## Reference and implementation

Read `/Users/sneha/Work/Apps/LekhpalFastWorkCode/APP_ANALYSIS.md` before following relevant source files. Reference paths below are relative to its `sources/com/lekhapal5441/app/` directory.

| Reference behavior | Implemented behavior |
| --- | --- |
| `FastKhatoni/AnshNirdharan.java`, `AnshPageScripts.java`, `AnshBatch.java`: gata/owner selectors, share detail, submit and remaining-owner reconciliation | Actual `gataNumber`/`ownerName` selectors; wait for the owner's option-list update and request completion; identity fields read-only; calculate `1/n` share area to four places; fill share/hissa and choose current remarks; explicit save confirmation. |
| Same Ansh activity, delete mode | Distinct selection/detail routes, read-only share details and explicit destructive confirmation. No blind repeat deletion. |
| Normal versus advanced Ansh sequencing | Normal handles owners in the selected gata; advanced progresses through available gata options. Confirmed owner pairs are excluded from subsequent work. Skip selected/detail owner and Stop are supported. Each write remains individually reviewed; a batch is session-local and never auto-resumes after a restart. |
| Ansh post/redirect returns to selector | A pending write can reselect its original gata. Only a freshly loaded same-gata pending-owner list that no longer contains that owner confirms processing. Merely opening the selector does not. |
| `FastKhatoni/Prapatra5Activity.java`, `PrapatraPageScripts.java`: property → check → boundaries → owners → remarks → result | Route-specific helper reads the current official inputs and options; maps village/survey, gata/property number, boundaries, category/subcategory (`scat`), owner details, relationships, ID/contact fields and remarks. Field changes dispatch input/change/keyup. Only changed fields are filled, avoiding unnecessary dependent-selector resets. |
| Prapatra range/custom property numbers | Persisted range (maximum 1000) or custom-number queue with Hindi digits and duplicates removed. Bound to village/year/gata. Preparing a property persists progress first; final confirmed save marks that property complete. Next-property navigation and preparation are explicit. Skip is local only; interrupted preparation is uncertain on recovery. |
| Prapatra owner-save proof | Require an increased count of the matching normalized owner name in the official owner table, using a hash in local history. A toast alone cannot confirm owner save, including after document navigation. Supports adding more owners through the official page. |
| Prapatra final save | Recognize the unique official form targeting `addremark`, require review/confirmation, wait for a positive result and expose the official return-to-property link. Missing or ambiguous controls remain manual. |
| Reference write/session controls | Page/revision-bound commands, duplicate rejection, durable pending journal before every write, explicit Stop, lifecycle pause, timeouts and uncertain recovery. No automatic retry of an uncertain write. History stores operation metadata, not passwords or copied owner/ID/contact form values. |

Implementation files: `src/domain/revenueFeeding.ts`, `src/domain/prapatraQueue.ts`, `src/utils/revenueFeedingBridge.ts`, `src/screens/RevenueFeedingScreen.tsx`, and `src/components/revenue/`. Khasra advanced rules are in `src/domain/khasraAdvanced.ts` and `src/components/khasra/AdvancedFeedingSettings.tsx`.

## User direction: implementation first, live acceptance later

The user confirmed that they will verify the app later with a real Lekhpal government login. Do not treat unavailable authenticated access as a reason to leave implementable features pending. Continue source comparison, implementation and local tests; keep later live acceptance separate from missing code. Subscriptions remain deferred and the approved existing navigation must remain intact.

The next implementation gaps are:

1. Complete Khasra automatic finish/lock/return-to-list progression; read official village/year/season instead of relying only on local setup; finish dedicated handling of repeated crop rows and area totals. Current preset fill, optional auto-submit/section-next, small-area rules and government-land handling already exist. Automatic list pagination is absent; compare the reference before claiming equivalent support.
2. Finish Ansh batch automation: share/rule reuse across owners, opt-in automatic save/removal sequencing, and persistent batch resume. Current owner sequencing exists but individual writes still require confirmation and batches are session-local.
3. Finish Prapatra-5 batch automation: automatic property preparation, stage progression and next-property continuation using configured values. Current queues and helpers exist but preparation/navigation and writes require individual actions.
4. Implement Revenue Inspector and Survey-9 approval workflows.
5. Implement specialized SVAMITVA/tehsil PDF retrieval, print and share workflows.
6. Implement parcel-specific map/KML/KMZ export and retrieval.
7. Inspect and implement agricultural census and Farmer Registry/AgriStack assistance.
8. Review remaining state-specific departmental workflows, order-print/document tools, and community/consultation services individually. Developer-hosted features require our own integrations/backend, not just reference URLs.

This is the current audited backlog, not a claim that every retained legacy activity in the extracted app has already been compared.

## Validation and limits

Automated tests execute injected JavaScript against controlled DOM fixtures and test native helper interactions, origin restrictions, stale confirmations, dirty-field filling, storage failures, owner-table proof, refreshed Ansh reconciliation, interruption recovery and property queues. Required approved-Bhulekh regression suites are included. Fixtures are not captures of authenticated official pages.

The user has no government access. Live authenticated submission, removal, locking and final record acceptance require a separately authorized operator later. This does not block implementation and is not a request for credentials. No government records were modified during development.

Current implementation does not mean every FastWork feature is complete. Remaining separate modules include Revenue Inspector and Survey-9 approval, SVAMITVA/tehsil-specific PDF export, parcel KMZ/map export, census, Farmer Registry, Maharashtra-specific workflows and order-print integrations. Community/consultation and developer-hosted services also require their own designs or backend implementation. Existing portal links and generic PDF export do not count as completed parity for these modules.

Prapatra property preparation/navigation and Ansh record writes require review, whereas the reference has more unattended steps. No captured authenticated fixtures are available to certify all website field/layout variants, dependent dropdowns, multi-owner edge cases, current role permissions or final portal outcomes. Non-UP feeding requires separate state adapters.

## Verification record, 10 October 2026

- 145 tests pass across the 19 relevant suites, including the approved Bhulekh checks. The initial combined run passed 144; the added stop-during-property-persistence case and affected queue/screen suites subsequently passed.
- `npx tsc --noEmit` and targeted ESLint pass after the final changes.
- Only `emulator-5556` was operated. The existing debug app used Metro on port 8082; no other emulator or app was reset or changed. The current branch remains `sneha_dev`.
- The live Dashboard displays all four revenue cards. Ansh opens the official Tehsil Mutation login; Prapatra-5 opens the official Lekhpal Halka login. No credentials or CAPTCHA were entered and no record write/delete was performed.
- Screenshot evidence: `outputs/qa/revenue-feeding-2026-10-10/` (`dashboard.png`, `ansh-entry.png`, `ansh-login.png`, `prapatra-entry.png`, `prapatra-login.png`).

Test suites: RevenueFeedingScreen, RevenueFeedingBridge, RevenueFeeding, PrapatraQueue, RevenueWorkLinks, KhasraAdvanced, FeedingQueuePanel, KhasraQueue, KhasraFeedingScreen, KhasraFeeding, KhasraFeedingBridge, ServicePresentation, BhulekhServiceLaunch, BhulekhSession, BhulekhPreload, WebViewPortalScreen, NationalWorkspace, KhasraSearchScreen and PortalBrowser.
