# Lekhpal project instructions

## User-approved Bhulekh baseline

The user approved the current Khatauni/Bhulekh screens on 28 September 2026 and explicitly asked that future fixes preserve them. Read [the approved baseline](docs/approved-bhulekh-baseline.md) before changing shared portal, navigation, loading, or presentation code.

Preserve this behavior during unrelated work. Change it only for an explicit user request or to restore the approved behavior after a regression. Later explicit user instructions take precedence.

- Keep the original official forms for Khatauni Copy, Certified Khatauni Copy, Plot Sale Status, and Plot Dispute Status. Do not restore custom native selectors or rewritten record forms.
- Hide the shared website masthead above Janpad/form content, including Modi/Yogi photos, names/titles, logo and branding text. Keep the Lekhpal title/back toolbar and all functional form labels/instructions.
- Keep the correct distinct service flows. Copy/Sale/Dispute share the official location selector but lead to different forms; Certified Copy opens its OTP/CAPTCHA login.
- Reuse the loaded Bhulekh browser. Never flash the previous service/homepage while switching services or directories. Reveal only the requested page, with request-specific readiness.
- Do not add a loading-text banner, fixed waiting period, or artificial launch delay. Normal official-site/network loading is acceptable.
- Preserve directory navigation and the approved Corrections presentation when working on other features.

Run the regression checks listed in the baseline when relevant shared code changes. Do not weaken them merely to accommodate an unrelated change. Earlier QA notes showing the website masthead or custom forms are historical and do not override this latest approved baseline.

## Khasra login browser compatibility

The official eKhasra site rejects embedded Android WebViews with “Unsupported Browser”. Keep Khasra Login in `openPortalBrowser` (the supported Custom Tab with blue toolbar and back arrow), including during header styling changes. Khasra Dekhein continues to use the existing native search screen. The browser toolbar cannot exactly reproduce the app toolbar. Do not route login to `WebViewPortal` just to match the header.
