# About screen

Updated 29 September 2026. The active drawer route `DeskAboutScreen` now renders `AboutScreen`, so there is one About implementation.

- Developer: Sneha Shankhwar; developer card opens the supplied LinkedIn URL.
- Email: creativesoftwares96@gmail.com. Android AppDetails module opens Gmail's compose screen using SENDTO, falling back to another installed email handler. No email is sent automatically.
- Phone: 9286642290. Tapping opens tel:+919286642290 in the dialer.
- Company and final “Made with ♥ by Creative Softwares” footer open https://creative-softwares-sandy.vercel.app/. This URL was inferred from the user's open company page and remains changeable in developerInfo.ts; an optional confirmation was asked.
- Android version name/build/package come from BuildConfig via AppDetails, not hard-coded screen text. Current Android configuration is 1.0 / 2. iOS retains configured 1.0 / 1 fallback; an iOS native metadata bridge has not been added.
- Light/dark themes, Hindi/English copy, link accessibility labels, wrapping contact text, share-app and Play Store actions are included. Existing independent-app description is retained.

Validation: Android assembleDebug passed, debug APK installed with data retained and app launched on Pixel_7a. TypeScript and targeted ESLint passed. 12 About/action/utility/Khasra browser tests plus 43 approved Bhulekh regression tests passed. Native visual/contact-app end-to-end QA remains pending; automated link tests do not send email or make a phone call. No Play release was published.

Presentation correction: user requested no hero and fewer cards. Removed all boxed sections and the large centered hero; replaced them with a compact app identity, plain developer/contact rows, thin separators, text actions and version details. Contact actions and the heart footer are unchanged. About and Premium now use the same simpler layout approach.

Expanded About copy in both Hindi and English to explain the app's purpose, official service access, land measurement tools, revenue calculators, saving/sharing results, and the difference between basic and Premium features. Retained the plain layout and contact links. TypeScript and targeted ESLint passed for this copy update.
