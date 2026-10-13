import {Platform} from 'react-native';
import {availablePremiumPurchases, buyPremium, connectPlay} from '../src/services/playBilling';
const mockInit = jest.fn();
const mockAvailable = jest.fn();
const mockRequest = jest.fn();
jest.mock('react-native-iap', () => ({
  initConnection: (...args: any[]) => mockInit(...args),
  getAvailablePurchases: (...args: any[]) => mockAvailable(...args),
  requestPurchase: (...args: any[]) => mockRequest(...args),
}));
const disconnected = Object.assign(new Error('Store service is not connected'), {code: 'service-disconnected'});
beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockInit.mockReset().mockResolvedValue(true);
  mockAvailable.mockReset().mockResolvedValue([]);
  mockRequest.mockReset().mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());
test('a later purchase query checks the native connection again instead of reusing stale success', async () => {
  await availablePremiumPurchases('lekhpal_premium');
  await availablePremiumPurchases('lekhpal_premium');
  expect(mockInit).toHaveBeenCalledTimes(2);
});
test('concurrent connection checks share initialization but a later call reconnects', async () => {
  let finish!: (value: boolean) => void;
  mockInit.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const a = connectPlay(); const b = connectPlay();
  expect(mockInit).toHaveBeenCalledTimes(1);
  finish(true); await Promise.all([a, b]);
  await connectPlay(); expect(mockInit).toHaveBeenCalledTimes(2);
});
test('a dropped read reconnects once and only returns Lekhpal purchases', async () => {
  const purchase = {productId: 'lekhpal_premium', purchaseToken: 'test-token'};
  mockAvailable.mockRejectedValueOnce(disconnected).mockResolvedValueOnce([purchase, {productId: 'other'}]);
  await expect(availablePremiumPurchases('lekhpal_premium')).resolves.toEqual([purchase]);
  expect(mockInit).toHaveBeenCalledTimes(2); expect(mockAvailable).toHaveBeenCalledTimes(2);
});
test('a persistent disconnect stops after one retry and is not treated as no purchases', async () => {
  mockAvailable.mockRejectedValue(new Error(JSON.stringify({code: 'service-disconnected'})));
  await expect(availablePremiumPurchases('lekhpal_premium')).rejects.toThrow('service-disconnected');
  expect(mockAvailable).toHaveBeenCalledTimes(2);
});
test('unrelated failures are not retried and failed init can recover on the next request', async () => {
  mockInit.mockResolvedValueOnce(false);
  await expect(connectPlay()).rejects.toThrow('could not connect');
  mockAvailable.mockRejectedValue(new Error('billing unavailable'));
  await expect(availablePremiumPurchases('lekhpal_premium')).rejects.toThrow('billing unavailable');
  expect(mockAvailable).toHaveBeenCalledTimes(1);
});
test('checkout is not automatically retried after a disconnect', async () => {
  mockRequest.mockRejectedValue(disconnected);
  await expect(buyPremium({productId: 'lekhpal_premium', basePlanId: 'prepaid-month', offerToken: 'offer', price: '₹199', period: 'P1M'}, 'account')).rejects.toThrow();
  expect(mockRequest).toHaveBeenCalledTimes(1);
});
