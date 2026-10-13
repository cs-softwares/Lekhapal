# Current checkpoint — 29 September 2026 follow-up

Latest: Premium and About screens redesigned and tested locally. Following explicit user approval, developer-wide license testing for the Lekhpal Premium Testers list was SAVED and Play Console confirmed success. No test purchase completed. The running emulator reports `Accounts: 0`; Play Store was opened for private sign-in with sneha2095.er@gmail.com. New UI is not yet published in internal build v2.

Account correction: the user now chose shankhwarsneha99@gmail.com. Verified it in the existing sneha-development list, and added it to the selected Lekhpal Premium Testers license list (now two accounts). Saved successfully. Emulator now reports both supplied Google accounts; the zero-account blocker above is resolved. Lekhpal restarted for billing reconnection; purchase tests remain pending.

This section supersedes the older shutdown checkpoint below. Read docs/PREMIUM.md for current details.

- Supabase tools now work; verified edzpqmcjsweddavklitb is exactly Lekhpal.
- Premium function version 2 is ACTIVE; protected tables and authenticated scheduler verified live. No redeployment or new verifier credentials are needed based on this audit. Prior deployment notes report verifier credentials configured; live purchase verification still needs a licen
se-test token.
- Both Play prepaid base plans are now ACTIVE: prepaid-month, INR 199 / 1 month; prepaid-quarter, INR 499 / 3 months. India only, manual extension allowed, no automatic renewal. Prior ID rejection did not recur.
- Checkout remains disabled (premium_config.enabled=false); purchase count is zero.
- Pixel_7a emulator is running with local debug Lekhpal launched and dashboard verified. Metro runs on port 8082. Debug update preserved existing app data.
- 10 Jest suites / 65 tests and TypeScript checks passed. App/backend source was not changed during this follow-up.
- Next: user signs into emulator Play Store and provides tester email; verify license tester + internal-track eligibility, install internal build, then conduct controlled purchases/restore/expiry/failure tests before production availability. Do not overwrite/remove emulator app data to resolve signing conflicts without preserving records and discussing the consequence.
- No DSA App/project changes, paid billing or Firebase were introduced.

---

## Historical shutdown checkpoint (superseded)

# Resume Lekhpal premium setup

Checkpoint saved before laptop shutdown, 29 September 2026.

## Correct project — verify before every external write

- Workspace: /Users/sneha/Work/Apps/Lekhapal
- App: Lekhpal; Android package com.lekhpal
- Supabase project: edzpqmcjsweddavklitb
- URL: https://edzpqmcjsweddavklitb.supabase.co
- Google API-only project: lekhpal-play-verification
- Play developer: 6895537810041531610
- Play app: 4975438064524736783
- DSA App is a DIFFERENT project. Do not change it or copy its URL into Lekhpal.

Read AGENTS.md, docs/approved-bhulekh-baseline.md and docs/PREMIUM.md before continuing. Preserve all existing user work; the worktree contains many unrelated changes. Do not reset or overwrite it.

## User approvals and constraints

The user approved implementing premium with Supabase and Google Play prepaid purchases. Approved prices: INR 199 for one month and INR 499 for three months. No automatic renewal. Keep prices/durations sourced from Play. Free services only; no paid Google Cloud billing, Firebase, or Cloud hosting. A free Google API project/credential for Play verification is permitted. User explicitly approved Google API terms and API activation. Do not request those approvals again.

A separate browser confirmation to create the dedicated service-account key, grant Lekhpal-only Play purchase/order permissions and store the key in Supabase was asked, but no explicit answer was recorded. The service-account form was filled with name Lekhpal Play Verifier and ID lekhpal-play-verifier. Account/key creation and Play permission grants were NOT completed.

## Completed and verified

- Premium application and backend source implemented; full file inventory in docs/PREMIUM.md.
- Premium features: GPS boundary capture/editing and PDF exports. Basic tools, government portals, saved-record viewing and location lookup remain free.
- Supabase premium_config and premium_purchases tables created through SQL Editor. Catalog product lekhpal_premium, enabled=false verified in live table editor.
- Live REST reads using the app publishable key returned HTTP 401 / PostgreSQL 42501 for both tables.
- Focused Jest run: 10 suites, 64 tests passed; after pending-token reconciliation changes, both premium suites passed again (10 tests).
- TypeScript and Deno backend checks passed. ESLint: no errors, void-promise warnings.
- Android debug build passed after setting newArchEnabled=true for Nitro codegen. Build log: /tmp/lekhpal-premium-build.log (temporary, may disappear).
- Free Google API project created. Enable API was clicked after approval and the browser navigated to API details; independently recheck enabled status before relying on it. No paid billing was enabled.
- Supabase plugin installed and enabled; browser showed connected account Creative Softwares's Supabase account. Its callable tools did NOT load into this original conversation.

## Not complete — do not report payments live

- No checked-in Edge Function successfully deployed.
- No Play service-account credential or Supabase function secrets configured.
- No premium Cron job configured.
- No Play subscription product/base plans or prices saved.
- No real or license-test purchase completed.
- Sales remain disabled.

Supabase browser New Function editor may contain an UNDEPLOYED, malformed draft named premium (default index.ts and edited purchase.ts). Do not deploy that draft. Deploy the exact checked-in source instead, preferably through the connected Supabase tools or an authenticated official CLI.

## Next steps

1. Check that Supabase tools are callable in the new session and list projects; choose only edzpqmcjsweddavklitb. Installation/connection is already confirmed; do not ask the user to reinstall.
2. Inspect live schema/RPC state before applying migrations again. Schema was applied through SQL Editor, not recorded with CLI migration history.
3. Complete dedicated Play verifier credentials with narrowly scoped app permissions and store them only in Supabase secrets. Do not print or commit secrets.
4. Deploy supabase/functions/premium and configure its authenticated scheduler; inspect code/tests first. Verify all endpoints and grants.
5. Inspect Lekhpal's existing subscriptions before creating lekhpal_premium with prepaid-month and prepaid-quarter at approved prices. Do not use auto-renewing plans.
6. Test a Play-installed internal-test build with license testing for success, pending, cancellation, failure, expiry, refund/revocation, restart/reinstall, restore, account mismatch, outages and repurchase.
7. Enable sales only when configuration and testing are complete; preserve the approved Bhulekh flows and Khasra Custom Tab login.

## Important cross-chat event

The user pasted a response from another chat claiming it hardened DSA App tables user_progress, premium_purchase_claims and premium_device_sessions, and RPCs claim_premium_purchase/get_premium_access in project zflmjztarjhqwqiqahci. These claims were not independently verified here. That was the WRONG project for this task. Do not undo DSA changes without reviewing the exact migration and explicit scope.

## Tool limitations encountered

Browser control was unreliable: missing codex app-server executable, stale accessibility snapshots, clipboard timeouts, missing element frames. Native control sometimes worked. Computer Use explicitly blocked opening com.openai.codex for safety reasons; do not bypass that restriction. User manually installed/connected Supabase afterward. A new session may expose its tools; check actual availability before claiming access.

## Suggested restart message

Continue the Lekhpal premium setup. Read docs/RESUME-PREMIUM.md and docs/PREMIUM.md first. Verify Supabase project edzpqmcjsweddavklitb before making changes. Do not touch DSA App. Preserve existing work and use free services only.

## Subsequent About screen work — 29 September 2026

About redesign and Android Gmail/version bridge installed in the local debug emulator build; see docs/ABOUT.md. Both redesigned Premium and About source remain unpublished to Play. Premium license-testing account-wide confirmation remains pending. Historical logcat showed IAP service-disconnected errors from the previous app process during five-minute purchase queries; investigate billing reconnection during the controlled purchase-test follow-up rather than treating checkout as verified.

## Purchase-test continuation — 30 September 2026

Verified project edzpqmcjsweddavklitb is Lekhpal / ACTIVE_HEALTHY. Live readiness query: product lekhpal_premium, enabled=false, purchase count 0, reconciliation job active each minute. Emulator process 25060 has no recorded RN billing errors since restart; this alone does not prove purchase readiness. Both Google accounts exist on device. Matching Supabase account exists for sneha2095.er@gmail.com; Google Play billing account may differ from the app login, but restore must retain the original pair.

Computer-control inventory does not expose the standalone emulator. Asked user whether ADB input controls may be used for emulator UI/free checkout, or whether they prefer tapping themselves. Await that response before ADB UI input. No checkout switch changed and no test purchase attempted. Google official billing test guide confirms matching-package debug sideloads work for license testers and that the payment sheet must show the test-purchase notice/test payment method.

## ADB approval and live checkout attempt

User approved ADB UI controls. Live Play lookup now returns both correct prepaid prices. Temporarily enabled checkout for the session; monthly checkout returned item-not-found. Internal-test enrolment page on emulator Chrome shows an unaccepted invite for sneha2095.er@gmail.com. Asked consent to accept email/app-usage sharing, or switch invite to shankhwarsneha99@gmail.com. Await answer. Proof: outputs/premium-test-invite.png. Checkout restored to disabled while pending. No payment completed. Continue from emulator Chrome invite; do not repeat ADB permission request.

## Current blocker after selected-account test — 30 September 2026

shankhwarsneha99@gmail.com is already enrolled in Lekhpal internal testing; verified visible Google account and tester status. Switched Play Store itself to this account. Test listing loads, but monthly checkout still returns item-not-found after fresh app offers and Play Store restart. One attempt hit Cronet ERR_CONNECTION_CLOSED; network recovery restored listing but did not solve item error. No successful purchase. Checkout restored to enabled=false.

Proposed next step: replace local debug installation with Play-installed internal-test build using chosen account. This requires uninstalling differently signed debug app, so ask before removing local data. A private backup was created and validated at /private/tmp/lekhpal-before-play-install-20260930.tar (mode 0600; databases/files/shared_prefs/no_backup/app_webview). Contains private session data: never commit/upload/print. Backup is for recovery to debug installation; do not promise automatic import into a non-debuggable Play build. Existing debug APK remains android/app/build/outputs/apk/debug/app-debug.apk. No uninstall performed. App stopped for consistent backup. Evidence: outputs/premium-tester-enrolled.png and outputs/premium-checkout-item-error.png.

## Play-installed build ready — 30 September 2026

User explicitly authorized all needed payment steps after the specific replacement request, with source code unchanged. Uninstalled backed-up debug app and installed com.lekhpal from its internal-test Play listing. Android confirms installer=com.android.vending. Opened installed build; currently at Welcome / email-password Sign in screen. Needs user's private Lekhpal login; asked user to sign in. Do not use “Continue in test mode” to bypass real account binding for purchase acceptance. Existing Supabase login previously used sneha2095.er@gmail.com; chosen Play tester remains shankhwarsneha99@gmail.com (these can differ). No payment completed, checkout remains disabled. Source/UI files unchanged. Private backup remains /private/tmp/lekhpal-before-play-install-20260930.tar. Screenshot outputs/premium-play-build-login.png. Published build is earlier v2 UI; current improved local source has not been published.

## Free checkout reached — 30 September 2026

User signed into Play-installed Lekhpal as sneha2095.er@gmail.com; Supabase last_sign_in verified. Temporarily enabled premium_config for controlled testing. Monthly checkout NOW WORKS on Play-installed build, showing “Test card, always approves” and explicit “You will not be charged.” Prepaid test expiry is accelerated. Screenshot outputs/premium-free-test-checkout.png. No Buy tap yet: requested action-time confirmation because final button explicitly accepts Buyer Terms (India) and Privacy Notice. Wait for answer before tapping Buy. Dialog remains open on emulator; current Buy bounds [63,2206][1017,2301] (refresh before using). Code unchanged. Purchase count zero before confirmation. After success, immediately query only nonsecret purchase state/acknowledgement/expiry fields and verify UI entitlement, restore, accelerated expiry; do not print purchase tokens.

While awaiting final Buy consent, restored premium_config.enabled=false to prevent new checkout starts. The already open Play test dialog can still complete; server verify/restore remain enabled. Purchase count was 0 at handoff.


## Latest checkpoint — Premium benefits, calculator locks and password recovery

Read [PREMIUM-FEATURES-2026-09-30.md](PREMIUM-FEATURES-2026-09-30.md) for the current implemented features, tests, emulator package and remaining SMTP/ads/Play acceptance work. User authorized feature changes and prohibited further Play uploads. The earlier instructions to upload a new internal artifact are superseded. Existing version 3 remains only a draft. Password reset callbacks are saved in Lekhpal Supabase; public email delivery still requires SMTP.


## AdMob work — 30 September 2026

User chose Banner + Native + Interstitial; no Rewarded. Read [ADS.md](ADS.md) for implementation, verified Lekhpal unit IDs, caps, tests and live-release blockers. Privacy policy was subsequently published on 1 October (checkpoint below); AdMob consent publication remains pending. No Play upload/release is authorized.

## Google Play update prompts — 30 September 2026

Added the official Google Play app-update 2.1.0 Android bridge, a shared update check, a red availability dot on the existing drawer Update app row, and an English/Hindi launch/foreground prompt. A confirmed newer Play version requires Update now or Close app; immediate updates use Google's installation UI with store fallback. In-progress updates resume on foreground. Unknown, unsupported QA installs and failed/offline checks never claim a version is current or invent a mandatory update. Manual drawer checks show “Your app is already up to date” only after a successful Play check confirms no update; failures show a retry message. Concurrent requests are deduplicated; checks time out after 10 seconds without adding a launch delay.

No Play upload was made. Real upgrade installation requires a Play-owned installation with this code and a newer eligible version on its track (matching app ID/signing and higher versionCode). Existing builds without this code cannot gain this popup remotely. The `.qa` emulator package deliberately cannot claim a real Play update; availability/current/error/cancelled/busy paths are covered by automated tests. Bhulekh portal code and workflows remain unchanged.


## TEMPORARILY HIDDEN PREMIUM — user instruction, 1 October 2026

Premium is intentionally hidden for internal testing, NOT deleted. `src/config/releaseFeatures.ts` has `RELEASE_FEATURES.premium = false`. This hides the drawer entry, purchase screen route, membership badges, lock prompts and Premium marketing paragraph; formerly gated GPS, PDF, organisation and advanced calculator features are available for testing. All purchase, plan, verification, expiry and UI code is retained.

When the user says “unhide Premium”, set this same flag to `true`, verify paid-mode tests and restore the normal gates. Do not rebuild or delete the feature. Do not enable it before the user asks. Ads remain independent and enabled with their existing consent/test-mode settings: test feature access is NOT a paid or ad-free entitlement. No backend subscription state or Play release was changed. Never upload this testing configuration as production without reviewing the user's requested Premium rollout.

## Privacy policy published — 1 October 2026

User requested updating the existing Lekhpal policy in Creative Softwares' Google account. Updated and published https://sites.google.com/view/lekhpal-privacy-policy under creativesoftwares96@gmail.com, effective 1 October 2026, and verified the fresh public page. Matched disclosures to current source: Supabase accounts/recovery, local records and exports, GPS and OpenStreetMap/Leaflet resources, three AdMob formats and privacy choices, local notifications, Google Play updates, retention/deletion and external portals. Explained that Premium screens/locks are temporarily hidden for internal testing while ads remain, and that testing access does not grant a paid/ad-free entitlement. Evidence: `outputs/lekhpal-privacy-published-2026-10-01.png`.

No app code, Supabase configuration, AdMob consent publication or Play release changed in this policy task. The AdMob European consent message remains an unpublished draft; see ADS.md for outstanding live-ad readiness steps.

## Internal release requested; live drawer recheck — 1 October 2026

User now authorizes increasing the Android version, building an AAB and uploading to Play after app loading checks. Continue on internal testing, preserving the Premium-hidden configuration and test ads; this supersedes the earlier no-upload instruction for this internal release. Before any upload, user reported Premium still visible in the emulator drawer. Source flag is false and drawer/root-route guards are present, but the running com.lekhpal.qa app still displayed the old Premium screen. Reload and clean-cache Metro restart exposed a native Fabric MountingCoordinator SIGSEGV during startup. Investigating/rebuilding QA before declaring readiness. No version bump, AAB upload or release has happened yet. Full automated checks passed: 41 suites / 228 tests and TypeScript. Logs: /private/tmp/lekhpal-release-tests.log, /private/tmp/lekhpal-release-types.log, /private/tmp/lekhpal-premium-hidden-rebuild.log. Preserve emulator app data.

Live Premium-hidden verification subsequently passed after rebooting the overloaded emulator, stopping the idle Gradle daemon, rebuilding/installing com.lekhpal.qa with -PreactNativeDevServerPort=8082, and restarting clean-cache Metro on 8082. Drawer has no Premium entry/crown; GPS opens unlocked with map tiles; Saved Work and Calculator load unlocked. Proof: outputs/premium-hidden-drawer-verified.png and outputs/premium-hidden-gps-verified.png. Premium flag remains false; no Premium code deleted. Android version preparation now 1.1.0 (4), matching APP_INFO fallback. Release AAB and Play upload still pending remaining validation.

## Internal release complete — 1 October 2026, 15:46 IST

Published version **1.1.0 (4)** to Lekhpal's existing internal-testing track only. Play Console explicitly shows “Available to internal testers” and “Latest release: 1.1.0 (4) - Internal feature testing”. Production remains untouched. User explicitly requested this upload after app checks. Release details: https://play.google.com/console/u/0/developers/6895537810041531610/app/4975438064524736783/tracks/4701546452160054317/releases/3/details . Tester link remains https://play.google.com/apps/internaltest/4701546452160054317 . Play advised availability can take about an hour or occasionally longer.

Signed artifact: outputs/releases/1.1.0-4/lekhpal-1.1.0-4-internal.aab; SHA-256 6698f1829048df45be8a5255897ff69cddbc4d55b3306205d15b80d67a101b69. Read outputs/releases/1.1.0-4/VALIDATION.txt for exact checks/limits. Release-mode .qa copy preserves QA account/data and has bundled JS, with Premium hidden, About version/build confirmed and Google test banner visible. Emulator screenshots: outputs/release-v4-drawer.png, outputs/release-v4-home-ad.png. Play proof: outputs/lekhpal-v4-internal-published.png.

The release includes -PinternalTestAds (Google sample app ID) with sample unit IDs; production AdMob values retained for a later authorized rollout. Premium UI/locks/code remain hidden, not deleted; restore only on explicit user request. No Supabase changes, purchase, paid billing, production rollout or other app changes in this release task. The Play-installed com.lekhpal was preserved; it still needs the Play update to receive v4. A debug-only native crash under emulator memory pressure was observed earlier; release-mode startup/navigation passed afterward, without claiming a source-level native-crash fix.
