# UP Khasra per-plot automation

Implemented 12 October 2026 following user approval. This extends the existing UP queue and subsection controller. It does not establish authenticated government acceptance or all-state automation.

## Where to use it

Dashboard → Khasra Feeding → enter Fasli year, season, village and six-digit village code. **Import plot data** and **Daily work report** are available before government login and in **Work settings** after opening the feeding browser.

Paste four columns copied from a spreadsheet, or pipe/comma-separated rows:

```text
Gata | Crop | Area_ha | Irrigation
12 | Rice | 0.2000 | Yes
12 | Wheat | 0.3000 | No
13 | Wheat | 0.7000 | Yes
```

Use the exact crop labels offered by the official form for the chosen season. The English labels above are synthetic examples. Hindi labels and Hindi Gata digits are supported. Repeat a Gata for multiple crops or separate irrigation allocations.

1. Save a draft if needed; drafts are separated by village/year/season.
2. Choose **Validate and review**. Correct any reported row in the pasted input and validate again. Any error prevents import; edits invalidate the old review.
3. Add the reviewed plots to the queue. This only saves local work.
4. Sign in to the official feeding browser yourself and open the matching official village/season list.
5. Configure the existing subsection rules or saved presets for land, trees and remarks as applicable. The imported crop rows supply each plot's exact crop areas and irrigation flags. An irrigation method and other mandatory official fields still need appropriate configured values.
6. Enable **Automatically lock and continue to next gata** if final locking is intended. This is a separate explicit option; it is not enabled by importing data.
7. Choose **Start / resume queue** and confirm. Imported queues automatically fill and save their reviewed crop rows and continue through configured sections. A final confirmed lock completes that plot and allows the queue to advance. Stop remains available.

## Validation and recovery

- Maximum 500 plots, ten crop rows per plot, 5,000 rows total and 600,000 input characters. Areas must be positive hectares with at most four decimal places; they are not silently rounded.
- Missing values, malformed rows, invalid irrigation values and duplicate crop/irrigation rows are reported with row numbers. Existing queued Gatas cannot be imported twice.
- Import is blocked while the queue is running or has an unresolved active/opening/uncertain plot.
- Official crop options, Gata identity, village/year/season, remaining area and existing crop-table rows are checked before feeding each plot. Offline validation cannot establish these portal facts.
- Each imported plan overrides the shared crop plan for its own Gata. It does not reuse the preceding plot's crop values or apply the small-area override to imported values.
- Existing official rows are reconciled against the intended plan. Conflicting, unlabelled or ambiguous rows stop automation rather than being deleted. The plan must exactly account for the official available crop area.
- Pending submissions and confirmed receipts are persisted before progression. A missing confirmation, context mismatch, storage failure or actual document reload stops the run. Restarted active work becomes uncertain and requires review/reconciliation.
- Android WebView history/hash changes are distinguished from actual document loads; moving between official SPA sections no longer stops a valid run merely because Android emits a loading event.
- Login, CAPTCHA and OTP remain user actions. Other subsections still need their reviewed rules/presets; this upgrade does not invent land classifications, tree counts or remarks.

## Daily report

Reports combine the current queue and successfully archived queues for this village/year/season. Filter by local date, Gata/crop/reason, and status. Archiving happens before clearing, so a failed archive preserves the current queue.

**Confirmed** requires a recorded successful final lock. **Skipped** means explicitly skipped. **Needs review** includes interrupted/uncertain work and manual local completion without a lock receipt. **Pending** means queued. A successful crop save alone is not reported as a fully completed Gata.

UTF-8 CSV saves to Android Downloads/Lekhpal with spreadsheet-formula escaping. Bilingual A4 PDF supports sharing and Downloads export, repeating headers, plan details, reasons, timestamps and confirmation IDs. Large reports split into parts of at most 30 plots and below the native HTML size limit. These are local activity reports, not government certificates.

## Verification

- Full Jest suite: **564 tests passed across 77 suites**, including the approved Bhulekh regressions. TypeScript passed; targeted ESLint has no errors (six inline-style warnings in the new modal).
- Android debug build and native PDF/CSV instrumentation passed. Real UI import, invalid precision rejection, persistence across app restart, CSV export and PDF export were checked on emulator-5556.
- A bilingual 30-plot Android PDF was rendered and both pages visually inspected; the two-plot UI report was also rendered and inspected.
- Emulator feeding completed two plots automatically on a network-isolated synthetic form: Gata 12 saved Rice 0.2000 irrigated and Wheat 0.3000 unirrigated; Gata 13 saved Wheat 0.7000 irrigated. The configured remarks, final locks and list return also ran automatically. Three crop saves and two locks occurred, with no duplicate crop saves. The report showed two confirmed plots and exported their confirmation IDs. This test form cannot submit government records. The separate DSA emulator is not targeted.
- Government-account acceptance of the current live portal and additional states remains pending. See the evidence record in `outputs/qa/khasra-bulk-2026-10-12/` for final emulator results.

The emulator's host process crashed during QA. It was restored as a read-only test instance using software graphics; the temporary emulator session had to be signed into again. Gboard's handwriting mode was disabled on emulator-5556 to restore the normal bottom keyboard. No authentication bypass or credential storage was added.
