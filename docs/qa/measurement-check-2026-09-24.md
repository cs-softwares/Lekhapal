# Measurement verification — 24 September 2026

Environment: Android emulator `emulator-5554`, development app `com.lekhpal`.

## Automated checks

- TypeScript: `npx tsc --noEmit` passed.
- Jest: 11 suites, 70 tests passed after fixes.
- Repository ESLint: 0 errors, 90 warnings (primarily existing styling warnings).
- Targeted lint on verification fixes: passed without warnings.

Tests cover field geometry, invalid measurements, Hindi numeric input, unit factors and local-unit configuration, map-scale calculations, report content, saved-record restoration, state isolation, GPS tap/walk capture, undo/clear, crossed boundaries, official-service routing, and existing field-desk flows.

## Fixes during verification

- GPS Locate now recenters an existing boundary map on the current location.
- Clearing/restoring a boundary cancels pending GPS corner callbacks; stopped walks ignore late location updates.
- Saving/deleting notes reloads current storage, preventing a mounted calculator from resurrecting a note deleted through the notebook.
- GPS result text now uses readable colors in dark mode.

Added four regression tests for the behavioral fixes.

## Android checks

- Reopened an existing saved GPS boundary: four corners, 1,658.46 m², 165.93 m perimeter restored.
- PDF export generated a one-page report and opened the Android share sheet.
- Read the generated PDF back using PDFKit: all coordinates, area, hectare/acre conversions, perimeter, and the approximation note were present.
- Text share opened with matching report contents. Both share sheets were dismissed; nothing was sent.
- A clean app restart succeeded and the Calculator tab opened normally. Development reload/animation state initially interfered with manual navigation checks.
- Temporarily disabled emulator animations for UI inspection, then restored the original unset animation setting.

## Verification limits

Outdoor GPS accuracy and continuous walking on a physical phone are not verified by emulator tests. iOS, authenticated government-portal transactions, and every external portal's live availability were not tested. This is not a claim that every possible app path is defect-free.
