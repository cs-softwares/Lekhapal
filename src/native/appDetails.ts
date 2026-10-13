import {Linking, NativeModules, Platform} from 'react-native';
import {APP_INFO} from '../config/appInfo';
import {DEVELOPER_INFO} from '../config/developerInfo';

type AppDetailsModule = {version: string; build: string; packageId: string; openSupportEmail: () => Promise<void>};
export function installedAppDetails() {
  const native = NativeModules.AppDetails as AppDetailsModule | undefined;
  return {
    version: native?.version || APP_INFO.version,
    build: native?.build || (Platform.OS === 'ios' ? '1' : '—'),
    packageId: native?.packageId || APP_INFO.packageId,
  };
}
export async function openSupportEmail() {
  const native = NativeModules.AppDetails as AppDetailsModule | undefined;
  if (Platform.OS === 'android' && native) {
    await native.openSupportEmail();
    return;
  }
  if (Platform.OS === 'ios') {
    try {
      await Linking.openURL(`googlegmail://co?to=${encodeURIComponent(DEVELOPER_INFO.email)}`);
      return;
    } catch { /* Use the default email app when Gmail is not installed. */ }
  }
  await Linking.openURL(`mailto:${DEVELOPER_INFO.email}`);
}
