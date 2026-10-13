> Update, 11 October 2026: the user requested all non-UP states from FastWork. See [the implemented state rollout and remaining limits](FASTWORK_STATE_ROLLOUT.md). Earlier UP-only/five-region gate statements below describe the previous rollout stage. UP remains the default and its approved behavior is preserved.

# Temporary UP-first release — preserve multi-state support

**9 October 2026 update:** The user approved a bundled-JSON foundation and Hindi-first expansion (UP, MP, Bihar, Delhi, Rajasthan). Configuration is wired in, but the release flag remains off pending pilot validation and safe state-switch migration. Follow [the Hindi-first rollout gates](HINDI_STATE_ROLLOUT.md) before enabling it; flipping the flag alone is no longer the rollout procedure. The earlier decision below remains the current UP-only runtime behavior.

**Requested decision: hide state selection for now, do not remove it permanently.**
The first polished release targets Uttar Pradesh Lekhpals. Other states will return later.

The single switch is `RELEASE_FEATURES.multiState` in `src/config/releaseFeatures.ts`.
It is currently `false`.

While disabled:
- Startup, guest entry and sign-in go directly to the UP workspace without a state picker or state-selection popup.
- Drawer, Profile and Settings hide state-changing controls.
- Opening the retained StateSelection route redirects to the workspace.
- The active workspace and calculation storage both resolve to UP.
- A previously saved state choice (including a non-UP choice) is **not overwritten or deleted**.
- State catalogs, portal mappings, picker UI and per-state data remain in place.

To restore: set `multiState: true`, then verify first-run selection, guest/sign-in entry, saved-state startup, drawer/Profile/Settings state switching, back navigation, and record isolation. Existing saved choices become active again. Test both UP and a non-UP state.

Do not “clean up” the hidden picker, state catalog, conditional menu entries, or existing state-specific storage. This is a reversible rollout decision, not a permanent UP-only architecture.
