// A single consent decision shared by every format. SDK is loaded only for a
// signed-in Basic account with a resolved entitlement.
export type AdsSdk = typeof import('react-native-google-mobile-ads');
type State = {
  sdk: AdsSdk | null;
  ready: boolean;
  privacy: boolean;
  revision: number;
};
let state: State = { sdk: null, ready: false, privacy: false, revision: 0 };
const listeners = new Set<() => void>();
let preparation: Promise<void> | null = null;
let privacyBusy = false;
let initialized = false;
const publish = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach(listener => listener());
};
export const adConsentSnapshot = () => state;
export const subscribeAdConsent = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function prepareAds() {
  if (preparation) return preparation;
  preparation = (async () => {
    const sdk: AdsSdk = require('react-native-google-mobile-ads');
    const consent = await sdk.AdsConsent.gatherConsent();
    publish({
      sdk,
      privacy:
        consent.privacyOptionsRequirementStatus ===
        sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    });
    if (!consent.canRequestAds) return;
    if (!initialized) {
      await sdk.default().initialize();
      initialized = true;
    }
    publish({ ready: true });
  })().catch(() => {
    preparation = null;
    publish({ ready: false });
  });
  return preparation;
}
export async function openAdPrivacy() {
  if (!state.sdk || privacyBusy) return;
  privacyBusy = true;
  publish({ ready: false, revision: state.revision + 1 });
  try {
    await state.sdk.AdsConsent.showPrivacyOptionsForm();
    const info = await state.sdk.AdsConsent.getConsentInfo();
    if (info.canRequestAds && !initialized) {
      await state.sdk.default().initialize();
      initialized = true;
    }
    publish({
      ready: info.canRequestAds,
      privacy:
        info.privacyOptionsRequirementStatus ===
        state.sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    });
  } catch {
    /* Keep ad requests paused on a consent error. */
  } finally {
    privacyBusy = false;
  }
}
