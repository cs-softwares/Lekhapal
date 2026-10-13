// State scope requested on 11 October 2026, matching FastWork's state selector.
// UP remains the default; changing state is an explicit user action.
export const WORKSPACE_STATE_CODES = [
  'AP',
  'AS',
  'BR',
  'CG',
  'GA',
  'GJ',
  'HR',
  'HP',
  'JH',
  'MP',
  'MH',
  'MN',
  'OD',
  'PB',
  'RJ',
  'TN',
  'TR',
  'UK',
  'UP',
] as const;
export const isWorkspaceState = (code: string | null): code is string =>
  !!code && (WORKSPACE_STATE_CODES as readonly string[]).includes(code);
export const RELEASE_FEATURES = { multiState: true, premium: false };
export const DEFAULT_WORKSPACE_STATE = 'UP';
export const effectiveWorkspaceState = (saved: string | null) =>
  RELEASE_FEATURES.multiState && isWorkspaceState(saved)
    ? saved
    : DEFAULT_WORKSPACE_STATE;
export const postAuthDestination = () => 'MainDrawer' as const;
