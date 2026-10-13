export type PlaySubscription = {
  subscriptionState?: string;
  acknowledgementState?: string;
  externalAccountIdentifiers?: {obfuscatedExternalAccountId?: string};
  linkedPurchaseToken?: string;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    prepaidPlan?: {allowExtendAfterTime?: string};
    autoRenewingPlan?: unknown;
    offerDetails?: {basePlanId?: string};
  }>;
};

export function verifiedPurchase(data: PlaySubscription, productId: string, accountId: string) {
  if (data.externalAccountIdentifiers?.obfuscatedExternalAccountId !== accountId)
    throw new Error('This purchase belongs to another Lekhpal account.');
  const lines = data.lineItems || [];
  if (lines.length !== 1) throw new Error('Unsupported purchase.');
  const item = lines[0];
  if (item.productId !== productId || !item.prepaidPlan || item.autoRenewingPlan || !item.offerDetails?.basePlanId)
    throw new Error('Only Lekhpal prepaid premium plans are accepted.');
  const state = data.subscriptionState || 'SUBSCRIPTION_STATE_UNSPECIFIED';
  const pending = state === 'SUBSCRIPTION_STATE_PENDING' || state === 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED';
  const expiry = item.expiryTime && Number.isFinite(Date.parse(item.expiryTime)) ? item.expiryTime : null;
  if (!pending && !expiry) throw new Error('Google did not return a valid expiry.');
  return {
    state, expiry, pending, basePlanId: item.offerDetails.basePlanId,
    acknowledged: data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    linked: data.linkedPurchaseToken || null,
  };
}

export function grantsAccess(state: string, expiry: string | null, now: number) {
  return ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_CANCELED'].includes(state) &&
    Date.parse(expiry || '') > now;
}
