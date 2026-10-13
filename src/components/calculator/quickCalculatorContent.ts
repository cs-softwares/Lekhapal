import type { QuickCalculatorId } from '../../domain/quickCalculators';
type Copy = [string, string];
type Choice = { id: string; title: Copy };
export type QuickField = {
  key: string;
  label: Copy;
  text?: boolean;
  optional?: boolean;
  placeholder?: string;
  date?: boolean;
  choices?: Choice[];
};
type Definition = {
  id: QuickCalculatorId;
  title: Copy;
  description: Copy;
  icon: string;
  note: Copy;
  fields: QuickField[];
};
const numeric = (
  key: string,
  en: string,
  hi: string,
  optional = false,
): QuickField => ({ key, label: [en, hi], optional });
const choice = (
  key: string,
  en: string,
  hi: string,
  items: Array<[string, string, string]>,
): QuickField => ({
  key,
  label: [en, hi],
  choices: items.map(([id, e, h]) => ({ id, title: [e, h] })),
});
const date = (key: string, en: string, hi: string): QuickField => ({
  key,
  label: [en, hi],
  text: true,
  placeholder: 'DD/MM/YYYY',
  date: true,
});
const quantity = [
  numeric('quantityArea', 'Field area', 'खेत का रकबा'),
  choice('quantityUnit', 'Field area unit', 'खेत की इकाई', [
    ['hectare', 'Hectare', 'हेक्टेयर'],
    ['acre', 'Acre', 'एकड़'],
    ['sqm', 'm²', 'वर्ग मीटर'],
  ]),
  choice('rateUnit', 'Entered rate is per', 'दर्ज दर प्रति', [
    ['acre', 'Acre', 'एकड़'],
    ['hectare', 'Hectare', 'हेक्टेयर'],
  ]),
];
const lengthUnits: Array<[string, string, string]> = [
  ['mm', 'mm', 'मिमी'],
  ['cm', 'cm', 'सेमी'],
  ['meter', 'Metre', 'मीटर'],
  ['km', 'Kilometre', 'किमी'],
  ['inch', 'Inch', 'इंच'],
  ['feet', 'Feet', 'फुट'],
  ['yard', 'Yard / Gaj', 'गज'],
  ['mile', 'Mile', 'मील'],
];
export const quickCalculatorTools: Definition[] = [
  {
    id: 'scientific-calculator',
    title: ['Quick & scientific maths', 'सामान्य और वैज्ञानिक गणना'],
    description: [
      'Calculate a complete expression in one step',
      'एक बार में पूरी गणना करें',
    ],
    icon: 'calculator-variant-outline',
    note: [
      'Use ×, ÷, +, −, parentheses, ^, %, !, sqrt(), sin(), cos(), tan(), log(), ln(), pi and e. % means divide by 100; sin/cos/tan use the selected angle unit.',
      '×, ÷, +, −, कोष्ठक, ^, %, !, sqrt(), sin(), cos(), tan(), log(), ln(), pi और e प्रयोग करें। % का अर्थ 100 से भाग है। कोण की चुनी इकाई लागू होगी।',
    ],
    fields: [
      {
        key: 'expression',
        label: ['Expression', 'गणना'],
        text: true,
        placeholder: '(125 + 75) × 3',
      },
      choice('angle', 'Angles', 'कोण', [
        ['degree', 'Degrees', 'डिग्री'],
        ['radian', 'Radians', 'रेडियन'],
      ]),
    ],
  },
  {
    id: 'percentage-calculator',
    title: ['Percentage', 'प्रतिशत'],
    description: [
      'Percentage amount, addition and deduction',
      'प्रतिशत राशि, जोड़ और कटौती',
    ],
    icon: 'percent-outline',
    note: [
      'Value and percentage must be non-negative. Addition and deduction use the same starting value.',
      'मान और प्रतिशत ऋणात्मक न हों। जोड़ और कटौती एक ही मूल मान पर होती है।',
    ],
    fields: [
      numeric('value', 'Value', 'मान'),
      numeric('percentage', 'Percentage %', 'प्रतिशत %'),
    ],
  },
  {
    id: 'date-difference',
    title: ['Date difference', 'तारीख का अंतर'],
    description: [
      'Elapsed and inclusive calendar-day counts',
      'बीते दिन और दोनों तारीखों सहित दिन',
    ],
    icon: 'calendar-range',
    note: [
      'Choose dates or enter DD/MM/YYYY (1900–2199). Months are approximate: days ÷ 30.4375. Calendar days include weekends; this does not determine a legal deadline.',
      'तारीख चुनें या DD/MM/YYYY (1900–2199) भरें। महीने अनुमानित हैं: दिन ÷ 30.4375। दिनों में सप्ताहांत शामिल है; यह कानूनी समय सीमा तय नहीं करता।',
    ],
    fields: [
      date('startDate', 'Start date', 'शुरू की तारीख'),
      date('endDate', 'End date', 'अंतिम तारीख'),
    ],
  },
  {
    id: 'interest-calculator',
    title: ['Interest', 'ब्याज'],
    description: [
      'Simple or monthly, quarterly and yearly compound interest',
      'साधारण या मासिक, तिमाही और वार्षिक चक्रवृद्धि ब्याज',
    ],
    icon: 'cash',
    note: [
      'Uses only your entered annual rate and years. No fees, payments, penalties or lender rules are assumed.',
      'केवल दर्ज वार्षिक दर और वर्ष लागू हैं। शुल्क, भुगतान, जुर्माना या ऋणदाता के नियम अपने आप नहीं जोड़े जाते।',
    ],
    fields: [
      numeric('principal', 'Principal ₹', 'मूलधन ₹'),
      numeric('annualRate', 'Annual rate %', 'वार्षिक दर %'),
      numeric('years', 'Time in years', 'समय (वर्ष)'),
      choice('interestType', 'Interest type', 'ब्याज का प्रकार', [
        ['simple', 'Simple', 'साधारण'],
        ['monthly', 'Monthly compound', 'मासिक चक्रवृद्धि'],
        ['quarterly', 'Quarterly compound', 'तिमाही चक्रवृद्धि'],
        ['yearly', 'Yearly compound', 'वार्षिक चक्रवृद्धि'],
      ]),
    ],
  },
  {
    id: 'loan-emi',
    title: ['Loan EMI', 'ऋण की किस्त'],
    description: [
      'Monthly instalment, total payment and interest',
      'मासिक किस्त, कुल भुगतान और ब्याज',
    ],
    icon: 'bank-outline',
    note: [
      'Fixed-rate monthly estimate with end-of-month payments, no fees or advance payments. Enter 1–1200 whole months; zero interest is supported.',
      'स्थिर दर पर मासांत किस्त का अनुमान; शुल्क और अग्रिम भुगतान शामिल नहीं हैं। 1–1200 पूरे महीने भरें; शून्य ब्याज भी मान्य है।',
    ],
    fields: [
      numeric('principal', 'Principal ₹', 'मूलधन ₹'),
      numeric('annualRate', 'Annual rate %', 'वार्षिक दर %'),
      numeric('months', 'Time in months', 'समय (महीने)'),
    ],
  },
  {
    id: 'number-words',
    title: ['Amount in words', 'राशि को शब्दों में'],
    description: [
      'Indian lakh/crore wording for notes and applications',
      'नोट और आवेदन के लिए लाख/करोड़ में शब्द',
    ],
    icon: 'format-letter-case',
    note: [
      'English wording using Indian groups. Enter rupees with at most two paise decimals; commas are not needed.',
      'भारतीय संख्या पद्धति में अंग्रेजी शब्द। रुपये और अधिकतम दो दशमलव में पैसे भरें; कॉमा जरूरी नहीं है।',
    ],
    fields: [numeric('wordsValue', 'Amount ₹', 'राशि ₹')],
  },
  {
    id: 'length-converter',
    title: ['Length conversion', 'लंबाई की इकाई बदलें'],
    description: [
      'Metres, feet, yards, inches and metric units',
      'मीटर, फुट, गज, इंच और मीट्रिक इकाइयां',
    ],
    icon: 'ruler',
    note: [
      'Gaj here means one international yard (0.9144 metre). Check separately if your record uses a different local measure.',
      'यहां गज का अर्थ एक अंतरराष्ट्रीय यार्ड (0.9144 मीटर) है। अभिलेख में अन्य स्थानीय मान हो तो अलग से जांचें।',
    ],
    fields: [
      numeric('lengthValue', 'Length to convert', 'बदलने वाली लंबाई'),
      choice('lengthFrom', 'From length unit', 'इस लंबाई इकाई से', lengthUnits),
      choice('lengthTo', 'To length unit', 'इस लंबाई इकाई में', lengthUnits),
    ],
  },
  {
    id: 'seed-rate',
    title: ['Seed quantity', 'बीज की मात्रा'],
    description: ['Field area × your entered seed rate', 'रकबा × दर्ज बीज दर'],
    icon: 'seed-outline',
    note: [
      'Enter the crop-specific rate you have verified. This calculator scales quantities; it does not recommend a seed rate.',
      'जांची हुई फसल-विशेष दर भरें। यह मात्रा की गणना है, बीज दर की सिफारिश नहीं।',
    ],
    fields: [
      ...quantity,
      numeric(
        'quantityRate',
        'Seed rate kg per selected unit',
        'बीज दर किग्रा प्रति चुनी इकाई',
      ),
    ],
  },
  {
    id: 'fertilizer-quantity',
    title: ['Fertilizer quantity', 'उर्वरक की मात्रा'],
    description: [
      'Scale an entered fertilizer rate to the field area',
      'दर्ज उर्वरक दर से खेत की मात्रा निकालें',
    ],
    icon: 'sack',
    note: [
      'Use the verified product/application rate. No nutrient recommendation or product substitution is inferred.',
      'जांची हुई उत्पाद/प्रयोग दर भरें। पोषक तत्व की सिफारिश या उत्पाद बदलने का अनुमान नहीं लगाया जाता।',
    ],
    fields: [
      ...quantity,
      numeric(
        'quantityRate',
        'Fertilizer kg per selected unit',
        'उर्वरक किग्रा प्रति चुनी इकाई',
      ),
    ],
  },
  {
    id: 'spray-dose',
    title: ['Spray quantity', 'छिड़काव की मात्रा'],
    description: [
      'Tank loads and proportional quantity for the final partial tank',
      'टंकी की संख्या और अंतिम अधूरी टंकी की मात्रा',
    ],
    icon: 'spray',
    note: [
      'Enter a verified label dose per full tank. ml and grams are kept distinct; the app does not select products or prescribe doses.',
      'पूरी टंकी की जांची हुई लेबल दर भरें। मिलीलीटर और ग्राम अलग हैं; ऐप उत्पाद या खुराक नहीं चुनता।',
    ],
    fields: [
      numeric('tank', 'Tank capacity L', 'टंकी क्षमता लीटर'),
      numeric('dose', 'Dose per full tank', 'पूरी टंकी की मात्रा'),
      choice('doseUnit', 'Dose unit', 'मात्रा की इकाई', [
        ['ml', 'ml', 'मिलीलीटर'],
        ['g', 'gram', 'ग्राम'],
      ]),
      numeric('water', 'Total water L', 'कुल पानी लीटर'),
    ],
  },
  {
    id: 'yield-estimate',
    title: ['Yield estimate', 'उपज का अनुमान'],
    description: [
      'Production and optional value from an entered yield rate',
      'दर्ज उपज दर से उत्पादन और वैकल्पिक मूल्य',
    ],
    icon: 'sprout-outline',
    note: [
      'Yield is entered in quintals per selected area unit. This is a planning estimate, not a guarantee or relief assessment.',
      'उपज क्विंटल प्रति चुनी रकबा इकाई में भरें। यह योजना का अनुमान है, गारंटी या राहत मूल्यांकन नहीं।',
    ],
    fields: [
      ...quantity,
      numeric(
        'yieldRate',
        'Yield q per selected unit',
        'उपज क्विंटल प्रति चुनी इकाई',
      ),
      numeric('yieldPrice', 'Price ₹ per quintal', 'दर ₹ प्रति क्विंटल', true),
    ],
  },
  {
    id: 'irrigation-date',
    title: ['Irrigation interval', 'सिंचाई का अंतराल'],
    description: [
      'Next date from the interval you choose',
      'आपके चुने अंतराल से अगली तारीख',
    ],
    icon: 'calendar-clock',
    note: [
      'Adds your entered interval only. Check soil, crop and weather before irrigating; no reminder is scheduled automatically.',
      'केवल दर्ज अंतराल जोड़ा जाता है। सिंचाई से पहले मिट्टी, फसल और मौसम देखें; कोई रिमाइंडर अपने आप नहीं बनता।',
    ],
    fields: [
      date('startDate', 'Last irrigation date', 'पिछली सिंचाई की तारीख'),
      numeric('interval', 'Interval in days', 'अंतराल (दिन)'),
    ],
  },
];
export const quickResultLabels: Record<string, Copy> = {
  answer: ['Result', 'परिणाम'],
  percentageAmount: ['Percentage amount', 'प्रतिशत का मान'],
  afterAddition: ['After addition', 'जोड़ने के बाद'],
  afterDeduction: ['After deduction', 'घटाने के बाद'],
  elapsedDays: ['Elapsed days', 'बीते दिन'],
  inclusiveDays: ['Including both dates', 'दोनों तारीखों सहित'],
  elapsedWeeks: ['Weeks', 'सप्ताह'],
  approximateMonths: ['Months (approx.)', 'महीने (लगभग)'],
  nextDate: ['Next date', 'अगली तारीख'],
  intervalDays: ['Interval', 'अंतराल'],
  interestAmount: ['Interest', 'ब्याज'],
  principalAmount: ['Principal', 'मूलधन'],
  totalPayable: ['Total payable', 'कुल भुगतान'],
  monthlyEmi: ['Monthly EMI', 'मासिक किस्त'],
  amountInWords: ['Amount in English words', 'राशि अंग्रेजी शब्दों में'],
  convertedLength: ['Converted length', 'बदली हुई लंबाई'],
  totalDose: ['Total dose quantity', 'कुल मात्रा'],
  tankLoads: ['Equivalent full tanks', 'पूरी टंकियों के बराबर'],
  wholeTanks: ['Completely filled tanks', 'पूरी भरी टंकियां'],
  lastTankWater: ['Final partial tank water', 'अंतिम अधूरी टंकी का पानी'],
  lastTankDose: ['Final partial tank dose', 'अंतिम अधूरी टंकी की मात्रा'],
  estimatedProduce: ['Estimated production', 'अनुमानित उत्पादन'],
  estimatedValue: ['Estimated crop value', 'अनुमानित फसल मूल्य'],
  seedQuantity: ['Seed required', 'आवश्यक बीज'],
  fertilizerQuantity: ['Fertilizer required', 'आवश्यक उर्वरक'],
  ...Object.fromEntries(
    lengthUnits.map(([id, en, hi]) => ['length_' + id, [en, hi] as Copy]),
  ),
};
