# Khasra time-saving upgrade · approved UP implementation

The user approved the UP per-plot import, validation and daily-report upgrade after reviewing this proposal. The implementation and verification record is in [KHASRA_BULK_AUTOMATION.md](KHASRA_BULK_AUTOMATION.md). The proposal below records the intended scope; additional state-specific feeding adapters still require inspection and approval.

## Existing code inspected

UP has saved gata queues/ranges, subsection rules, seasonal crop/irrigation plans, official-row reconciliation after interruption, confirmed-result journalling and optional final locking. Sources: `src/domain/khasraQueue.ts`, `src/domain/cropPlan.ts`, `src/domain/khasraAdvanced.ts`, `src/screens/KhasraFeedingScreen.tsx`, `src/components/khasra/FeedingQueuePanel.tsx`.

Before this upgrade, queue items stored gata/status/note while crop/subsection configuration was shared. Imported queue items now also retain their own crop/area/irrigation plan. Existing recovery and batching remain in use.

## Recommended first implementation: UP

1. Paste tabular per-plot data: gata, crop, area and irrigation. Support multiple crops per plot with explicit grouping and an editable review table.
2. Validate the entire plan before starting: duplicate/conflicting rows, crop availability for the current season, area totals/precision, village/year/season identity and missing values. Report the exact offending row.
3. Bind each reviewed plan to its own queue item. Reuse the existing confirmation and recovery controls. Advance only after the official page confirms the intended result. An uncertain save requires reconciliation before retrying.
4. Export a daily report of confirmed, skipped and needs-review plots, with reasons and timestamps. Do not count attempted clicks as completed work or invent hours/money saved.
5. Test fixtures, interruption/restart behavior, wrong-context rejection and duplicate prevention, then verify authenticated government acceptance with the user's login workflow.

## Other states

Reference state menus and portal links are not proof of a working feeding adapter. Inspect each state's actual service and reference implementation first, then propose the particular adapter and input mapping for approval. Keep state data separate, retain UP's approved screens, and distinguish available portal access, implemented automation and authenticated verification in the UI/status.

Login, CAPTCHA and OTP remain user steps. No authenticated government writes were performed during this audit. Full all-state automation is not claimed.
