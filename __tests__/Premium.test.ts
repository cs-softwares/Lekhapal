// Preserve coverage of paid-mode behaviour while the shipping UI is temporarily hidden.
jest.mock('../src/config/releaseFeatures', () => ({
  ...jest.requireActual('../src/config/releaseFeatures'),
  RELEASE_FEATURES: {...jest.requireActual('../src/config/releaseFeatures').RELEASE_FEATURES, premium: true},
}));
import {registerReportEditor} from '../src/services/reportEditor';
import {entitlementAllows, formatPlanPeriod, PremiumEntitlement} from '../src/domain/premium';
import {clearPremiumAccess, hasPremiumAccess, registerPremiumNavigation, requestPremiumAccess, setPremiumAccount, setPremiumEntitlement} from '../src/services/premiumAccess';
import {prepaidPlans} from '../src/services/playBilling';
import {grantsAccess, verifiedPurchase} from '../supabase/functions/premium/purchase';
import {exportSummaryAsPdf} from '../src/utils/workspaceExport';
import {generatePDF} from 'react-native-html-to-pdf';

const now = Date.parse('2026-09-29T12:00:00Z');
const lease = (): PremiumEntitlement => ({
  userId: 'user-a', active: true, expiresAt: new Date(now + 86400000).toISOString(),
  verifiedAt: new Date(now).toISOString(), serverTime: new Date(now).toISOString(),
  validUntil: new Date(now + 900000).toISOString(), features: ['gps_capture', 'pdf_reports'],
});
beforeEach(() => { clearPremiumAccess(); setPremiumAccount('user-a'); jest.clearAllMocks(); });
afterEach(() => { registerPremiumNavigation(null); registerReportEditor(null); jest.restoreAllMocks(); });

test('entitlements reject expired leases, paid expiry, other accounts and inactive states', () => {
  const value = lease();
  expect(entitlementAllows(value, 'user-a', 'gps_capture', now)).toBe(true);
  expect(entitlementAllows(value, 'user-a', 'gps_capture', now + 900000)).toBe(false);
  expect(entitlementAllows({...value, expiresAt: new Date(now).toISOString()}, 'user-a', 'pdf_reports', now)).toBe(false);
  expect(entitlementAllows(value, 'user-b', 'gps_capture', now)).toBe(false);
  expect(entitlementAllows({...value, active: false}, 'user-a', 'gps_capture', now)).toBe(false);
  expect(entitlementAllows(value, 'user-a', 'gps_capture', NaN)).toBe(false);
});

test('clock rollback cannot extend access, and account switches clear access', () => {
  const wall = jest.spyOn(Date, 'now').mockReturnValue(now);
  const mono = jest.spyOn((globalThis as typeof globalThis & {performance: {now: () => number}}).performance, 'now').mockReturnValue(100);
  setPremiumEntitlement(lease());
  expect(hasPremiumAccess('gps_capture')).toBe(true);
  wall.mockReturnValue(now - 3600000);
  mono.mockReturnValue(900100);
  expect(hasPremiumAccess('gps_capture')).toBe(false);
  mono.mockReturnValue(100);
  setPremiumAccount('user-b');
  setPremiumEntitlement(lease());
  expect(hasPremiumAccess('gps_capture')).toBe(false);
});

test('PDF export cannot bypass paid access through a direct utility call', async () => {
  const open = jest.fn(); registerPremiumNavigation(open);
  await exportSummaryAsPdf({title: 'Report', fileName: 'report', summaryLines: ['Area']});
  expect(open).toHaveBeenCalledTimes(1);
  expect(generatePDF).not.toHaveBeenCalled();
  registerReportEditor(async draft => ({title:draft.title,details:{owner:'Ram',village:'',plot:'',client:'',notes:''}}));
  setPremiumEntitlement(lease());
  await exportSummaryAsPdf({title: 'Report', fileName: 'report', summaryLines: ['Area']});
  expect(generatePDF).toHaveBeenCalledTimes(1);
  clearPremiumAccess();
  expect(requestPremiumAccess('gps_capture')).toBe(false);
});

test('only non-renewing prepaid offers are offered, using store prices and periods', () => {
  const offer = {basePlanIdAndroid: 'new-duration', offerTokenAndroid: 'token',
    pricingPhasesAndroid: {pricingPhaseList: [{recurrenceMode: 3, formattedPrice: '₹299.00', billingPeriod: 'P2M'}]}};
  const products: any = [{id: 'lekhpal_premium', platform: 'android', subscriptionOffers: [offer,
    {...offer, basePlanIdAndroid: 'auto', pricingPhasesAndroid: {pricingPhaseList: [{recurrenceMode: 1}]}},
    {...offer, basePlanIdAndroid: 'trial', pricingPhasesAndroid: {pricingPhaseList: [{recurrenceMode: 2}, {recurrenceMode: 1}]}},
  ]}];
  expect(prepaidPlans(products, 'lekhpal_premium')).toEqual([{productId: 'lekhpal_premium', basePlanId: 'new-duration', offerToken: 'token', price: '₹299.00', period: 'P2M'}]);
  expect(formatPlanPeriod('P2M')).toBe('2 months');
});

const purchase = () => ({
  subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
  externalAccountIdentifiers: {obfuscatedExternalAccountId: 'hash-a'},
  lineItems: [{productId: 'lekhpal_premium', expiryTime: new Date(now + 3600000).toISOString(), prepaidPlan: {}, offerDetails: {basePlanId: 'prepaid-month'}}],
});
test('backend verifies account/product/prepaid state and uses Google expiry', () => {
  expect(verifiedPurchase(purchase(), 'lekhpal_premium', 'hash-a')).toMatchObject({acknowledged: false, pending: false, expiry: new Date(now + 3600000).toISOString()});
  expect(() => verifiedPurchase(purchase(), 'wrong-product', 'hash-a')).toThrow();
  expect(() => verifiedPurchase(purchase(), 'lekhpal_premium', 'hash-b')).toThrow();
  const recurring: any = purchase(); recurring.lineItems[0].autoRenewingPlan = {};
  expect(() => verifiedPurchase(recurring, 'lekhpal_premium', 'hash-a')).toThrow();
});
test('pending, revoked and expired purchases never grant access; paid cancellation retains remaining time', () => {
  for (const state of ['SUBSCRIPTION_STATE_PENDING', 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED', 'SUBSCRIPTION_STATE_EXPIRED', 'SUBSCRIPTION_STATE_ON_HOLD'])
    expect(grantsAccess(state, new Date(now + 1000).toISOString(), now)).toBe(false);
  expect(grantsAccess('SUBSCRIPTION_STATE_CANCELED', new Date(now + 1000).toISOString(), now)).toBe(true);
  expect(grantsAccess('SUBSCRIPTION_STATE_ACTIVE', new Date(now).toISOString(), now)).toBe(false);
  expect(verifiedPurchase({...purchase(), subscriptionState: 'SUBSCRIPTION_STATE_PENDING'}, 'lekhpal_premium', 'hash-a').pending).toBe(true);
});
