# Approved Bhulekh screens

Approved by the user on 28 September 2026, after removing the website masthead from all four services. The user explicitly asked to keep this behavior for subsequent work.

## Appearance

The Lekhpal blue title/back toolbar remains. The website's common masthead above Janpad/form content is hidden, including the Modi/Yogi photos and captions and the Bhulekh/Revenue Council branding. The remaining form is the original official website, with its original inputs, buttons, CAPTCHA, instructions and validation. Certified login instructions and OTP limits remain visible.

This is a deliberate, narrow presentation exception to official-site parity. Do not reinstate the old custom record cards, renamed form labels, native location picker, or large website masthead.

## Navigation

| Service | Initial official page | Page after location selection |
| --- | --- | --- |
| Khatauni Copy | `#/selection` | `#/khatauni_rtk` |
| Certified Khatauni Copy | `#/index-login` | Authentication required |
| Plot Sale Status | `#/selection` | `#/gata_wise` |
| Plot Dispute Status | `#/selection` | `#/vaad_grasht` |

The shared browser stays mounted. Service selection uses the official homepage button, preserving its workflow state. Request-specific readiness prevents the previous page or homepage from flashing. The same protection applies to Districts, Tehsils, Parganas, Land Types and Government Land. There is no app loading-text banner or fixed launch delay; website download/API delays remain possible.

## Code and checks

- `src/utils/upPortalPresentation.ts`: persistent masthead hiding, injected on document load and reapplied on hash navigation.
- `src/utils/bhulekhSession.ts`: retained browser, correct official launch, matching-page readiness.
- `src/screens/WebViewPortalScreen.tsx`: native toolbar and previous-page visibility protection.
- `src/navigation/upEntryNavigation.ts`: official browser entry points, without custom record-screen redirects.
- `src/screens/BhulekhOptionsScreen.tsx`: shared browser and retained menu state.

Run:

```sh
npm test -- --runInBand __tests__/ServicePresentation.test.ts __tests__/BhulekhServiceLaunch.test.ts __tests__/BhulekhSession.test.ts __tests__/BhulekhPreload.test.tsx __tests__/WebViewPortalScreen.test.tsx __tests__/NationalWorkspace.test.ts
npx tsc --noEmit
```

The presentation regression covers initial document readiness, reinjection and switching between service routes. Other tests protect exact service selection, original forms, browser reuse, absence of loading banners, and rejection of obsolete readiness messages.

Live verification records are in `qa/services-2026-09-28/header-removal-verification.json` and `qa/services-2026-09-28/official-service-verification.json`. All four form snapshots matched the official forms after header hiding. Verification covered public location selection and search/login forms; no OTP, CAPTCHA, authentication or payment submission was performed.

Preserve this approved baseline for unrelated fixes. Update it only when the user explicitly changes the desired behavior or when a fix restores that behavior. External site changes may require maintenance; this document is a project-level record, not a guarantee that the government website will never change.
