import type { DeskCalculatorId } from './lekhpalCalculator';
export const PREMIUM_CALCULATORS: readonly DeskCalculatorId[] = [
  'share-calculator',
  'registry-estimate',
  'circle-rate-compare',
  'crop-loss',
  'recovery-balance',
];
export const isPremiumCalculator = (id: string) =>
  (PREMIUM_CALCULATORS as readonly string[]).includes(id);
export const calculatorSamples: Partial<
  Record<DeskCalculatorId, [string, string]>
> = {
  'share-calculator': [
    'Example: 1.2 ha split 1/3 and 2/3 → 0.4 ha and 0.8 ha.',
    'उदाहरण: 1.2 हे. में 1/3 और 2/3 अंश → 0.4 हे. और 0.8 हे.।',
  ],
  'registry-estimate': [
    'Example: ₹10 lakh value + entered 5% fee → ₹10.5 lakh total. Sample rate only.',
    'उदाहरण: ₹10 लाख मूल्य + दर्ज 5% शुल्क → ₹10.5 लाख कुल। दर केवल उदाहरण है।',
  ],
  'circle-rate-compare': [
    'Example: 100 m² at ₹2,000 vs ₹2,500/m² → ₹50,000 difference.',
    'उदाहरण: 100 वर्ग मी. पर ₹2,000 और ₹2,500 की दर → ₹50,000 अंतर।',
  ],
  'crop-loss': [
    'Example: 1 ha × 5 quintals/ha shortfall × ₹2,000/quintal → ₹10,000 estimated loss.',
    'उदाहरण: 1 हे. × 5 क्विंटल/हे. कमी × ₹2,000/क्विंटल → ₹10,000 अनुमानित हानि।',
  ],
  'recovery-balance': [
    'Example: ₹10,000 demand + ₹2,000 arrears − ₹5,000 collected → ₹7,000 due.',
    'उदाहरण: ₹10,000 मांग + ₹2,000 बकाया − ₹5,000 वसूली → ₹7,000 शेष।',
  ],
};
