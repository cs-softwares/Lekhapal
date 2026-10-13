import { farmerRegistryHelpPage } from '../src/utils/farmerRegistryHelp';

test('only the published public manual can be passed to the PDF viewer', () => {
  for (const url of [
    'https://upfr.agristack.gov.in/farmer-registry-up/private/record.pdf',
    'https://upfr.agristack.gov.in/farmer-registry-up/assets/pdf/User_Manual_TRNG_Hindi.pdf?token=private',
    'https://upfr.agristack.gov.in.evil.test/farmer-registry-up/assets/pdf/User_Manual_TRNG_Hindi.pdf',
    'http://upfr.agristack.gov.in/farmer-registry-up/assets/pdf/User_Manual_TRNG_Hindi.pdf',
    'https://name:password@play.google.com/store/apps/details?id=com.agristack.up.farmerregistry',
    'https://play.google.com/store/apps/details?id=another.app',
    'intent://example',
  ])
    expect(farmerRegistryHelpPage(url, 'en')).toBeNull();
});
