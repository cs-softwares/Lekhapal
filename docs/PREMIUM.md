# Lekhpal premium implementation

Status on 29 September 2026 (follow-up audit): live Supabase project edzpqmcjsweddavklitb is confirmed as Lekhpal. Premium Edge Function version 2 is ACTIVE; protected tables and the minute scheduler were independently checked. Both Google Play base plans are now saved and activated: prepaid-month, INR 199.00 / 1 month; prepaid-quarter, INR 499.00 / 3 months. Both are prepaid, India-only, without automatic renewal. Checkout remains disabled in Supabase pending license-test validation. Pixel_7a emulator is running and the local debug app was updated and launched successfully. A Play-installed internal build and signed-in license tester are still required for the release acceptance tests; no purchase has been completed.

## Existing app audit

Before this work, `react-native-iap` was installed but had no purchase integration. `PremiumScreen` contained mock plans. Signing in incorrectly labelled an account premium, without a purchase or expiry. Supabase email/password and OTP authentication existed, but purchase verification did not.

| Access | Features already present |
| --- | --- |
| Free | Government portal navigation, official Bhulekh forms, Khasra search/login, basic calculators and area conversion, manual measurements, saved-record viewing, text/image sharing |
| Premium | New GPS boundary capture/editing through corners or walking; PDF report export from existing measurement/calculation workflows |

Viewing a saved GPS boundary remains free. GPS location lookup remains free. Existing records are not deleted at expiry. No AI, autofill, KMZ/4K export, bulk government feeding, automatic eDistrict matching or premium community is advertised: these were not verified as implemented. Legacy record-workspace crop/diary forms are not the basis of the paid offer because they are not exposed through the current active navigation.

## Plans and Play Console

Use one subscription product, `lekhpal_premium`, with two **prepaid**, non-renewing base plans. Suggested IDs are `prepaid-month` (one month) and `prepaid-quarter` (three months). Both unlock the same features. The owner approved ₹199 for one month and ₹499 for three months on 29 September 2026, along with acceptance of the Google Play API terms. Confirm no product-ID conflict in the app's Subscriptions page before creation.

Configure only `com.lekhpal` in Play Console. Add the product's localized title/benefits, prepaid base plans, supported regions and selected prices. Do not choose auto-renewing plans. Use Play license testers and an internal-test build for end-to-end tests. No real customer payment is necessary for license testing.

The app reads formatted prices, billing periods and offer tokens from Google Play. Prices are never used to calculate expiry. A base plan's duration cannot be edited after creation: to change duration, create a new prepaid base plan, activate it and retire the old one. Existing purchases keep their purchased validity. The client accepts eligible prepaid offers dynamically, so duration changes do not require hard-coded UI edits.

## Backend and free-service constraint

Supabase project: `edzpqmcjsweddavklitb` (Lekhpal, Free organization).

Google project: `lekhpal-play-verification` (created for the Play API only). No billing account or paid hosting was enabled. The Android Publisher API is enabled; this was confirmed in the API library. Firebase, Cloud Run, Cloud Functions and Pub/Sub are not used.

Supabase hosts the database, authentication, Edge Function and scheduled reconciliation. Free-tier quotas still apply. A once-per-minute scheduler uses approximately 43,200–44,640 function invocations per month before user traffic. Google Play's sales fees are separate from backend hosting costs.

Create a dedicated Google service account for this app's verification. No Google Cloud project IAM role is needed for app purchase access. In Play Console, scope its permissions to Lekhpal and the purchase/order permissions required by the Developer API; do not grant release/admin access or access to other apps. Keep the service-account JSON only in Supabase Edge Function secrets as `PLAY_SERVICE_ACCOUNT_JSON`, never in app code or Git.

The function additionally needs `PREMIUM_CRON_SECRET`; the same value must be stored in Supabase Vault as `premium_cron_secret`. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function. No service-role key is sent to the app.

Deploy the checked-in migration and function with an authenticated Supabase CLI, or apply the same SQL in the project's SQL editor. The migration was applied through the editor, so reconcile CLI migration history before a later `db push`; do not blindly overwrite unrelated migrations. Deploy `premium` using `supabase functions deploy premium --project-ref edzpqmcjsweddavklitb`. The checked-in function config disables gateway JWT verification because the handler explicitly validates user JWTs using `auth.getUser`; catalog is public, and reconciliation requires its separate secret. Then run `supabase/setup-premium-cron.sql` after both secrets exist.

Do not enable sales until configuration and testing succeed. The final switch is `update public.premium_config set enabled = true where id = true`. Setting it false disables new checkout preparation while retaining verification/restore for existing customers.

## Deployment verified on 29 September 2026

- Supabase organization is Free. Function `premium` version 1 is ACTIVE, deployed from the existing local `index.ts`, `purchase.ts` and `deno.json`; gateway JWT verification is disabled as designed and the handler validates protected actions itself.
- `PLAY_SERVICE_ACCOUNT_JSON` and `PREMIUM_CRON_SECRET` are configured. The cron secret also exists in Vault. No secret values belong in this document.
- Verifier: `lekhpal-play-verifier@lekhpal-play-verification.iam.gserviceaccount.com`. User approved credential creation and storage. It has no Cloud IAM roles and only Lekhpal app-level read/purchase/order permissions in Play Console. OAuth and a read-only voided-purchases API request returned HTTP 200. Full subscription verification and acknowledgement still require a real license-test token.
- `setup-premium-cron.sql` was applied as migration `20260928205417_lekhpal_premium_reconciliation_schedule`. Job `lekhpal-premium-reconcile` is active each minute; an authenticated scheduled HTTP response was 200 with zero purchases checked and zero failures. Original table migration history still needs reconciliation before a future CLI `db push`.
- Premium tables have RLS enabled and no client policies; anon/authenticated have no table privileges. The ownership RPC is executable only by postgres/service_role. There are zero purchase rows.
- Live catalog returns `enabled: false`. Unauthenticated status and invalid cron-secret requests return HTTP 401.
- Release bundle built successfully with versionCode 2 and existing signing configuration. Play Console shows `1.0 (2) - Premium internal test` available to internal testers. Join: https://play.google.com/apps/internaltest/4701546452160054317 . Production was not released.
- Ten focused Jest suites passed all 64 tests again; TypeScript compilation passed. Existing UI/Bhulekh/free feature source was preserved during deployment.
- Play subscription `lekhpal_premium` has its title and benefits saved. No base plans were saved or activated. The monthly draft had India-only availability, Prepaid / 1 month, and exact INR 199.00; bulk pricing initially rounded to 200, which was corrected before the unsuccessful save. Both `prepaid-month` and `monthly199` were rejected with the ID-format validation message, including after a fresh page load. The failed draft was discarded. Do not report either approved plan as available.


## Entitlement lifecycle

1. User signs into Supabase. Login itself grants no paid access.
2. Checkout preparation returns a SHA-256 account identifier derived from the Supabase user ID. The app sends it to Play as the obfuscated account ID.
3. The app sends the purchase token to Supabase. Supabase calls Google's `purchases.subscriptionsv2.get`, checks the account identifier, configured product and prepaid plan, and stores the result atomically. A token cannot be assigned to a different account.
4. Supabase acknowledges completed eligible purchases. The app never consumes a subscription. Pending payments are recorded for later checks and grant no entitlement.
5. Paid expiry comes from Google. Access needs an eligible state, acknowledgement, a future expiry and a verification lease of at most 15 minutes. The app refreshes on startup/foreground and every five active minutes. Its in-memory clock uses elapsed time, preventing clock rollback from extending a lease.
6. Supabase Cron checks due purchases in bounded batches. It detects refunds/revocations even while the app is closed. This is polling, not instant notification: an already-issued client lease may last up to 15 minutes after verification. Under prolonged service failure the lease expires and paid features lock; basic tools remain available.
7. Restart/update/reinstall require fresh server entitlement retrieval; no persisted permanent premium flag is trusted. Offline restarts cannot unlock premium. Use the same Lekhpal account and Google Play account for restore.
8. Restore queries existing Play purchases and re-verifies tokens without launching checkout. If verification fails, the UI tells the user to retry restore rather than pay again. After expiry, buying a new prepaid plan creates a fresh verified entitlement; linked tokens prevent the replaced entitlement from being counted twice.

## Relevant files

- `src/context/AuthSessionContext.tsx`: authenticated identity; sign-in defaults to free.
- `src/context/PremiumContext.tsx`: checkout listeners, pending handling, restore, refresh and account isolation.
- `src/services/playBilling.ts`: Android Play connection and prepaid product selection.
- `src/services/premiumApi.ts`: Supabase function calls.
- `src/domain/premium.ts`, `src/services/premiumAccess.ts`: entitlement validity and shared feature guards.
- `src/screens/PremiumScreen.tsx`: existing plan screen wired to store data and restore.
- `src/utils/workspaceExport.ts`: central PDF access check.
- `src/components/workspaces/GpsLandMeasureWorkspace.tsx`, `src/components/measurement/gpsMapHtml.ts`: native and map-side boundary capture checks.
- `App.tsx`, `src/navigation/RootNavigator.tsx`, `src/types/navigation.ts`, `src/components/drawer/FieldDrawerContent.tsx`: provider and access to the existing premium screen.
- `supabase/functions/premium/`: server verification and Google-state validation.
- `supabase/migrations/202609290001_premium.sql`: protected tables and atomic ownership RPC.
- `supabase/setup-premium-cron.sql`, `supabase/config.toml`: scheduling and deployment configuration.

## Validation and launch checks

TypeScript compilation passed. Ten focused Jest suites passed 64 tests, including all approved Bhulekh regressions, premium ownership/expiry, restore and GPS gating. After pending-token reconciliation was added, both premium suites passed again (10 tests). Deno backend type-check passed. ESLint has no errors; the existing project rule reports `void`-promise warnings. Android `:app:assembleDebug` passed after adding `newArchEnabled=true` in `android/gradle.properties`; Nitro's Gradle script requires this explicit flag to generate the native code used by Play Billing. Live REST reads with the app's public key returned HTTP 401 / PostgreSQL permission-denied code `42501` for both premium tables.

Still required before sales: confirm the signed-in Google account is a license tester, and test on the Play-installed internal-test build. Exercise successful, pending, cancelled and failed payments; duplicate callbacks; account mismatch; expired/revoked purchases; same-account reinstall restore; network loss; and prepaid repurchase/top-up. Confirm the server acknowledges each successful purchase and does not grant access before confirmation. Check free calculators, original Bhulekh forms, Khasra Custom Tab login and saved measurements still work.

Official references: [Play API setup](https://developers.google.com/android-publisher/getting_started), [purchase security](https://developer.android.com/google/play/billing/security), [subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions), [Supabase function scheduling](https://supabase.com/docs/guides/functions/schedule-functions), [Supabase pricing](https://supabase.com/pricing).

## Follow-up audit and plan activation — 29 September 2026

- Supabase connector is callable in this session. get_project confirmed the exact project name/ref and ACTIVE_HEALTHY status. No other Supabase project was modified.
- Live premium function is version 2 (the earlier version-1 note is historical). Its deployed source was inspected for account binding, prepaid validation, server acknowledgement, restore/status and expiry leases.
- RLS remains enabled on both premium tables; anon/authenticated have no direct table grants. Purchase count is zero. premium_config.enabled remains false.
- The three latest scheduler HTTP responses were 200 with checked=0, failed=0; Vault contains the cron secret name. This validates scheduler authentication, not purchase verification against a real Google token.
- Play Console saved and activated prepaid-month at INR 199.00 / 1 month and prepaid-quarter at INR 499.00 / 3 months, India only. The prior ID failure did not recur; its root cause was not established. Bulk pricing rounded to 200/500, so each local price was corrected to 199/499 before saving. Manual extension is allowed; neither plan auto-renews.
- Ten focused Jest suites passed 65 tests, including premium, Bhulekh, GPS and Khasra browser regressions. npx tsc --noEmit passed.
- Pixel_7a uses the Google Play Android 35 image. Installed the existing debug APK with adb install -r (retained app data), started Metro on 8082, reversed that port, and launched com.lekhpal/.MainActivity. Dashboard rendering was verified by screenshot; no ReactNativeJS/AndroidRuntime startup errors were returned. This was a debug smoke test, not a Play purchase acceptance test.
- Pending user input: Google email for license testing and manual Play Store sign-in. Do not request or record passwords. Keep checkout disabled until a controlled test session is ready; restore/verification endpoints remain available. Production launch remains pending the complete acceptance matrix above.

## Premium screen and tester access update — 29 September 2026

- Reworked PremiumScreen with Hindi/English benefit explanations, two approved India plan previews when Play checkout is unavailable, live Play prices when available, prepaid/no-auto-renewal terms, active validity, free-feature explanation, expiry/restore/internet FAQ and disabled checkout states. No paid benefits beyond GPS boundary capture/editing and PDF exports are promised. Previews cannot initiate checkout.
- Three premium Jest suites passed 13 tests; TypeScript passed; ESLint had no errors (four existing-style no-void warnings). Shared Bhulekh/navigation code was unchanged. Metro remains on 8082; this source update is not yet in the Play internal release (still versionCode 2). Native visual QA of the redesigned screen is still pending.
- User supplied their signed-in Google email. Created the one-member Lekhpal Premium Testers email list and saved its selection on Lekhpal's internal track, retaining the existing selected tester list.
- IMPORTANT: license-testing activation is NOT saved. Play Console explicitly warns it affects all apps in the developer account. Asked user for confirmation because of Lekhpal-only scope; response is pending. The confirmation dialog is open. Do not infer approval from the subsequent Premium screen request.
- Checkout remains disabled; no test payment/restore/expiry purchase verification completed. Next: obtain the scope confirmation, save license testing, confirm internal opt-in/install and Lekhpal login, then perform controlled free test transactions.

### Presentation correction — 29 September 2026

User requested fewer cards and no hero. PremiumScreen now has a short plain introduction, unboxed benefit rows, compact plan rows separated by thin dividers, and unboxed free-feature/FAQ sections. Repeated benefits were removed from individual plans; secondary actions are text links. Purchase, restore, prices and expiry behavior are unchanged. TypeScript and all three existing PremiumScreen tests passed; lint has no errors. Source is available through local Metro, not yet published to Play.

### Billing disconnect correction — 29 September 2026

The billing adapter had cached a successful initConnection promise permanently, so subsequent background/foreground reads could reuse a disconnected native service. It now shares initialization only while in flight, rechecks native initialization before operations, and retries read-only queries once on a service-disconnected/connection-closed error. Purchase requests are never automatically replayed and listeners are retained. A narrowly matched development LogBox filter removes the SDK overlay only for the caught available-purchases disconnect; console diagnostics and other errors remain visible. Restore failures still show the retry message and do not grant access. Four billing/Premium suites passed 20 tests; TypeScript and targeted lint passed. Restarted emulator app to load the change. End-to-end license-test payments remain pending the previously requested scope confirmation.

Live follow-up: restarted process 18463 still logged service-disconnected on both the initial purchase read and its single retry. Screenshot /tmp/lekhpal-billing-fixed.png confirmed dashboard without the red LogBox strip. This verifies non-disruptive handling and bounded retry, NOT a restored store connection. The emulator/Play connection and license/internal-install setup remain to be resolved before purchase acceptance testing.

Further emulator diagnosis: Play Store (Finsky) repeatedly logged `com.lekhpal: No account found`; BillingClient logged `In-app billing API version 3 is not supported on this device`, then `Reconnection failed with result: 3`. Package installer is null (local ADB-installed debug build). This points to emulator Play billing/account availability, not a successful purchase-verification path. User reports signing in, but Play's association for this app is not established. Do not assume sideloading alone prevents billing (license testers can use debug builds). Finish tester activation/opt-in and verify Play Store account/setup before further purchase checks.

## License testing saved — 29 September 2026

After the user's explicit instruction to continue the pending approval, saved the selected Lekhpal Premium Testers list in developer-wide License testing. Play Console displayed “Your changes have been saved”; Save changes became disabled. Evidence: outputs/premium-license-testing-saved.png. Other tester lists were not selected.

The running emulator-5554 reports `Accounts: 0` from Android account diagnostics. This corroborates the earlier Play Store `com.lekhpal: No account found` and billing-unavailable logs. Opened Google Play Store for the user to sign in privately with the approved tester account. Browser login is separate from the emulator's Android account. No purchase attempted; checkout remains disabled. Resume billing connection and controlled free test purchases after device sign-in.

## Tester account correction — subsequent follow-up

User clarified that shankhwarsneha99@gmail.com is their existing Play Console tester. Verified it belongs to sneha-development (that list is not selected for license testing). Added this account to the already selected Lekhpal Premium Testers list, preserving sneha2095.er@gmail.com. Saved successfully; selected list now has two users. No other tester lists were enabled. Evidence updated at outputs/premium-license-testing-saved.png.

Emulator Android account diagnostics now show BOTH supplied Google accounts present. The earlier zero-account blocker is resolved. Restarted Lekhpal to reconnect Play Billing. No test purchase has been completed yet.

## Controlled emulator checkout attempt — 30 September 2026

User explicitly approved ADB UI controls. Verified the exact Lekhpal project, temporarily enabled checkout, refreshed the Premium screen and observed live Play prepaid plans at INR 199.00 / 1 month and INR 499.00 / 3 months. Store connection and product lookup now work. Opening monthly checkout returned Google's “The item you were attempting to purchase could not be found.” No payment was made.

Opened the internal-test opt-in link in emulator Chrome using its first Google account, sneha2095.er@gmail.com. The page shows an unaccepted invitation for com.lekhpal (unreviewed). Requested confirmation to accept its explicit email/app-usage sharing consent, with option to use shankhwarsneha99@gmail.com instead. Screenshot: outputs/premium-test-invite.png. Restored premium_config.enabled=false while awaiting approval. Do not report the earlier item error resolved or any purchase/restore acceptance test passed.

### Selected tester verified — 30 September 2026

User selected shankhwarsneha99@gmail.com. Emulator Chrome confirms this account is ALREADY enrolled in com.lekhpal internal testing; no invite acceptance was needed. Screenshot outputs/premium-tester-enrolled.png. Switched Play Store itself from sneha2095.er@gmail.com to shankhwarsneha99@gmail.com; Lekhpal's internal release listing then loaded with Open/Uninstall.

Checkout initially still returned item-not-found. Restarted Lekhpal and fetched fresh offers, then Google Play returned “No internet connection.” Android default Wi-Fi is VALIDATED, while Play Store logs show Cronet net::ERR_CONNECTION_CLOSED (Retryable=true). This is a real Play network error, not evidence of payment success. Restarted Play Store without clearing data and its listing loaded again. Continued one recovered checkout attempt. No app data or device accounts were removed.

### Play installation completed

Following explicit user authorization, replaced backed-up debug app with the internal-test Play build. Verified installer=com.android.vending. Build opens to actual email/password sign-in. Awaiting user's private Lekhpal login before controlled purchase testing. Chosen Play account shankhwarsneha99@gmail.com is enrolled and license-enabled. No source code changes were made. Checkout is disabled; no completed purchase. The existing internal v2 build predates the redesigned local Premium/About screens.

## Monthly free purchase verified — 30 September 2026

User approved final free-test Buy. Google Play displayed Payment successful with Test card, always approves and no charge. The Play-installed v2 app initially stayed busy and no row appeared before restart. Restart recovery then verified the token and Supabase recorded prepaid-month / SUBSCRIPTION_STATE_ACTIVE / acknowledged=true for the existing sneha2095.er@gmail.com Lekhpal account. First observed verification 2026-09-29T19:05:29.354Z, Google expiry 2026-09-29T19:07:56.239Z (accelerated test duration). App displayed Premium active until 30/9/2026 12:37:56 am. Explicit Restore access succeeded with “Premium access restored”; token remained a single purchase row. Evidence outputs/premium-monthly-active.png and outputs/premium-monthly-restored.png.

Immediate callback completion remains a release acceptance issue: initial screen stayed “Please wait” until restart. Do not conflate working recovery with a passing immediate unlock. Source code remains unchanged under user's restriction. Checkout stays disabled outside controlled tests; restore and verification work while disabled.

Monthly expiry acceptance: after Google's expiry, UI changed from Premium active until to Last paid expiry. Explicit Restore access returned No active purchase found for this account. Screenshot outputs/premium-monthly-expired.png. Thus verified purchase acknowledgement, restart recovery, explicit restore, expiry and expired-restore rejection. Immediate callback remained stuck in old internal build v2, which predates current local billing fixes. Next test should use a new internal artifact built from current source without changing user source code; do not claim v2's callback behavior proves current code is defective.


## Latest checkpoint — Premium benefits, calculator locks and password recovery

Read [PREMIUM-FEATURES-2026-09-30.md](PREMIUM-FEATURES-2026-09-30.md) for the current implemented features, tests, emulator package and remaining SMTP/ads/Play acceptance work. User authorized feature changes and prohibited further Play uploads. The earlier instructions to upload a new internal artifact are superseded. Existing version 3 remains only a draft. Password reset callbacks are saved in Lekhpal Supabase; public email delivery still requires SMTP.
