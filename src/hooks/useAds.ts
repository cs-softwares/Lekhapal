import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { usePremium } from '../context/PremiumContext';
import { useAuthSession } from '../context/AuthSessionContext';
import { usePremiumActive } from './usePremiumActive';
import {
  adConsentSnapshot,
  prepareAds,
  subscribeAdConsent,
} from '../services/adConsent';

export function useAds() {
  const { entitlement } = usePremium();
  const { session } = useAuthSession();
  const active = usePremiumActive();
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', value =>
      setForeground(value === 'active'),
    );
    return () => subscription.remove();
  }, []);
  const state = useSyncExternalStore(
    subscribeAdConsent,
    adConsentSnapshot,
    adConsentSnapshot,
  );
  const eligible =
    Platform.OS === 'android' &&
    !!session?.userId &&
    entitlement?.userId === session.userId &&
    entitlement.active === false &&
    !active;
  useEffect(() => {
    if (eligible && focused && foreground) void prepareAds();
  }, [eligible, focused, foreground, session?.userId]);
  return {
    ...state,
    userId: session?.userId || null,
    eligible,
    focused,
    ready: eligible && focused && foreground && state.ready,
  };
}
