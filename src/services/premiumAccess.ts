import { RELEASE_FEATURES } from '../config/releaseFeatures';
import {
  entitlementAllows,
  PremiumEntitlement,
  PremiumFeature,
} from '../domain/premium';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
export function subscribePremiumAccess(listener: () => void) {
  listeners.add(listener);
  const timer = setInterval(listener, 1000);
  return () => {
    listeners.delete(listener);
    clearInterval(timer);
  };
}

let account: string | null = null;
let current: PremiumEntitlement | null = null;
let receivedAt = 0;
let receivedWallTime = 0;
let openPremium: (() => void) | null = null;
const monotonicNow = () =>
  (
    globalThis as typeof globalThis & { performance: { now: () => number } }
  ).performance.now();

export function setPremiumAccount(userId: string | null) {
  if (account === userId) return;
  current = null;
  account = userId;
  void Promise.resolve().then(notify);
}
export function setPremiumEntitlement(value: PremiumEntitlement) {
  if (value.userId !== account) return;
  current = value;
  receivedAt = monotonicNow();
  receivedWallTime = Date.now();
  notify();
}
export function clearPremiumAccess() {
  current = null;
  notify();
}
export function hasPremiumAccess(feature: PremiumFeature) {
  // Wall time only makes the lease shorter; rolling it back cannot extend it.
  const elapsed = Math.max(
    monotonicNow() - receivedAt,
    Date.now() - receivedWallTime,
  );
  return entitlementAllows(
    current,
    account,
    feature,
    Date.parse(current?.serverTime || '') + elapsed,
  );
}
export function registerPremiumNavigation(open: (() => void) | null) {
  openPremium = open;
}
// Feature availability is separate from paid membership and ad eligibility.
export function hasFeatureAccess(feature: PremiumFeature) {
  return !RELEASE_FEATURES.premium || hasPremiumAccess(feature);
}
export function requestPremiumAccess(feature: PremiumFeature) {
  if (hasFeatureAccess(feature)) return true;
  openPremium?.();
  return false;
}
