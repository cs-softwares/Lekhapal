import type { DeskCalculatorId } from '../../domain/lekhpalCalculator';
import type { QuickCalculatorId } from '../../domain/quickCalculators';
import {
  quickCalculatorTools,
  quickResultLabels,
} from './quickCalculatorContent';
export type Copy = [string, string];
export const calculatorTools: Array<{
  id: DeskCalculatorId;
  title: Copy;
  description: Copy;
  icon: string;
}> = [
  ...quickCalculatorTools,
  {
    id: 'share-calculator',
    title: ['Khatauni shares', 'खतौनी अंश'],
    description: [
      'Divide recorded area among co-owners',
      'सहखातेदारों के अंश से रकबा निकालें',
    ],
    icon: 'account-group-outline',
  },
  {
    id: 'fraction-hissa-calculator',
    title: ['Fraction & Hissa', 'भिन्न और हिस्सा'],
    description: [
      'Add, subtract or split an exact share',
      'अंश जोड़ें, घटाएं या उसका हिस्सा निकालें',
    ],
    icon: 'math-integral-box',
  },
  {
    id: 'registry-estimate',
    title: ['Valuation & fees', 'मूल्यांकन और शुल्क'],
    description: [
      'Land value with your entered fee rates',
      'दर्ज दरों से भूमि मूल्य और शुल्क',
    ],
    icon: 'file-document-edit-outline',
  },
  {
    id: 'circle-rate-compare',
    title: ['Compare rates', 'दर की तुलना'],
    description: [
      'See how a rate change affects land value',
      'दर बदलने पर भूमि मूल्य का अंतर',
    ],
    icon: 'compare-horizontal',
  },
  {
    id: 'rate-finder',
    title: ['Check a land rate', 'भूमि दर जांचें'],
    description: [
      'Separate charges from the per-unit price',
      'कुल रकम से प्रति इकाई शुद्ध दर निकालें',
    ],
    icon: 'tag-outline',
  },
  {
    id: 'crop-loss',
    title: ['Crop-loss worksheet', 'फसल हानि गणना'],
    description: [
      'Yield shortfall and estimated value loss',
      'उपज में कमी और अनुमानित मूल्य हानि',
    ],
    icon: 'sprout-outline',
  },
  {
    id: 'recovery-balance',
    title: ['Demand & recovery', 'मांग और वसूली'],
    description: [
      'Current demand, arrears and balance',
      'चालू मांग, बकाया और शेष राशि',
    ],
    icon: 'cash-check',
  },
];
export const labels: Record<string, Copy> = {
  ...quickResultLabels,
  area: ['Recorded area', 'दर्ज रकबा'],
  fractionA: ['Share A', 'अंश A'],
  fractionB: ['Share B', 'अंश B'],
  rate: ['Rate per unit', 'प्रति इकाई दर'],
  rateB: ['Rate B per unit', 'प्रति इकाई दर B'],
  stamp: ['Stamp duty %', 'स्टाम्प शुल्क %'],
  registration: ['Registration fee %', 'पंजीकरण शुल्क %'],
  assessed: ['Fee assessment value ₹', 'शुल्क का आधार मूल्य ₹'],
  extra: ['Other charges ₹', 'अन्य शुल्क ₹'],
  value: ['Total amount ₹', 'कुल रकम ₹'],
  normalYield: ['Expected yield · q/ha', 'अपेक्षित उपज · क्विंटल/हे.'],
  actualYield: ['Actual yield · q/ha', 'वास्तविक उपज · क्विंटल/हे.'],
  price: ['Crop price · ₹/quintal', 'फसल दर · ₹/क्विंटल'],
  demand: ['Current demand ₹', 'चालू मांग ₹'],
  arrears: ['Opening arrears ₹', 'प्रारंभिक बकाया ₹'],
  paid: ['Amount collected ₹', 'वसूली राशि ₹'],
  waiver: ['Approved adjustment ₹', 'स्वीकृत समायोजन ₹'],
  village: ['Village', 'गांव'],
  gata: ['Gata / Khasra no.', 'गाटा / खसरा नं.'],
  reference: ['Reference / crop name', 'संदर्भ / फसल का नाम'],
  notes: ['Field note', 'फील्ड नोट'],
  rateSource: ['Rate source / date', 'दर का स्रोत / दिनांक'],
  allocatedArea: ['Allocated area', 'आवंटित रकबा'],
  totalArea: ['Total area', 'कुल रकबा'],
  remainingArea: ['Unallocated area', 'शेष रकबा'],
  allocatedShare: ['Recorded shares', 'दर्ज अंश'],
  resultShare: ['Resulting share', 'परिणामी अंश'],
  sharePercent: ['Share percentage', 'अंश प्रतिशत'],
  shareArea: ['Area of this share', 'अंश का रकबा'],
  totalEstimate: ['Estimated total', 'अनुमानित कुल'],
  landValue: ['Land value', 'भूमि मूल्य'],
  feeBasis: ['Basis for fees', 'शुल्क का आधार'],
  stampFee: ['Stamp duty', 'स्टाम्प शुल्क'],
  registrationFee: ['Registration fee', 'पंजीकरण शुल्क'],
  otherFees: ['Other charges', 'अन्य शुल्क'],
  totalFees: ['Total entered fees', 'दर्ज शुल्क का कुल'],
  valueDifference: ['Difference · B − A', 'अंतर · B − A'],
  valueA: ['Value at rate A', 'दर A पर मूल्य'],
  valueB: ['Value at rate B', 'दर B पर मूल्य'],
  rateDifference: ['Rate difference', 'दर का अंतर'],
  changePercent: ['Change from A', 'A से परिवर्तन'],
  netRate: ['Net rate per unit', 'प्रति इकाई शुद्ध दर'],
  grossRate: ['Gross rate per unit', 'प्रति इकाई सकल दर'],
  chargesPerUnit: ['Charges per unit', 'प्रति इकाई शुल्क'],
  netValue: ['Value excluding charges', 'शुल्क रहित मूल्य'],
  cropValueLoss: ['Estimated crop value loss', 'अनुमानित फसल मूल्य हानि'],
  yieldLoss: ['Yield shortfall', 'उपज में कमी'],
  lostProduce: ['Lost produce', 'उपज की हानि'],
  expectedProduce: ['Expected produce', 'अपेक्षित उपज'],
  actualProduce: ['Actual produce', 'वास्तविक उपज'],
  balanceDue: ['Balance to recover', 'वसूली के लिए शेष'],
  creditBalance: ['Excess collection', 'अतिरिक्त वसूली'],
  totalDemand: ['Demand + arrears', 'मांग + बकाया'],
  approvedAdjustment: ['Approved adjustment', 'स्वीकृत समायोजन'],
  netDemand: ['Net demand', 'शुद्ध मांग'],
  collected: ['Collected', 'वसूली'],
  recoveredPercent: ['Recovered', 'वसूली प्रतिशत'],
};
export const errors: Record<string, Copy> = {
  date: [
    'Enter a real date as DD/MM/YYYY between 1900 and 2199.',
    '1900 से 2199 के बीच सही तारीख DD/MM/YYYY में भरें।',
  ],
  months: ['Enter 1–1200 whole months.', '1–1200 पूरे महीने भरें।'],
  expression: [
    'Check the expression, parentheses and function inputs. Division by zero and undefined results are not allowed.',
    'गणना, कोष्ठक और फंक्शन के मान जांचें। शून्य से भाग और अपरिभाषित परिणाम मान्य नहीं हैं।',
  ],
  incomplete: [
    'Enter the required values to calculate.',
    'गणना के लिए आवश्यक विवरण भरें।',
  ],
  invalid: [
    'Check the numbers. Use valid, non-negative values and percentages up to 100.',
    'संख्याएं जांचें। मान ऋणात्मक न हों और प्रतिशत 100 तक हो।',
  ],
  fraction: [
    'Enter a valid share, such as 1/3, 0.25 or 25 in % mode. A denominator cannot be zero.',
    'सही अंश लिखें, जैसे 1/3, 0.25 या % मोड में 25। हर शून्य नहीं हो सकता।',
  ],
  overshare: [
    'The combined share exceeds 100%. Check the recorded shares.',
    'कुल अंश 100% से अधिक है। दर्ज अंश जांचें।',
  ],
  negative: [
    'The resulting share is negative. Check the order of the shares.',
    'परिणामी अंश ऋणात्मक है। अंशों का क्रम जांचें।',
  ],
  charges: [
    'Included charges cannot exceed the total amount.',
    'शामिल शुल्क कुल रकम से अधिक नहीं हो सकते।',
  ],
  yield: [
    'Actual yield cannot exceed expected yield in a loss calculation.',
    'हानि की गणना में वास्तविक उपज अपेक्षित उपज से अधिक नहीं हो सकती।',
  ],
  waiver: [
    'The adjustment cannot exceed demand plus arrears.',
    'समायोजन मांग और बकाया के कुल से अधिक नहीं हो सकता।',
  ],
  unit: [
    'Choose the area unit before calculating.',
    'गणना से पहले रकबे की इकाई चुनें।',
  ],
};
export const unitLabels: Record<string, Copy> = {
  hectare: ['ha', 'हे.'],
  sqm: ['m²', 'वर्ग मी.'],
  acre: ['acre', 'एकड़'],
  bigha: ['bigha', 'बीघा'],
};
export const toolNotes: Record<DeskCalculatorId, Copy> = {
  ...(Object.fromEntries(
    quickCalculatorTools.map(tool => [tool.id, tool.note]),
  ) as Record<QuickCalculatorId, Copy>),
  'share-calculator': [
    'Use shares from the record. This worksheet does not decide ownership or inheritance.',
    'अभिलेख में दर्ज अंश भरें। यह गणना स्वामित्व या उत्तराधिकार तय नहीं करती।',
  ],
  'fraction-hissa-calculator': [
    'Multiply to find a share within a share. Optional area stays in the selected unit.',
    'अंश के भीतर हिस्सा निकालने के लिए गुणा करें। वैकल्पिक रकबा चुनी इकाई में रहेगा।',
  ],
  'registry-estimate': [
    'Enter applicable rates yourself. Blank fee fields are excluded. This is an estimate; verify the final assessment on the official portal.',
    'लागू दरें स्वयं भरें। खाली शुल्क शामिल नहीं हैं। यह अनुमान है; अंतिम मूल्यांकन आधिकारिक पोर्टल पर जांचें।',
  ],
  'circle-rate-compare': [
    'Both rates must use the selected area unit. A negative difference means the value decreased.',
    'दोनों दरें चुनी हुई इकाई की हों। ऋणात्मक अंतर मूल्य में कमी दर्शाता है।',
  ],
  'rate-finder': [
    'Only deduct charges already included in the total amount.',
    'केवल वे शुल्क घटाएं जो कुल रकम में पहले से शामिल हैं।',
  ],
  'crop-loss': [
    'Agricultural value-loss estimate, not government relief eligibility or compensation. Yield inputs are always quintals per hectare.',
    'यह फसल मूल्य हानि का अनुमान है, सरकारी राहत पात्रता या मुआवजा नहीं। उपज हमेशा क्विंटल प्रति हेक्टेयर में भरें।',
  ],
  'recovery-balance': [
    'Use the approved demand and adjustment from your record. No interest or penalty is added automatically.',
    'अभिलेख की स्वीकृत मांग और समायोजन भरें। ब्याज या जुर्माना अपने आप नहीं जोड़ा जाता।',
  ],
};
