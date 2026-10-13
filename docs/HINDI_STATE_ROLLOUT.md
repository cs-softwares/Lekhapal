> Update, 11 October 2026: the user requested all non-UP states from FastWork. See [the implemented state rollout and remaining limits](FASTWORK_STATE_ROLLOUT.md). Earlier UP-only/five-region gate statements below describe the previous rollout stage. UP remains the default and its approved behavior is preserved.

# Hindi-first state rollout

Updated: 9 October 2026

## Agreed direction

The user accepted bundled JSON configuration, preservation of UP's existing behavior, validation of two additional states, and gradual expansion. The first group is **Uttar Pradesh, Madhya Pradesh, Bihar, Delhi and Rajasthan**. Additional states and remote configuration come later.

MP and Bihar are the initial pilot pair selected for this implementation. Delhi and Rajasthan are prepared in the same configuration format for the following validation round. These priorities replace the earlier suggestion to use Maharashtra or Tamil Nadu as a first pilot. Hindi and English remain the available app languages. Specialized officer workflows and regional unit presets still require service-level decisions and evidence.

## Implemented: bundled configuration foundation

| State | File | Current role | Service entries |
| --- | --- | --- | --- |
| UP | [UP.json](../src/config/states/UP.json) | Protected baseline | Existing 20 entries, unchanged |
| MP | [MP.json](../src/config/states/MP.json) | Pilot | 3 |
| Bihar | [BR.json](../src/config/states/BR.json) | Pilot | 13 |
| Delhi | [DL.json](../src/config/states/DL.json) | Next validation group | 3 |
| Rajasthan | [RJ.json](../src/config/states/RJ.json) | Next validation group | 6 |

The service list and dashboard now resolve these configurations through [the catalog](../src/data/statePortalCatalog.ts). JSON supplies bilingual titles/descriptions, categories, search terms, service URLs, browser mode, review metadata and shortcut order. The remaining state catalogs are retained for later migration.

UP's JSON references the approved catalog instead of copying or rewriting its actions. The complete UP catalog was compared with a pre-change capture and matched exactly. Its six dashboard shortcuts retain the same order. Bhulekh, Khasra and related-link handlers remain intact.

[Configuration validation](../src/config/states/schema.ts) rejects duplicate IDs, missing dashboard references, unknown browser modes, unrecognized fields, malformed/non-government/insecure URLs and accidental UP portal destinations in non-UP configurations. Bundled files are validated when loaded; their validity is a build/test requirement. This is not a remote configuration loader or a remote rollback implementation.

[The service dispatcher](../src/navigation/statePortalNavigation.ts) supports configured WebView or Custom Tab entry and delegates existing UP behavior to its unchanged handler. All new non-UP entries currently retain WebView mode pending Android compatibility tests. Custom Tab support is tested with mocks; no non-UP browser mode is claimed to be device-verified.

The Bihar configuration adds the official Jamabandi entry and consolidates the two former map aliases into `BR-map`. Rajasthan uses the current HTTPS Apna Khata entry under `RJ-records`, consolidating its older duplicate catalog entry. Other existing services remain available in their regional configuration.

## Rollout gate: still closed

`RELEASE_FEATURES.multiState` remains **false**. Current users continue opening UP with the existing flow. No state-selection UI has been enabled, no authentication behavior changed, no saved data migrated, and no emulator has been operated for this implementation step.

This is completion of the configuration foundation, **not completion of MP/Bihar validation or a production multi-state launch**. The `stage` field records the planned sequence; it is not itself a release switch. The retained picker still contains the national list, so enabling the old flag alone is not the next implementation step.

Before opening the rollout gate:

1. Apply the five-state rollout scope to selection and state restoration consistently. Preserve previously stored choices outside that scope without silently activating them.
2. Preserve direct startup for existing UP users. Handle new-user selection, returning-user selection, and legacy saved non-UP choices deliberately.
3. Bind asynchronous record operations to the originating workspace, reject stale responses and clear pending record opens when switching. Verify draft persistence and GPS interruption behavior.
4. Check MP and Bihar service entry, selection, back navigation, browser compatibility, login boundaries and downloads on an isolated emulator. Record which stages require authorized users; do not mark them passed without evidence.
5. Run the UP baseline regression checks and live navigation checks on the candidate build.
6. Validate Delhi and Rajasthan before advertising their workflows at the same support level.

Local unit rules are not being guessed or added in this step. Standard conversions and the current editable Bigha/Biswa factors remain unchanged. Verified locality profiles, additional regional units and immutable rule provenance in saved measurements are subsequent work.

## Official-source review

Research fetches establish sources and entry content only. They do not prove that a portal works inside Android or that its complete workflow succeeds.

| State/service | Evidence on 9 October 2026 | Remaining work |
| --- | --- | --- |
| MP Bhulekh | The [official Sidhi district page](https://sidhi.nic.in/en/service/land-records/) identifies MP Bhulekh as the land-record service. Fetches of both the root and `/mpbhulekh.do` timed out. | Retry in the isolated emulator; assess entry, public records and browser mode. |
| BiharBhumi | The [official homepage](https://biharbhumi.bihar.gov.in/Biharbhumi/) loaded and supplied the Jamabandi, officer-service and map links. | Android and service-specific interaction checks. |
| Bihar Jamabandi | The official homepage linked [the Jamabandi search](https://emutation.bihar.gov.in/biharBhumireport/ViewJamabandi.aspx); the destination fetch timed out. | Verify actual entry and search flow; retain the timeout as unresolved evidence. |
| Bihar maps | [BhuNaksha](https://bhunaksha.bihar.gov.in/) loaded and redirected to `/10/index.jsp`. | Map interaction and return navigation in Android. |
| Delhi records | [Indraprastha Bhulekh](https://dlrc.delhi.gov.in/Default.aspx) loaded with a revenue-village record directory. | Interactive record selection; avoid implying coverage of every Delhi property. |
| Rajasthan records | [Apna Khata](https://apnakhata.rajasthan.gov.in/) responded at the HTTPS address. | Location selection and record workflow in Android. |

Other migrated links remain explicitly `pending` in JSON. `source-reviewed` means the source was inspected; `entry-tested` and `workflow-tested` are reserved for documented app checks. No newly configured non-UP service has either of the latter statuses yet.

## Automated verification

- **71 tests passed across 11 suites**, including the new configuration tests, all six required UP baseline suites, UP-first behavior, state-context persistence, portal-browser behavior and the measurement shortcut regression.
- TypeScript checking and lint for all changed TypeScript files passed after the final URL-parser hardening.
- UP's service objects matched the captured pre-change values exactly; existing shortcut order is also asserted by tests.
- No fresh emulator, authenticated government-service, OTP, CAPTCHA, payment or outdoor GPS verification was performed in this step.

The new tests are in [StateConfiguration.test.ts](../__tests__/StateConfiguration.test.ts). The unchanged mandatory UP checks remain in [the approved baseline](approved-bhulekh-baseline.md).

## Maintaining the JSON files

Edit an existing state's JSON to update a title, reviewed URL, shortcut order or browser mode. Use the existing stable service ID unless the service itself changes. Preserve distinct service IDs even when they share a URL. Review dates and status must reflect actual evidence.

To add a state later, add its JSON file and explicit import in [the bundle registry](../src/config/states/index.ts), validate its services, then include it in the eventual release allowlist. Metro's explicit imports ensure files are bundled for offline startup. Adding a novel portal workflow requires a tested code adapter; JSON cannot contain JavaScript or invent an unsupported action.

The broader design remains in [ALL_INDIA_CONFIGURATION_DESIGN.md](ALL_INDIA_CONFIGURATION_DESIGN.md). This document records the narrower accepted rollout order and actual implementation status.
