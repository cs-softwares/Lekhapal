import { Alert, NativeModules, Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { openAppStore } from '../utils/appActions';

type UpdateInfo = {
  available: boolean;
  inProgress?: boolean;
  versionCode?: number;
};
type UpdateState = UpdateInfo & {
  checking: boolean;
  busy: boolean;
  error: boolean;
};
type UpdateModule = {
  check: () => Promise<UpdateInfo>;
  start: () => Promise<'completed' | 'cancelled' | 'store'>;
};
let state: UpdateState = {
  available: false,
  checking: false,
  busy: false,
  error: false,
};
const listeners = new Set<() => void>();
const publish = (next: Partial<UpdateState>) => {
  state = { ...state, ...next };
  listeners.forEach(listener => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const updateSnapshot = () => state;
export const useAppUpdates = () =>
  useSyncExternalStore(subscribe, updateSnapshot, updateSnapshot);
const native = () =>
  Platform.OS === 'android'
    ? (NativeModules.AppUpdates as UpdateModule | undefined)
    : undefined;
type CheckResult = 'available' | 'current' | 'unavailable';
let checkPromise: Promise<CheckResult> | null = null;
export function checkAppUpdate(): Promise<CheckResult> {
  if (checkPromise) return checkPromise;
  const bridge = native();
  if (!bridge) return Promise.resolve('unavailable');
  publish({ checking: true });
  let timeout: ReturnType<typeof setTimeout>;
  const deadline = new Promise<UpdateInfo>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error('Update check timed out')),
      10000,
    );
  });
  checkPromise = Promise.race([bridge.check(), deadline])
    .then(info => {
      publish({
        ...info,
        available: info.available === true,
        inProgress: info.inProgress === true,
      });
      return info.available ? ('available' as const) : ('current' as const);
    })
    .catch(() => {
      // No invented update, and no offline lock on a first/unknown check.
      // Keep a previously confirmed update visible until Play confirms otherwise.
      return 'unavailable' as const;
    })
    .finally(() => {
      checkPromise = null;
      clearTimeout(timeout);
      publish({ checking: false });
    });
  return checkPromise;
}
let manualCheck = false;
export async function requestAppUpdate(language: string) {
  if (manualCheck || state.busy) return;
  manualCheck = true;
  try {
    const result = await checkAppUpdate();
    if (result === 'available') {
      await startAppUpdate();
    } else if (result === 'current') {
      Alert.alert(
        language === 'hi' ? 'ऐप अपडेट है' : 'App is up to date',
        language === 'hi'
          ? 'आप लेखपाल का नवीनतम उपलब्ध संस्करण इस्तेमाल कर रहे हैं।'
          : 'Your app is already up to date. You are using the latest version available to you.',
      );
    } else {
      Alert.alert(
        language === 'hi'
          ? 'अपडेट जांच नहीं हो पाई'
          : 'Could not check for updates',
        language === 'hi'
          ? 'इंटरनेट जांचें और फिर कोशिश करें। अपडेट जांचने के लिए ऐप Google Play से इंस्टॉल होना चाहिए।'
          : 'Check your connection and try again. Update checks require the app installed from Google Play.',
      );
    }
  } finally {
    manualCheck = false;
  }
}
export async function startAppUpdate() {
  if (state.busy) return;
  publish({ busy: true, error: false });
  try {
    const bridge = native();
    if (!state.available || !bridge) {
      await openAppStore();
    } else {
      let result: string;
      try {
        result = await bridge.start();
      } catch {
        result = 'store';
      }
      if (result === 'store') await openAppStore();
    }
  } catch {
    publish({ error: true });
  } finally {
    publish({ busy: false });
    await checkAppUpdate();
  }
}
