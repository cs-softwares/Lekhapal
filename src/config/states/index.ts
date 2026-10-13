import up from './UP.json';
import dl from './DL.json';
import reference from './reference.json';
import { stateConfigSchema, StateConfig } from './schema';

// Static imports are intentional: Metro bundles these files for offline use.
// This registry is rollout scope, not an assertion of live portal readiness.
export const BUNDLED_STATE_CONFIGS: StateConfig[] = [up, ...reference, dl].map(
  config => stateConfigSchema.parse(config),
);

// Preserve the earlier rollout registry for consumers of that named group.
export const HINDI_ROLLOUT_CONFIGS = ['UP', 'MP', 'BR', 'DL', 'RJ'].map(
  code => BUNDLED_STATE_CONFIGS.find(config => config.stateCode === code)!,
);

export const getBundledStateConfig = (stateCode: string) =>
  BUNDLED_STATE_CONFIGS.find(config => config.stateCode === stateCode);
