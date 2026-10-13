# Services audit — 25 September 2026

Test environment: Pixel 7a Android emulator, Android 15, development build. Website width: about 411 CSS pixels.

## Changes

- Removed the fixed 2.8-second wait after startup state/session hydration.
- Services menus and portal routes open without a stack transition animation. Search/category changes reset the list position.
- Added visible certified-service loading feedback and begin official service navigation during document loading.
- Fixed portal URL/history state when the same screen is reused. Android Back clears an error before returning to a previous page.
- Enabled hardware rendering for UP Bhu Naksha.
- Corrected mobile layouts in RevenueSoft, IGRS, Revenue Court, Department Services, SVAMITVA, and both Bhulekh login pages. Adjusted related Voter Services and India.gov.in presentation.
- Location Back walks through village/tehsil/district using the official previous-location control. The homepage Back action is separate.
- Bounded location updates so ongoing webpage animation cannot indefinitely defer them. Guarded early presentation injection when the document does not yet exist.

## Verification and limits

- All 18 direct UP Services links were opened in the Android app. Each returned to Services using Android Back in the baseline pass. See `baseline.json`.
- Khasra Login opened the official browser login choices; its toolbar arrow returned to the app. Khasra Dekhein opened the native mobile search screen, and Android Back returned to its menu. Chrome's website history can consume hardware Back; the toolbar arrow closes the browser.
- Bhulekh Copy, Certified Copy, Sale Status, Dispute Status and both login entries opened in the emulator. Certified Copy reached its official OTP/captcha screen without sending an OTP.
- All five Bhulekh directory URLs rendered at phone width in the isolated browser. All five directory entries, including the Government Land user login, also loaded at 411px in the emulator, and Back returned to the menu. Android accessibility snapshots were unreliable on these pages, so the final checks used observed positions, DOM measurements and screenshots. The first Government Land tap missed its card; a subsequent direct check opened the login correctly. Some automated Back flags were false because UIAutomator returned a stale or null snapshot; subsequent screenshots confirmed the menu/Services return. Screenshots taken immediately after a key event can still show the outgoing page.
- All 34 distinct configured URLs returned HTTP 200 during the HTTP check. This does not establish that every website function works.
- Additional mobile-browser checks covered all nested/related URLs. DILRMP did not produce usable body content during the timed check. IGRS and Revenue Court emitted errors from their own website scripts. India.gov.in retained a 16-pixel document overflow associated with its site layout; the cookie controls and visible header fit after the adjustment. Intentional map sidebars, carousels and scrolling notices were not counted as clipping.
- Corrected RevenueSoft, IGRS, Department, SVAMITVA, Revenue Court and Bhulekh login layouts were measured at 411px document/viewport width after fixes. Before the fixes, RevenueSoft was 960px wide, IGRS 554px, and Real-time Khatauni 1024px.
- Live location Back check: selecting Amroha reached `Search Tehsil...`; Android Back returned to `Search District...` on the same official selection route. See `location-back.json`.
- Full automated suite: 24 suites, 134 tests passed. TypeScript passed. Targeted ESLint: no errors, one existing inline-style warning.
- Fixed the emulator's development-server connection: changed the debug host from the default `10.0.2.2:8082` to `127.0.0.1:8082` with `adb reverse`. Cold Android activity launch improved from 11.35 seconds to 1.59 seconds in the observed runs. The app process then remained connected through the live location Back check. This is a debug emulator measurement, not a release-build or website-load guarantee.

No officer credentials, OTP, captcha, payment or submission was used. Login-only workflows and every downstream government form remain outside the completed checks. Official response times depend on network/server conditions: observed complete page loads ranged from under a second to about 16 seconds, with some background resources taking longer.

## Evidence

- `baseline.json`: 18 direct links, DOM measurements and Android Back results.
- `layout-recheck.json`: first emulator layout recheck; later fixes are reflected in `browser-audit.json`.
- `browser-baseline.json`, `browser-audit.json`: isolated phone-width checks and final targeted checks. Entries with `text` absent were not considered usable.
- PNG files: representative corrected mobile layouts. These are verification captures, not mockups.
