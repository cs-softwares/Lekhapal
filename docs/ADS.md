# Lekhpal AdMob setup — 30 September 2026

## Formats and placements

Only these three formats are implemented; no rewarded or app-open ads:

| Format | Placement | Limits |
| --- | --- | --- |
| Banner | Bottom of the Home dashboard, separated from service links | AdMob Google-optimized refresh; mounted only on the focused, foreground screen |
| Native advanced | End of a nonempty Saved Work list, hidden during searches/loading/errors | One slot, no timer refresh; labelled Advertisement / विज्ञापन; muted video; SDK-managed assets and AdChoices |
| Interstitial | Home tab press directly from Measurement or Calculator after a successfully persisted non-GPS record | Never first session; first 10 minutes of each app process are clear; >=10-minute gap; <=3 in rolling 24 hours on the device, plus AdMob's 3/day per-user cap |

Premium, unknown entitlements, other-account entitlements and previously active Premium awaiting reverification never request ads. Consent readiness is shared across all formats. Opening required privacy choices immediately pauses every format. The Settings screen includes the published privacy-policy link and displays Ad privacy choices when UMP requires it.

Interstitials only show if already preloaded. A skipped opportunity is consumed, never delayed to an ad-load callback. No navigation waiting screen. Reservations persist before showing; a slow storage operation (>500 ms), navigation change, backgrounding, consent change, Premium activation or account switch skips display. Failed/skipped reserved displays may consume a slot, deliberately under-serving. Storage errors suppress full-screen ads. GPS, government services, sign-in and payment are not display triggers. Entering GPS clears any pending work ad.

No account identifiers, plot details, saved records or GPS boundary coordinates are passed as ad-targeting parameters. The Google SDK's own data collection still applies, as described in Google's SDK disclosure.

## Verified AdMob resources

Publisher/app: `ca-app-pub-4794037209316760~2855952918`, Lekhpal Android.

- Existing Home banner: `ca-app-pub-4794037209316760/3318987344`.
- Created Saved Work native: `ca-app-pub-4794037209316760/6500230592`.
- Created Completed Work interstitial: `ca-app-pub-4794037209316760/9759809596`.
- Interstitial console cap verified: **3 impressions/day per user**.
- Banner automatic refresh: **Google optimized** (existing setting retained).
- New units use Google-optimized all-prices floor; no arbitrary minimum eCPM.
- Lekhpal app high-engagement ads: **Off**, to avoid Google's longer-viewing/more-close-steps option.
- No mediation partners, billing services, other-app settings or Play releases changed.

Proof: `outputs/admob-three-units.png`, `outputs/admob-app-readiness.png`.

## Consent and release status

Lekhpal's existing published privacy URL was read from Play Console and verified in Chrome:
https://sites.google.com/view/lekhpal-privacy-policy

Prepared a **Lekhpal-only European consent draft**, with Consent, Do not consent and Manage options. Attached the verified privacy URL. Existing other-app messages are untouched.

**Privacy policy published 1 October 2026** following the user's explicit request to update the existing Lekhpal policy in the Creative Softwares account. Verified the live URL above. The policy now covers accounts/password recovery, local fieldwork and reports, GPS/maps, AdMob and consent choices, notifications, update checks, retention/deletion, external services and the temporary Premium-hidden internal-testing configuration (testing access is not ad-free). Evidence: `outputs/lekhpal-privacy-published-2026-10-01.png`. This supersedes the earlier unpublished section-3 draft. The separate AdMob European consent message remains a draft; its publication approval is still pending.

AdMob app settings currently show **Requires review** and no linked store listing. Play Console shows Lekhpal as Draft / Internal testing. Live monetization is not verified and cannot be represented as active. The user expressly prohibited Play uploads/releases.

`src/config/ads.ts` keeps `testMode: true` pending production consent/app-readiness review. Debug builds and any package other than `com.lekhpal` force Google sample unit IDs even if this flag is later disabled. The debug manifest uses Google's sample app ID, while the production app ID in `app.json` remains Lekhpal's. This permits QA without generating live impressions or depending on an unpublished production consent form.

Before a later authorized public release: publish the approved AdMob consent message and review the already-published privacy policy against the final release configuration; review Play's Contains ads, Advertising ID and Data safety declarations for the Google SDK; link the public listing in AdMob; complete any app-ads.txt verification/app review requested; then deliberately disable the production test-mode gate. Do not upload as part of this task.

## Validation

- 38 suites / 215 tests pass, including ad eligibility, shared consent, privacy pause, native cleanup/late loads/no-fill, interstitial frequency/persistence/storage errors/account/consent/navigation/background protections, and approved Bhulekh regressions.
- TypeScript and targeted ESLint have passed.
- After restoring every visual-QA fixture, TypeScript and all 23 focused ad tests (4 suites) passed again. The test interstitial's close button returned to Home successfully.
- Local QA APK built with `:app:assembleDebug`, `.qa` application ID suffix and Metro 8082; no Play upload.
- Emulator: all three Google sample creatives visually verified: Home banner, Saved Work native, and completed measurement → Home interstitial. Proof: `outputs/admob-banner-test.png`, `outputs/admob-native-test.png`, `outputs/admob-interstitial-test.png`. No live ads clicked and no real impressions intentionally generated.
- A 20 × 30 metre sample measurement (600 m²) was saved in the separate `com.lekhpal.qa` app for these checks; repeated saves were part of QA. Basic-account PDF and organisation locks remained visible.
- Interstitial visual QA temporarily advanced the local session/history clock and accelerated preload polling; all temporary code and diagnostics were restored afterward. Production first-session, ten-minute and rolling daily protections remain intact. The first-session Home return showed no full-screen ad; a later reserved attempt was correctly suppressed by the persistent gap, and an eligible preloaded test ad displayed successfully.
- A production-app-ID run confirmed UMP refuses requests while no consent message is published. A stale Metro bundle and emulator ANR required server/emulator restart; no user app data was erased. Production consent and live monetization remain unverified until the publication/review steps above are completed.

## Official implementation references

- https://docs.page/invertase/react-native-google-mobile-ads/ad-formats/native
- https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent
- https://developers.google.com/admob/android/interstitial
- https://developers.google.com/admob/android/privacy/play-data-disclosure
- https://developers.google.com/admob/android/quick-start

## Internal-test build — 1 October 2026

The user subsequently authorized a Play internal-test upload after loading checks. Version 1.1.0 (4) is built with `-PinternalTestAds`, which explicitly substitutes Google's sample Android app ID in the merged manifest as well as retaining `ADS_CONFIG.testMode=true` for all ad units. This avoids the unpublished production UMP configuration blocking test ads. The production AdMob ID remains the default when this property is absent; app.json and the real ad unit IDs are preserved. Never promote this sample-ad, Premium-hidden artifact to production. AdMob consent publication/app review and live monetization are still outstanding.
