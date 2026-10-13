# FastWork state rollout · 11 October 2026

The user's request on 11 October supersedes the earlier five-region / UP-only rollout scope. UP remains the startup default for existing users. The state picker now offers the 19 states present in the reference app, with 18 non-UP catalogs and 144 distinct reference menu actions.

## Implementation

- `Main2Activity.java` in `/Users/sneha/Work/Apps/LekhpalFastWorkCode/sources/com/lekhapal5441/app/FrontActivity/` selects a developer-hosted menu for each non-UP state. Its `LITE.processHTML` bridge opens the selected service in `Web_main`. These are state-specific portal destinations, not copies of UP feeding.
- `docs/reference/fastwork-state-menus.json` records every menu, source label, original destination and implemented service ID/destination. The public menu sources were retrieved on 11 October 2026. No private API key or developer subscription service was reused.
- `src/config/states/reference.json` bundles these catalogs locally with bilingual app labels, blue app cards and distinct service identities. Existing MP, BR and RJ services/IDs are retained alongside the reference services. Ten Tamil Nadu entries intentionally share the official e-Services entry, as in FastWork; descriptions tell users to choose the relevant option there. The Haryana rural and urban entries also share the reference entry; an independent urban deep link has not been verified.
- A new `smart-work-selected-state-v2` preference requires an explicit state choice. Legacy saved choices and state data are retained. No old non-UP choice is silently activated by enabling the feature. Login continues to the default UP dashboard unless the user has explicitly selected another state.
- Record load/save/delete/organisation operations capture their originating state. Late results cannot replace records after switching state. State changes remount the desk/tool screens and clear pending record selections. Census presets/journals have a separate key for non-UP states; UP's original key is preserved. Clearing portal history no longer removes the active state preference.
- UP's original catalog, forms, portal presentation, Khasra Custom Tab, directories and navigation remain unchanged.

## Reference menu coverage

| State | Reference menu actions |
|---|---:|
| AP | 2 |
| AS | 6 |
| BR | 18 |
| CG | 18 |
| GA | 8 |
| GJ | 6 |
| HP | 4 |
| HR | 6 |
| JH | 6 |
| MH | 6 |
| MN | 6 |
| MP | 8 |
| OD | 6 |
| PB | 12 |
| RJ | 6 |
| TN | 10 |
| TR | 10 |
| UK | 6 |

## Verified URL corrections and narrow exceptions

Three old Bihar `parimarjan.bihar.gov.in/biharBhumireport/` links returned 404. The [official Bihar Bhumi homepage](https://biharbhumi.bihar.gov.in/Biharbhumi/) supplies current Jamabandi, mutation-status and LPC-status links under `emutation.bihar.gov.in`, with `.aspx` extensions. The corrected Jamabandi entry was opened in the Lekhpal emulator; district/anchal fields render inside the app.

The configuration still requires HTTPS, no embedded credentials and no custom port. Exactly two non-gov hosts are additionally accepted:

- `hsac.org.in`: [HARSAC's own site](https://hsac.org.in/) identifies its Government of Haryana role and links to EODB Land GIS.
- `online.eregistrationukgov.in`: Uttarakhand's registration service uses this domain family; the [Department of Land Resources/NIC state directory](https://ngdrs.gov.in/NGDRS_Website/state_ut_links.php) links the registration system, and an [official Uttarakhand registration department letter](https://investuttarakhand.uk.gov.in/themes/new_investuk/img/mandate_doc/stamp.pdf) confirms it. No wildcard non-government domain is allowed.

The Manipur notification entry uses HTTPS on `manipurrev.nic.in`; its reference map entry is a map-digitisation status report and is labelled accordingly. Whitespace in Himachal's department URL was removed.

## Maharashtra e-Chawadi

A separate Maharashtra screen starts at the official home/login page, with the three official reference routes available in Work settings: demand generation, Form 8B, and receive-money. Work settings use a full-screen panel; the official page gets the available phone area.

- Demand preparation uses a labelled amount column, row-scoped checkboxes, a user-entered minimum and ending page. Selection is idempotent. It waits for the displayed selection before advancing and stops on a village/document/page mismatch or timeout.
- Form 8B collection can traverse the requested pages and export an escaped, printable copy of the displayed table. It does not fabricate an official certificate.
- Receipt work accepts an account list and provides current/next account searches. Account details, payment method and final save remain on the official page.
- Unlike the reference's blind positional clicks, this implementation does not automatically submit demand or payment batches. Authenticated production table/control compatibility, automatic payment completion, and exact official print-layout parity remain unverified/incomplete. This rollout must not be described as full e-Chawadi automation parity.

The reference `FastMalgujari/MalgujariActivity.java` only sets up sample autocomplete suggestions and layout; it contains no implemented portal load or actual Malgujari workflow to port. The Bihar land-revenue portal menu is included.

## Verification and limits

Public menus and destinations were inspected. Government services may be unavailable, redirect, require CAPTCHA/login, or change independently of the app. Source review is not authenticated workflow verification. Several reference URLs timed out, returned errors, or redirected repeatedly during checks; these entries remain available with the standard portal error/retry screen. No user credentials, OTPs, government submissions or payments were used in QA.

Automated checks cover every reference action, service identity, UP catalog identity, migration, state-bound asynchronous saves, e-Chawadi selection/page guards, receipt parsing, PDF escaping, and the required UP regression suites. QA images are under `outputs/qa/multistate-2026-10-11/`.

The broader FastWork gaps in `FASTWORK_PARITY_STATUS.md` (advanced census variants, other document/template/server-backed features, and authenticated end-to-end verification) are not declared complete by this state-menu rollout.


### Final check record

- Entire Jest suite after the Maharashtra home-entry adjustment: 64 suites / 415 tests passed.
- TypeScript: no errors. ESLint on changed implementation files: no errors, one non-blocking inline-style warning. `git diff --check`: clean.
- Emulator-5556: state picker, Bihar dashboard, corrected Jamabandi form, Maharashtra dashboard and e-Chawadi work settings inspected. The reference's protected demand URL produced an official-site null-data error without login; initial entry was changed to the official root, with Home/Login available in settings. Authenticated e-Chawadi work and the other states' complete workflows remain unverified.
- No command targeted DSA emulator-5554. No authenticated submissions or payments were performed.
