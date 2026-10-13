# ERO PDF workflow — 12 October 2026

Implemented for the Android Lekhpal app. Open **Services → ERO PDFs → Work settings** (also available in the dashboard's existing Approvals and other work section).

## Reference behavior and scope

Reference files under `/Users/sneha/Work/Apps/LekhpalFastWorkCode/sources/`:

- `com/lekhapal5441/app/FastERO/FastEroPDFActivity.java`: official ERO browser, saved serial, Start/Stop, PDF saving.
- `com/lekhapal5441/app/FastERO/d.java`: list eye controls, five-row pagination, detail download.
- `p026ba/o.java`, cases 10/11: fourth-button PDF action, serial increment, back to list.
- `p016b/d.java`, ERO case: `suomotoDSE` and `checklist-processing-action` routes.
- `com/lekhapal5441/app/FastAgriCensus/AgriStak/e.java`, ERO case: data PDF and authenticated URL downloads.

The reference saves an official generated **Format A PDF**, selecting the first elector's download on each checklist row. It does not contain an ERO PDF template library. This implementation follows that scope; it does not silently download every elector in a cluster or create replacement government forms. Range serials in Lekhpal start at **1**; the reference's internal index starts at 0.

The public ECI frontend was inspected without authentication. Its current sign-in redirects from `officials.eci.gov.in/login` to `ecinet.eci.gov.in`; both navigation origins are supported. Automation and native PDF messages remain restricted to `officials.eci.gov.in`. Current ERO detail paths include `/suomotoDSE/checklist-processing-action/…` and `checklist-processing-action-india/…`. Record detection precedes list detection. Current labels are `Download Format A`, and pagination exposes `.control-btn2` / `.active-page`. Official filenames carry DSE/cluster/state/AC/part/EPIC metadata; these are retained when supplied by the page, with a serial and unique suffix.

## Implemented

- Official sign-in in the app, full-width browser, native blue toolbar, Android Back, phone-sized settings and PDF library.
- Explicit From/Through range (up to 500 records), sequential observed pagination, first Format A download for each selected list row, return and next-row progression.
- Automatic capture of data PDFs, blob PDFs and same-origin HTTPS download responses. The official page performs authenticated API calls; the app does not reproduce private APIs or copy credentials.
- Native PDF header, size and page-renderer validation; atomic saving in private app storage. Progress advances only after the file and progress journal are saved.
- Stop, background/touch interruption, paused restart and explicit Resume from the same list/filter context. Stale controls, changed filters, ambiguous serials, failed downloads and timeouts stop the batch.
- Saved PDF library, Android print preview, share chooser and scoped Downloads/Lekhpal export. FileProvider exposes only the ERO PDF directory in addition to existing document paths.
- Official generated PDF bytes are preserved. No rewriting of contents, signatures, language or page layout.
- No subscriptions, premium changes or changes to approved Bhulekh/Khasra flows.

## Verification

- Full Jest suite: **501 tests / 73 suites passed**, including 29 ERO tests and all approved Bhulekh regression suites.
- TypeScript and targeted ESLint passed.
- Android debug app and native test runner built. Only `emulator-5556` / `com.lekhpal` was used; Metro remains on port 8082.
- Public ECINet login rendered at 412 CSS pixels with no horizontal overflow; user ID and CAPTCHA fields fit the phone.
- A local intercepted HTML fixture ran the real browser → JavaScript bridge → React controller → native PDF saver path. Its exact action sequence was `open-5, download-5, back, next, open-6, download-6`. Record 5 used a data URL, record 6 a blob URL. Both completed and appeared in Saved PDFs.
- The test caught and fixed duplicate SPA reinjection invalidating an unchanged page revision. A regression test protects this.
- Print preview rendered the sample correctly. Downloads export and the share chooser were checked using synthetic PDFs only. Eight native checks passed for PDF integrity, corrupt-file cleanup, duplicate protection, path restrictions and content-provider access. A further emulator check confirmed the completed batch journal, both downloaded SHA-256 hashes and the UI-exported Downloads copy; all matched the synthetic source. Its test data was then removed.

Evidence: `outputs/qa/ero-pdf-2026-10-12/`. Sample files are explicitly marked synthetic and are not government document templates. QA records are removed from the emulator after verification.

## Acceptance still needed

The implementation and local tests are complete for the reference ERO workflow. An authorized user must still log in, open their real Suo Moto DSE list, and verify a short range against actual records and permissions. No OTP/CAPTCHA was submitted and no authenticated government records were accessed during development. Unrecognized future portal layouts stop for review. The current batch intentionally downloads the first elector's Format A per row, as the reference does.

Order/application templates and community/voice are separate outstanding work; this ERO completion does not claim full FastWork parity.
