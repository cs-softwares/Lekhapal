import { RELEASE_FEATURES } from '../config/releaseFeatures';
import { usePremiumActive } from './usePremiumActive';

// Testing access must never masquerade as a paid, ad-free entitlement.
export function usePremiumFeatures() {
  const paid = usePremiumActive();
  return !RELEASE_FEATURES.premium || paid;
}
