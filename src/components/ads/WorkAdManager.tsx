import { useEffect } from 'react';
import { useAds } from '../../hooks/useAds';
import {
  configureInterstitialAccount,
  preloadWorkInterstitial,
  stopWorkAds,
} from '../../services/interstitialAds';
export default function WorkAdManager() {
  const { ready, sdk, userId } = useAds();
  useEffect(() => {
    configureInterstitialAccount(ready ? userId : null);
    return stopWorkAds;
  }, [ready, userId]);
  useEffect(() => {
    if (!ready || !sdk) return;
    // Preload only; this timer never displays an ad.
    preloadWorkInterstitial(sdk);
    const timer = setInterval(() => preloadWorkInterstitial(sdk), 60_000);
    return () => clearInterval(timer);
  }, [ready, sdk]);
  return null;
}
