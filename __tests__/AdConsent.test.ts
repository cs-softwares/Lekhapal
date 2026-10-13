const mockGather = jest.fn();
const mockInit = jest.fn();
const mockPrivacy = jest.fn();
const mockInfo = jest.fn();
jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({ initialize: mockInit }),
  AdsConsent: {
    gatherConsent: mockGather,
    showPrivacyOptionsForm: mockPrivacy,
    getConsentInfo: mockInfo,
  },
  AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED' },
}));
let consent: typeof import('../src/services/adConsent');
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockInit.mockResolvedValue([]);
  consent = require('../src/services/adConsent');
});
test('concurrent formats share one consent flow and one initialization', async () => {
  mockGather.mockResolvedValue({
    canRequestAds: true,
    privacyOptionsRequirementStatus: 'REQUIRED',
  });
  await Promise.all([
    consent.prepareAds(),
    consent.prepareAds(),
    consent.prepareAds(),
  ]);
  expect(mockGather).toHaveBeenCalledTimes(1);
  expect(mockInit).toHaveBeenCalledTimes(1);
  expect(consent.adConsentSnapshot().ready).toBe(true);
});
test('failed or unresolved consent never initializes the ads SDK', async () => {
  mockGather.mockRejectedValueOnce(new Error('network'));
  await consent.prepareAds();
  expect(consent.adConsentSnapshot().ready).toBe(false);
  expect(mockInit).not.toHaveBeenCalled();
  mockGather.mockResolvedValueOnce({
    canRequestAds: false,
    privacyOptionsRequirementStatus: 'REQUIRED',
  });
  await consent.prepareAds();
  expect(mockInit).not.toHaveBeenCalled();
  expect(consent.adConsentSnapshot().privacy).toBe(true);
});
test('opening privacy options pauses all formats immediately, including during a form error', async () => {
  mockGather.mockResolvedValue({
    canRequestAds: true,
    privacyOptionsRequirementStatus: 'REQUIRED',
  });
  await consent.prepareAds();
  let reject: any;
  mockPrivacy.mockImplementationOnce(
    () =>
      new Promise((_, r) => {
        reject = r;
      }),
  );
  const updating = consent.openAdPrivacy();
  expect(consent.adConsentSnapshot().ready).toBe(false);
  expect(consent.adConsentSnapshot().revision).toBe(1);
  reject(new Error('form unavailable'));
  await updating;
  expect(consent.adConsentSnapshot().ready).toBe(false);
  mockPrivacy.mockResolvedValueOnce(undefined);
  mockInfo.mockResolvedValue({
    canRequestAds: true,
    privacyOptionsRequirementStatus: 'REQUIRED',
  });
  await consent.openAdPrivacy();
  expect(consent.adConsentSnapshot().ready).toBe(true);
  expect(mockInit).toHaveBeenCalledTimes(1);
});
