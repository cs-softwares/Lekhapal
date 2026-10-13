import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import type { Purchase } from 'react-native-iap';
import { useAuthSession } from './AuthSessionContext';
import {
  premiumApi,
  PremiumCatalog,
  PremiumResponse,
} from '../services/premiumApi';
import {
  availablePremiumPurchases,
  buyPremium,
  listenToPlay,
  loadPremiumPlans,
  PremiumPlan,
} from '../services/playBilling';
import {
  clearPremiumAccess,
  hasPremiumAccess,
  setPremiumAccount,
  setPremiumEntitlement,
} from '../services/premiumAccess';
import type { PremiumEntitlement } from '../domain/premium';

type Value = {
  plans: PremiumPlan[];
  entitlement: PremiumEntitlement | null;
  active: boolean;
  busy: boolean;
  message: string;
  loadPlans: () => Promise<void>;
  purchase: (plan: PremiumPlan) => Promise<void>;
  restore: () => Promise<void>;
};
const Context = createContext<Value | null>(null);
export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuthSession();
  const userId = session?.isGuest ? null : session?.userId || null;
  const identity = useRef(userId);
  identity.current = userId;
  setPremiumAccount(userId);
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [entitlement, setEntitlement] = useState<PremiumEntitlement | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [, tick] = useState(0);
  const catalog = useRef<PremiumCatalog | null>(null);
  const processing = useRef(new Set<string>());
  const purchaseBusy = useRef(false);
  const reconcileRef = useRef<(() => Promise<void>) | null>(null);
  const listenerActive = useRef(false);

  const accept = useCallback(
    (result: PremiumResponse, expectedUser: string) => {
      if (
        identity.current !== expectedUser ||
        result.entitlement.userId !== expectedUser
      )
        return;
      setPremiumEntitlement(result.entitlement);
      setEntitlement(result.entitlement);
    },
    [],
  );

  const refresh = useCallback(async () => {
    const expectedUser = identity.current;
    if (!expectedUser) return;
    const result = await premiumApi<PremiumResponse>('status');
    accept(result, expectedUser);
  }, [accept]);

  const processPurchase = useCallback(
    async (item: Purchase) => {
      const expectedUser = identity.current;
      if (!expectedUser || item.productId !== catalog.current?.productId)
        return;
      if (item.purchaseState === 'pending') {
        setMessage(
          'Payment pending. Premium unlocks after Google Play confirms payment.',
        );
        purchaseBusy.current = false;
        setBusy(false);
        // Register the token for server reconciliation if payment finishes while
        // the app is closed. Pending payments never grant access on the client.
        if (!item.purchaseToken) return;
      }
      if (
        !['purchased', 'pending'].includes(item.purchaseState) ||
        !item.purchaseToken
      )
        return;
      const key = `${expectedUser}:${item.purchaseToken}`;
      if (processing.current.has(key)) return;
      processing.current.add(key);
      try {
        const result = await premiumApi<PremiumResponse>('verify', {
          purchaseToken: item.purchaseToken,
        });
        if (
          item.purchaseState !== 'pending' ||
          result.purchaseState !== 'pending'
        )
          accept(result, expectedUser);
        if (identity.current === expectedUser)
          setMessage(
            result.purchaseState === 'pending'
              ? 'Payment pending. Premium unlocks after Google Play confirms payment.'
              : result.entitlement.active
              ? 'Premium access verified.'
              : 'This purchase has no active premium access.',
          );
        return true;
        // Acknowledgement is owned by Supabase; never consume a subscription.
      } catch {
        if (identity.current === expectedUser)
          setMessage(
            'Purchase could not be verified. Use Restore access to retry; do not pay again.',
          );
        return false;
      } finally {
        processing.current.delete(key);
        if (identity.current === expectedUser) {
          purchaseBusy.current = false;
          setBusy(false);
        }
      }
    },
    [accept],
  );

  const loadPlans = useCallback(async () => {
    try {
      const config = await premiumApi<PremiumCatalog>('catalog');
      catalog.current = config;
      if (!config.enabled) {
        setPlans([]);
        setMessage('Premium purchases are not available yet.');
        return;
      }
      const available = await loadPremiumPlans(config.productId);
      setPlans(available);
      setMessage(
        available.length
          ? ''
          : 'No prepaid plans are available for this Google Play account.',
      );
    } catch {
      setPlans([]);
      setMessage(
        'Could not load Google Play plans. Check your connection and retry.',
      );
    }
  }, []);

  const restore = useCallback(async () => {
    if (!identity.current) {
      setMessage('Sign in to your Lekhpal account to restore access.');
      return;
    }
    setBusy(true);
    try {
      await refresh();
      if (!catalog.current)
        catalog.current = await premiumApi<PremiumCatalog>('catalog');
      const purchases = await availablePremiumPurchases(
        catalog.current.productId,
      );
      let verified = true;
      for (const item of purchases)
        if ((await processPurchase(item)) === false) verified = false;
      await refresh();
      if (verified)
        setMessage(
          hasPremiumAccess('gps_capture')
            ? 'Premium access restored.'
            : 'No active purchase found for this account.',
        );
    } catch {
      setMessage(
        'Restore could not finish. Check your connection and Google Play account, then retry.',
      );
    } finally {
      setBusy(false);
    }
  }, [refresh, processPurchase]);

  useEffect(() => {
    clearPremiumAccess();
    setEntitlement(null);
    setMessage('');
    setBusy(false);
    purchaseBusy.current = false;
    reconcileRef.current = null;
    listenerActive.current = false;
    if (!userId) return;
    let alive = true;
    let remove: (() => void) | undefined;
    let reconciling = false;
    const reconcile = async () => {
      if (reconciling || !alive) return;
      reconciling = true;
      try {
        await refresh();
      } catch {
        /* A valid in-memory lease may remain until its deadline. */
      }
      try {
        if (!catalog.current)
          catalog.current = await premiumApi<PremiumCatalog>('catalog');
        if (!alive) return;
        if (!remove) {
          const stop = await listenToPlay(
            item => {
              if (alive) void processPurchase(item);
            },
            error => {
              if (!alive) return;
              purchaseBusy.current = false;
              setBusy(false);
              setMessage(
                String(error.code).includes('cancel')
                  ? 'Purchase cancelled.'
                  : 'Google Play could not complete the purchase. Please retry.',
              );
            },
          );
          if (!alive) {
            stop();
            return;
          }
          remove = stop;
          listenerActive.current = true;
        }
        for (const item of await availablePremiumPurchases(
          catalog.current.productId,
        )) {
          if (alive) await processPurchase(item);
        }
      } catch {
        /* Store outage must not affect basic tools. */
      } finally {
        reconciling = false;
      }
    };
    reconcileRef.current = reconcile;
    void reconcile();
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void reconcile();
    });
    const poll = setInterval(() => {
      if (AppState.currentState === 'active') void reconcile();
    }, 5 * 60 * 1000);
    const expiry = setInterval(() => tick(value => value + 1), 1000);
    return () => {
      alive = false;
      remove?.();
      appState.remove();
      clearInterval(poll);
      clearInterval(expiry);
    };
  }, [userId, refresh, processPurchase]);

  // Recover a missing/delayed native callback without launching another checkout.
  useEffect(() => {
    if (!busy || !purchaseBusy.current) return;
    const expectedUser = userId;
    const retry = setInterval(() => {
      if (identity.current === expectedUser && purchaseBusy.current)
        void reconcileRef.current?.();
    }, 4000);
    const deadline = setTimeout(() => {
      if (identity.current !== expectedUser || !purchaseBusy.current) return;
      purchaseBusy.current = false;
      setBusy(false);
      setMessage(
        'Still waiting for Google Play confirmation. If payment completed, use Restore access; do not pay again.',
      );
    }, 60000);
    return () => {
      clearInterval(retry);
      clearTimeout(deadline);
    };
  }, [busy, userId]);

  const purchase = async (plan: PremiumPlan) => {
    const expectedUser = identity.current;
    if (!expectedUser || purchaseBusy.current) return;
    purchaseBusy.current = true;
    setBusy(true);
    setMessage('');
    try {
      await reconcileRef.current?.();
      if (!listenerActive.current)
        throw new Error('Google Play is still connecting.');
      const result = await premiumApi<PremiumResponse>('prepare');
      if (identity.current !== expectedUser) return;
      if (!result.accountId) throw new Error('Account verification failed');
      await buyPremium(plan, result.accountId);
      // The result is delivered through the store listener, not requestPurchase.
    } catch {
      if (identity.current === expectedUser) {
        purchaseBusy.current = false;
        setBusy(false);
        setMessage(
          'Checkout could not start. Check your connection and retry.',
        );
      }
    }
  };
  return (
    <Context.Provider
      value={{
        plans,
        entitlement,
        busy,
        message,
        loadPlans,
        purchase,
        restore,
        active: hasPremiumAccess('gps_capture'),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePremium() {
  const value = useContext(Context);
  if (!value) throw new Error('PremiumProvider is required');
  return value;
}
