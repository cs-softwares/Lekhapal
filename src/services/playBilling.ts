import {LogBox, Platform} from 'react-native';
import type {ProductSubscription, Purchase, PurchaseError} from 'react-native-iap';

export type PremiumPlan = {
  productId: string;
  basePlanId: string;
  offerToken: string;
  price: string;
  period: string;
};

// The SDK logs this caught, recoverable error before rejecting its promise.
// Keep console diagnostics, but do not show an app-wide development overlay for
// this one handled disconnect. Other billing errors remain visible.
if (__DEV__) {
  LogBox.ignoreLogs([
    /\[RN-IAP\][\s\S]*Failed to get available purchases:[\s\S]*(service-disconnected|Store service is not connected|Service connection is disconnected)/,
  ]);
}

type PlayApi = typeof import('react-native-iap');
// Share only an in-flight initialization. A resolved JS promise is not proof
// that the native store service is still connected after backgrounding.
let connection: Promise<PlayApi> | null = null;
export async function connectPlay(): Promise<PlayApi> {
  if (Platform.OS !== 'android') throw new Error('Premium purchases are available through Google Play on Android.');
  if (!connection) {
    connection = (async () => {
      const api = require('react-native-iap') as PlayApi;
      if (!(await api.initConnection())) throw new Error('Google Play could not connect.');
      return api;
    })().finally(() => { connection = null; });
  }
  return connection;
}

function isDisconnected(error: unknown) {
  const value = error as {code?: string; message?: string} | null;
  return value?.code === 'service-disconnected' || value?.code === 'connection-closed' ||
    /"code"\s*:\s*"(?:service-disconnected|connection-closed)"/.test(value?.message || '');
}

async function readFromPlay<T>(read: (api: PlayApi) => Promise<T>): Promise<T> {
  const api = await connectPlay();
  try { return await read(api); }
  catch (error) {
    if (!isDisconnected(error)) throw error;
    // A service may drop between init and the read. Retry once, preserving
    // purchase listeners; endConnection() would remove those listeners.
    return read(await connectPlay());
  }
}

export function prepaidPlans(products: ProductSubscription[], productId: string): PremiumPlan[] {
  return products.flatMap(product => {
    if (product.platform !== 'android' || product.id !== productId) return [];
    return (product.subscriptionOffers || []).flatMap(offer => {
      const phases = offer.pricingPhasesAndroid?.pricingPhaseList || [];
      // NON_RECURRING = 3. Never offer an auto-renewing or trial plan by accident.
      if (phases.length !== 1 || phases[0].recurrenceMode !== 3 ||
          !offer.basePlanIdAndroid || !offer.offerTokenAndroid || offer.installmentPlanDetailsAndroid)
        return [];
      return [{productId, basePlanId: offer.basePlanIdAndroid,
        offerToken: offer.offerTokenAndroid, price: phases[0].formattedPrice,
        period: phases[0].billingPeriod}];
    });
  });
}
export async function loadPremiumPlans(productId: string) {
  const products = await readFromPlay(api => api.fetchProducts({skus: [productId], type: 'subs'}));
  return prepaidPlans((products || []) as ProductSubscription[], productId);
}
export async function availablePremiumPurchases(productId: string) {
  return (await readFromPlay(api => api.getAvailablePurchases()))
    .filter(purchase => purchase.productId === productId);
}
// Never automatically retry a purchase request: its result may arrive later
// through the listener even if the request itself reports a connection error.
export async function buyPremium(plan: PremiumPlan, accountId: string) {
  await (await connectPlay()).requestPurchase({type: 'subs', request: {google: {
    skus: [plan.productId], obfuscatedAccountId: accountId,
    subscriptionOffers: [{sku: plan.productId, offerToken: plan.offerToken}],
  }}});
}
export async function listenToPlay(onPurchase: (purchase: Purchase) => void, onError: (error: PurchaseError) => void) {
  const api = await connectPlay();
  const update = api.purchaseUpdatedListener(onPurchase);
  const error = api.purchaseErrorListener(onError);
  return () => { update.remove(); error.remove(); };
}
