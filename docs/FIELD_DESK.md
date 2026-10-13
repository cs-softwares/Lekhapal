# State-based Lekhpal workspace

The app opens a state selection screen after login or guest entry. All 28 states and 8 union territories are selectable. Returning sessions resume their saved state; the drawer includes Change state. The landing screen lists official websites, with search and service categories. Each site opens in a separate in-app browser with history controls, refresh, loading/error feedback, and a return action.

The drawer uses a native modal with a restrained fade, light backdrop, explicit close button and Android Back dismissal. Presses use opacity feedback. The old dashboard hero and seeded officer/applicant/landowner records are no longer presented. New workspaces start empty. Legacy sample cleanup preserves user-created records and archives the prior stored workspace before migration.

Profile details and saved tool records use state-specific storage keys. Measurement and calculator tabs remain available. Standard area units are used across states; explicitly labeled UP units only appear for UP. Measurements and estimates are local aids; official records and government decisions remain on the respective department websites.

## Official directory sources

- [Department of Land Resources: citizen services and state land-record links](https://dolr.gov.in/en/citizen-centric-services/)
- [DILRMP: state RoR and cadastral-map directory](https://dilrmp.gov.in/dilrmpold/State-RoR-Web)
- [NGDRS: state/UT registration websites](https://ngdrs.gov.in/NGDRS_Website/state_ut_links.php)
- [DARPG NeSDA September 2024 report: unified service portals, page 11](https://cdnbbsr.s3waas.gov.in/s3ac1ad983e08ad3304a97e147f522747e/uploads/2019/09/20250109302612975.pdf)
- [Kapurthala district: revenue administration and Patwari duties](https://kapurthala.gov.in/administration-roles/)
- [Lakshadweep Revenue Department](https://lakshadweep.gov.in/department-of-revenue/)

The directory groups land records, survey/maps, registration, certificates and revenue services. It links to department sites where no direct public land-record service was verified. Service availability and officer access differ by state. It does not invent a uniform nationwide mutation approval or relief policy.

## Verification

```sh
npx tsc --noEmit
npx eslint src __tests__ --quiet
npm test -- --runInBand
node scripts/audit-state-portals.cjs
python3 scripts/check-state-workspace.py
cd android
./gradlew assembleRelease --console=plain
```

Metro uses port 8082. Emulator checks use `emulator-5554` and an existing app session, and change the selected state without clearing app data. Release output: `android/app/build/outputs/apk/release/app-release.apk`.

Automated coverage includes all 36 state directories and portal routing, state persistence and failed saves, state-isolated records, removal of seeded names without removing user-created records, and existing local storage/domain checks.

The September 22, 2026 HTTP audit checked 155 distinct portal URLs: 115 returned successful responses; 40 could not be verified because of connection, TLS or timeout failures from the test environment. See `portal-health-check.json` for per-URL results and timestamp. An HTTP response is not proof of a successful authenticated transaction. Government credentials, CAPTCHA, uploads, payments and department-only workflows require separate testing with authorized accounts. The app does not bypass those requirements or government site restrictions. iOS has not been device-tested in this pass.

Validation result: 23 tests passed; TypeScript, ESLint and `git diff --check` passed; signed Android release assembled successfully. Development-build emulator checks passed for drawer close/Back/backdrop, state changes, opening the portal browser and returning to the workspace. Installing the signed release over the existing debug build was blocked by Android signature mismatch; the existing installation and its data were preserved.

Additional emulator checks passed: guest entry opens state selection, state search selects Uttar Pradesh, and the selected state survives an app restart.
