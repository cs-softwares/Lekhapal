import React from 'react';
import Renderer, {act} from 'react-test-renderer';
import {PremiumProvider, usePremium} from '../src/context/PremiumContext';
import {clearPremiumAccess, hasPremiumAccess} from '../src/services/premiumAccess';

let mockUser = 'user-a';
let mockListener: ((purchase: any) => void) | null;
const mockApi = jest.fn();
const mockBuy = jest.fn(async () => {});
const mockAvailable = jest.fn(async (): Promise<any[]> => []);
jest.mock('../src/context/AuthSessionContext', () => ({useAuthSession: () => ({session: {userId: mockUser, isGuest: false}})}));
jest.mock('../src/services/premiumApi', () => ({premiumApi: (...args: any[]) => mockApi(...args)}));
jest.mock('../src/services/playBilling', () => ({
  availablePremiumPurchases: (...args: any[]) => (mockAvailable as any)(...args),
  buyPremium: (...args: any[]) => (mockBuy as any)(...args),
  loadPremiumPlans: jest.fn(async () => []),
  listenToPlay: jest.fn(async (onPurchase: any) => { mockListener = onPurchase; return () => { mockListener = null; }; }),
}));
const response = (active = false, userId = mockUser) => ({entitlement: {
  userId, active, expiresAt: new Date(Date.now() + 86400000).toISOString(),
  serverTime: new Date().toISOString(), verifiedAt: new Date().toISOString(),
  validUntil: new Date(Date.now() + 900000).toISOString(), features: active ? ['gps_capture', 'pdf_reports'] : [],
}, accountId: 'account-hash'});
let value: ReturnType<typeof usePremium>;
function Read() { value = usePremium(); return null; }
async function mount() {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<PremiumProvider><Read /></PremiumProvider>); });
  return tree;
}
beforeEach(() => {
  jest.useFakeTimers(); mockUser = 'user-a'; mockListener = null; clearPremiumAccess();
  mockBuy.mockClear(); mockAvailable.mockReset().mockResolvedValue([]);
  mockApi.mockReset().mockImplementation(async action => action === 'catalog'
    ? {productId: 'lekhpal_premium', enabled: true} : response());
});
afterEach(() => { jest.useRealTimers(); });
const purchased = {productId: 'lekhpal_premium', purchaseState: 'purchased', purchaseToken: 'token-a'};

test('pending payments register for server reconciliation without unlocking premium', async () => {
  const tree = await mount();
  mockApi.mockClear();
  mockApi.mockResolvedValue({...response(), purchaseState: 'pending'});
  await act(async () => mockListener?.({...purchased, purchaseState: 'pending'}));
  expect(mockApi).toHaveBeenCalledWith('verify', {purchaseToken: 'token-a'});
  expect(hasPremiumAccess('gps_capture')).toBe(false);
  expect(value.message).toMatch(/pending/);
  await act(() => tree.unmount());
});

test('duplicate callbacks verify once and late results cannot unlock a different account', async () => {
  const tree = await mount();
  let complete!: (data: any) => void;
  mockApi.mockImplementation(action => action === 'verify' ? new Promise(resolve => { complete = resolve; })
    : Promise.resolve(action === 'catalog' ? {productId: 'lekhpal_premium', enabled: true} : response()));
  await act(async () => { mockListener?.(purchased); mockListener?.(purchased); });
  expect(mockApi.mock.calls.filter(call => call[0] === 'verify')).toHaveLength(1);
  mockUser = 'user-b';
  await act(async () => tree.update(<PremiumProvider><Read /></PremiumProvider>));
  await act(async () => complete({...response(true, 'user-a'), acknowledged: true}));
  expect(hasPremiumAccess('gps_capture')).toBe(false);
  await act(() => tree.unmount());
});

test('restore verifies existing purchases without starting another checkout', async () => {
  const tree = await mount();
  mockAvailable.mockResolvedValue([purchased]);
  mockApi.mockImplementation(async action => action === 'catalog'
    ? {productId: 'lekhpal_premium', enabled: true} : {...response(true), acknowledged: true});
  await act(async () => value.restore());
  expect(mockBuy).not.toHaveBeenCalled();
  expect(mockApi).toHaveBeenCalledWith('verify', {purchaseToken: 'token-a'});
  expect(value.active).toBe(true);
  expect(value.message).toBe('Premium access restored.');
  await act(() => tree.unmount());
});

test('verification outage does not report a successful restore or ask the user to pay twice', async () => {
  const tree = await mount();
  mockAvailable.mockResolvedValue([purchased]);
  mockApi.mockImplementation(async action => { if (action === 'verify') throw new Error('offline'); return response(); });
  await act(async () => value.restore());
  expect(value.message).toMatch(/do not pay again/);
  expect(value.active).toBe(false);
  expect(mockBuy).not.toHaveBeenCalled();
  await act(() => tree.unmount());
});

test('store outage leaves basic access available and restore shows a retry message without checkout', async () => {
  mockAvailable.mockRejectedValue(new Error('service-disconnected'));
  const tree = await mount();
  expect(value.active).toBe(false);
  expect(value.busy).toBe(false);
  await act(async () => value.restore());
  expect(value.message).toMatch(/Restore could not finish/);
  expect(value.busy).toBe(false);
  expect(mockBuy).not.toHaveBeenCalled();
  await act(() => tree.unmount());
});

test('missing checkout callback is recovered from owned purchases without charging twice', async () => {
 const tree=await mount();
 await act(async()=>value.purchase({productId:'lekhpal_premium',basePlanId:'prepaid-month',offerToken:'offer',price:'₹199',period:'P1M'}));
 expect(value.busy).toBe(true);
 mockAvailable.mockResolvedValue([purchased]);
 mockApi.mockImplementation(async action=>action==='catalog'?{productId:'lekhpal_premium',enabled:true}:response(action==='verify'));
 await act(async()=>{jest.advanceTimersByTime(4000);});
 expect(value.active).toBe(true);expect(value.busy).toBe(false);expect(mockBuy).toHaveBeenCalledTimes(1);
 await act(()=>tree.unmount());
});
test('checkout waiting ends with restore guidance when Play provides no result',async()=>{
 const tree=await mount();
 await act(async()=>value.purchase({productId:'lekhpal_premium',basePlanId:'prepaid-month',offerToken:'offer',price:'₹199',period:'P1M'}));
 await act(async()=>{jest.advanceTimersByTime(60000);});
 expect(value.busy).toBe(false);expect(value.message).toMatch(/do not pay again/);expect(mockBuy).toHaveBeenCalledTimes(1);
 await act(()=>tree.unmount());
});
