import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { adUnitId } from '../config/ads';
import { adConsentSnapshot, AdsSdk } from './adConsent';
import { hasPremiumAccess } from './premiumAccess';

export const INTERSTITIAL_GAP = 10 * 60 * 1000;
export const INTERSTITIAL_WINDOW = 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'lekhpal.ads.interstitial.v1';
type History = { seenSession: boolean; impressions: number[] };
export function frequencyAllows(
  history: number[],
  now: number,
  started: number,
  firstSession: boolean,
) {
  if (firstSession || now - started < INTERSTITIAL_GAP) return false;
  // Future entries (clock rollback) count too: changing clocks cannot bypass a cap.
  const recent = history.filter(time => now - time < INTERSTITIAL_WINDOW);
  return (
    recent.length < 3 && recent.every(time => now - time >= INTERSTITIAL_GAP)
  );
}
const started = Date.now();
let history: History | null = null;
let firstSession = true;
let setup: Promise<void> | null = null;
let account: string | null = null;
let pending: { account: string; savedAt: number } | null = null;
let interstitial: ReturnType<
  AdsSdk['InterstitialAd']['createForAdRequest']
> | null = null;
let unsubscribers: Array<() => void> = [];
let loadedAt = 0;
let loading = false;
let busy = false;
let lastRequest = 0;
let generation = 0;
function discard() {
  unsubscribers.forEach(unsubscribe => unsubscribe());
  unsubscribers = [];
  interstitial = null;
  loadedAt = 0;
  loading = false;
  generation++;
}
async function initializeHistory() {
  if (setup) return setup;
  setup = (async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    if (
      parsed &&
      (!Array.isArray(parsed.impressions) ||
        parsed.impressions.some(
          (n: unknown) => typeof n !== 'number' || !Number.isFinite(n),
        ))
    )
      throw new Error('Invalid ad history');
    firstSession = !parsed?.seenSession;
    history = { seenSession: true, impressions: parsed?.impressions || [] };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  })().catch(() => {
    history = null;
  }); // Storage failure means no full-screen ads.
  return setup;
}
export function configureInterstitialAccount(userId: string | null) {
  if (account !== userId) {
    discard();
    pending = null;
    account = userId;
  }
  if (userId) void initializeHistory();
}
export function noteSuccessfulWorkSave(toolId: string) {
  // GPS is deliberately excluded, including an expired subscription mid-work.
  if (account && toolId !== 'gps-land-measure')
    pending = { account, savedAt: Date.now() };
}
export function cancelCompletedWorkAd() {
  pending = null;
}
export function preloadWorkInterstitial(sdk: AdsSdk) {
  const now = Date.now();
  if (
    !account ||
    !history ||
    !adConsentSnapshot().ready ||
    hasPremiumAccess('gps_capture') ||
    busy ||
    loading ||
    !frequencyAllows(history.impressions, now, started, firstSession)
  )
    return;
  if (loadedAt && now - loadedAt < 55 * 60 * 1000) return;
  if (now - lastRequest < INTERSTITIAL_GAP) return;
  discard();
  lastRequest = now;
  loading = true;
  const version = generation;
  try {
    const ad = sdk.InterstitialAd.createForAdRequest(
      adUnitId(sdk, 'INTERSTITIAL'),
    );
    interstitial = ad;
    unsubscribers = [
      ad.addAdEventListener(sdk.AdEventType.LOADED, () => {
        if (version === generation) {
          loading = false;
          loadedAt = Date.now();
        }
      }),
      ad.addAdEventListener(sdk.AdEventType.ERROR, discard),
      ad.addAdEventListener(sdk.AdEventType.CLOSED, discard),
    ];
    ad.load();
  } catch {
    discard();
  }
}
// Called only on a Home tab press directly from Calculator/Measurement.
// Never show from a load callback, a timer, launch/resume, or a government page.
export async function showCompletedWorkAd(stillAtHome: () => boolean) {
  const saved = pending;
  pending = null; // A skipped opportunity is never delayed until a later action.
  const now = Date.now();
  const consent = adConsentSnapshot();
  if (
    busy ||
    !account ||
    saved?.account !== account ||
    now - saved.savedAt > 30 * 60 * 1000 ||
    !history ||
    !interstitial ||
    !loadedAt ||
    now - loadedAt >= 55 * 60 * 1000 ||
    !consent.ready ||
    hasPremiumAccess('gps_capture') ||
    AppState.currentState !== 'active' ||
    !frequencyAllows(history.impressions, now, started, firstSession)
  )
    return;
  busy = true;
  const ad = interstitial;
  const version = generation;
  const owner = account;
  // Persist the reservation before display so app restarts retain the limit.
  // A failed/skipped display may consume a slot; this deliberately under-serves.
  history.impressions = history.impressions
    .filter(time => now - time < INTERSTITIAL_WINDOW)
    .concat(now);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    if (
      Date.now() - now > 500 ||
      version !== generation ||
      owner !== account ||
      adConsentSnapshot() !== consent ||
      !stillAtHome() ||
      AppState.currentState !== 'active' ||
      hasPremiumAccess('gps_capture')
    )
      return;
    loadedAt = 0;
    await ad.show();
  } catch {
    /* No ad is preferable to interrupting a completed task. */
  } finally {
    busy = false;
    discard();
  }
}
export function stopWorkAds() {
  configureInterstitialAccount(null);
}
