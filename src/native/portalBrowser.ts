import { Linking, NativeModules, Platform } from 'react-native';

export async function openPortalBrowser(url: string): Promise<void> {
  if (Platform.OS === 'android') {
    const browser = NativeModules.PortalBrowser as
      | { open: (uri: string) => Promise<void> }
      | undefined;
    if (!browser) {
      throw new Error('The portal browser requires an updated Android build.');
    }
    await browser.open(url);
    return;
  }
  await Linking.openURL(url);
}
