# Current local Premium implementation — 30 September 2026

This checkpoint supersedes older notes about guest entry, only two paid features, and pending monthly testing. No new Play upload or publication is authorized. Existing version 3 draft uploaded earlier remains unpublished; do not advance it.

## Included in both prepaid plans

₹199 / 1 month and ₹499 / 3 months, no auto-renewal; live Play prices remain authoritative.

- GPS boundary capture and editing; free users see locks and an upgrade entry.
- Editable PDF report title, owner, village, plot, client and notes; bilingual field labels and coordinate-based boundary diagram for saved GPS points. This is a boundary outline, not an official cadastral map or paid map service.
- Saved-note metadata editing and grouping by village, plot or client. Search and existing record viewing remain free, including after expiry. Notes remain on-device with the existing 12-per-tool retention limit; no cloud sync or unlimited storage is promised.
- Advanced calculators: multi-owner shares, valuation/fees, rate comparison, crop loss and demand/recovery. Free users get illustrative samples and upgrade actions; saved results stay readable after expiry. Basic fractions/single-share area, net land-rate checking, area tools, conversions and official portals remain free.
- No in-app ads for active verified Premium. Basic accounts may see a consented banner on Home. ADS_CONFIG stays testMode=true and androidBannerId=null pending the user's production ad-unit ID and consent setup. No live monetization is claimed.

## Account and purchase UI

- Guest/test-mode entry removed; stale guest sessions cannot bypass sign-in. Existing saved work is retained.
- Login/signup password show/hide.
- Verified Premium crown on drawer/profile; expires with the server lease, never derived from editable account metadata.
- Premium/About remain simple sections, without hero cards; Premium copy includes the actual features above.
- Purchase callback recovery checks owned purchases every four seconds while waiting, with a 60-second limit and Restore guidance. It never replays a purchase request. This passed automated tests; a new Play build's immediate unlock still needs live acceptance.

## Password recovery

Login has Forgot password; Settings has Reset password. Supabase sends its standard recovery email. Android and iOS handle the exact app callback. The isolated, non-persistent recovery client validates the returned user before permitting an update and never overwrites the normal login/purchase identity. Password confirmation, show/hide, resend cooldown, expired-link handling and temporary-session cleanup are implemented.

Exact redirect URLs saved in project edzpqmcjsweddavklitb (verified Lekhpal / ACTIVE_HEALTHY):

- com.lekhpal://auth/reset-password
- com.lekhpal.qa://auth/reset-password

The Site URL was not changed. No wildcard redirects were added. Project still uses default SMTP. The dashboard blocks email-template customisation without custom SMTP; the default sender is restricted and is not sufficient for public-user password recovery. SMTP provider details are pending; no new provider account, billing or credential was created. No user's password was changed or recovery email sent by the agent. User must privately test the successful email/update flow after SMTP is configured.

Proof: ../outputs/password-reset-redirects.png and ../outputs/password-reset-expired-link.png.

## Validation and release state

- 35 Jest suites / 195 tests passed after calculator gates and recovery service were added; subsequent saved-work metadata/search changes passed their targeted suites and TypeScript.
- TypeScript passes. Focused ESLint has no errors; style warnings remain.
- Android QA debug build succeeds. Installed separately as com.lekhpal.qa on emulator-5554, preserving Play-installed com.lekhpal and its purchase account. Metro uses port 8082. Native invalid/expired recovery deep link displays the proper retry form. A live Supabase verification request using a deliberately invalid token returned HTTP 303 to the exact QA app callback with otp_expired, confirming the server allowlist works without sending an email or changing a password. The QA app is currently at sign-in; signed-in visual checks need the user to log in.
- iOS deep-link configuration added but not built or tested on a simulator.
- All required Bhulekh regressions and Khasra Custom Tab checks passed in the full suite. No official portal implementation was changed in this feature work.
- Real monthly license test previously passed purchase, server acknowledgement, restart recovery, restore, expiry and expired-restore rejection. Immediate callback completion on old Play version 2 did not pass; local recovery improvements await a Play acceptance build after the user authorizes release work. Quarterly/pending/cancel/refund/account-switch/reinstall scenarios remain pending.
- Checkout remains disabled outside a controlled test session. No payment-readiness or production-readiness claim should be made yet.

## SMTP handoff prepared

User requested completion of email delivery. Prepared (UNSAVED) Lekhpal Supabase SMTP form with sender/username creativesoftwares96@gmail.com, name Lekhpal — Creative Softwares, host smtp.gmail.com, port 465, minimum interval 60 seconds. Password blank; custom SMTP remains OFF server-side until Save. Supabase warns Gmail is intended for personal email and may affect transactional delivery; this is a limited-volume setup, not an unlimited production sender.

Opened Google App Passwords; Google selected the exact company account creativesoftwares96@gmail.com and requires private reauthentication. User must complete verification, create an app password (requires 2-Step Verification), paste it directly into the prepared Supabase Password field and save. Do not request credentials in chat or logs. Browser rules require user handoff for new authentication credentials. Both browser tabs marked for handoff. Screenshot outputs/smtp-ready-for-private-password.png. No email credential created/read/stored by agent. After user saves, verify server setting and a reset email for their real Lekhpal account, then user privately submits their chosen new password. Do not claim SMTP active or reset end-to-end passed before that.

## SMTP saved and first real recovery email requested

User created and privately entered the Google App Password, then saved SMTP. Reloaded Lekhpal's SMTP page and verified custom SMTP is enabled and sender fields persist (smtp.gmail.com, port 465, company Gmail). User explicitly asked the agent to check the reset flow. Corrected the emulator reset email from sneha2095@gmail.com (no such Lekhpal user) to sneha2095.er@gmail.com and submitted one request. Supabase auth.users.recovery_sent_at now records 2026-09-29 20:19:32.946944+00 for the real account, previously null. Inbox receipt/link opening and private new-password submission are still pending; do not call full reset acceptance passed yet. Password/SMTP credential was not copied into source or notes.

## Delivery investigation after user reported no email

Supabase auth_logs for the actual request show /recover, HTTP 200, user_recovery_requested, request completed. The company sender's Gmail search for messages to sneha2095.er@gmail.com finds one outbound "Reset your password" email at 1:49 AM IST on 30 September. A separate search across all folders for recent mailer-daemon/postmaster/delivery-status messages finds no bounce. This confirms an outbound message exists, not recipient inbox delivery. Only the company Gmail account is signed into this browser; recipient mailbox receipt remains unverified. No additional reset message was sent, password changed, or app code modified during this investigation.


## Emulator reset retest — 30 September

Started Pixel_7a after adb showed no running devices. Restored emulator had only com.lekhpal and no Gmail accounts configured. Installed existing separate com.lekhpal.qa debug APK, started Metro on 8082 and verified Forgot password form. Submitted a fresh request for sneha2095.er@gmail.com; Supabase recovery_sent_at is 2026-09-30 10:30:34.437868+00. Gmail onboarding confirmed no account added; opened Google email sign-in for user to complete privately. Delivery, real recovery-link handoff, password update and subsequent sign-in are still pending. No code changes or Play uploads.


## Live recovery link verified on emulator

Confirmed both Google accounts on emulator: shankhwarsneha99@gmail.com is Play tester, sneha2095.er@gmail.com is Lekhpal login/recovery recipient. Gmail search found both earlier reset emails in Spam. Reported latest as not spam; Gmail moved it to Inbox. Earlier link was rejected as invalid/expired on return to app. Requested fresh email at 4:16 PM IST; it arrived in Inbox. Gmail grouped it with earlier message and hid fresh body behind Show quoted text; expanded latest message and tapped its fresh link. Actual email -> browser -> com.lekhpal.qa callback -> server-verified new-password form succeeded. Evidence: outputs/password-reset-verified-account.png. User must privately enter/confirm/save new password, then verify login; full end-to-end acceptance remains pending these steps. No app code changes or Play upload during delivery diagnosis.
