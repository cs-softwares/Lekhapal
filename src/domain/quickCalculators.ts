import type { DeskResult, ResultLine } from './lekhpalCalculator';
import { scientificResult } from './scientificCalculator';
export const QUICK_CALCULATOR_IDS = [
  'scientific-calculator',
  'percentage-calculator',
  'date-difference',
  'interest-calculator',
  'loan-emi',
  'number-words',
  'length-converter',
  'seed-rate',
  'fertilizer-quantity',
  'spray-dose',
  'yield-estimate',
  'irrigation-date',
] as const;
export type QuickCalculatorId = (typeof QUICK_CALCULATOR_IDS)[number];
export const isQuickCalculator = (id: string): id is QuickCalculatorId =>
  (QUICK_CALCULATOR_IDS as readonly string[]).includes(id);
export const CONVERSION_LENGTHS = {
  mm: 0.001,
  cm: 0.01,
  meter: 1,
  km: 1000,
  inch: 0.0254,
  feet: 0.3048,
  yard: 0.9144,
  mile: 1609.344,
};
export const QUICK_DEFAULTS = {
  expression: '',
  angle: 'degree',
  value: '',
  percentage: '',
  startDate: '',
  endDate: '',
  principal: '',
  annualRate: '',
  years: '',
  interestType: 'simple',
  months: '',
  wordsValue: '',
  lengthValue: '',
  lengthFrom: 'meter',
  lengthTo: 'feet',
  quantityArea: '',
  quantityUnit: 'hectare',
  quantityRate: '',
  rateUnit: 'acre',
  tank: '',
  dose: '',
  doseUnit: 'ml',
  water: '',
  yieldRate: '',
  yieldPrice: '',
  interval: '',
};
const normal = (s: string) =>
  s.trim().replace(/[०-९]/g, d => String(d.charCodeAt(0) - 0x0966));
function number(s: string) {
  const v = normal(s);
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(v)) throw Error('invalid');
  const n = Number(v);
  if (!Number.isFinite(n) || n > 1e14) throw Error('invalid');
  return n;
}
/** UTC calendar arithmetic prevents daylight-saving offsets changing day counts. */
export function calendarDay(s: string) {
  const m = normal(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) throw Error('date');
  const [, d, mo, y] = m.map(Number);
  if (y < 1900 || y > 2199) throw Error('date');
  const time = Date.UTC(y, mo - 1, d),
    date = new Date(time);
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d
  )
    throw Error('date');
  return time / 86400000;
}
const wordsUnder20 = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
function words(n: number): string {
  if (n < 20) return wordsUnder20[n];
  if (n < 100)
    return (
      [
        '',
        '',
        'Twenty',
        'Thirty',
        'Forty',
        'Fifty',
        'Sixty',
        'Seventy',
        'Eighty',
        'Ninety',
      ][Math.floor(n / 10)] + (n % 10 ? ' ' + words(n % 10) : '')
    );
  for (const [size, label] of [
    [10000000, 'Crore'],
    [100000, 'Lakh'],
    [1000, 'Thousand'],
    [100, 'Hundred'],
  ] as const)
    if (n >= size)
      return (
        words(Math.floor(n / size)) +
        ' ' +
        label +
        (n % size ? ' ' + words(n % size) : '')
      );
  throw Error('invalid');
}
export function indianAmountWords(raw: string) {
  const s = normal(raw);
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(s)) throw Error('invalid');
  const [whole, part = ''] = s.split('.');
  const paise = Number(part.padEnd(2, '0'));
  return (
    words(Number(whole)) +
    ' Rupees' +
    (paise ? ' and ' + words(paise) + ' Paise' : '') +
    ' Only'
  );
}
const line = (
  key: string,
  value: number,
  unit: ResultLine['unit'] = 'number',
  suffix?: string,
): ResultLine => ({ key, value, unit, suffix });
export function calculateQuick(
  id: QuickCalculatorId,
  values: Record<string, string>,
): DeskResult {
  const v = { ...QUICK_DEFAULTS, ...values };
  const read = (key: string, positive = false) => {
    if (!v[key as keyof typeof v]?.trim()) throw Error('incomplete');
    const n = number(v[key as keyof typeof v]);
    if (positive && n <= 0) throw Error('invalid');
    return n;
  };
  const result = (
    primary: ResultLine,
    lines: ResultLine[],
    formula: string,
  ): DeskResult => {
    if ([primary, ...lines].some(l => !Number.isFinite(l.value)))
      throw Error('invalid');
    return { ok: true, primary, lines, formula };
  };
  try {
    if (id === 'scientific-calculator') {
      if (!v.expression.trim()) throw Error('incomplete');
      if (!['degree', 'radian'].includes(v.angle)) throw Error('invalid');
      return result(
        line(
          'answer',
          scientificResult(v.expression, v.angle as 'degree' | 'radian'),
        ),
        [],
        v.expression,
      );
    }
    if (id === 'percentage-calculator') {
      const value = read('value'),
        percent = read('percentage'),
        amount = (value * percent) / 100;
      return result(
        line('percentageAmount', amount),
        [
          line('afterAddition', value + amount),
          line('afterDeduction', value - amount),
        ],
        'Value × percentage ÷ 100',
      );
    }
    if (id === 'date-difference' || id === 'irrigation-date') {
      if (
        !v.startDate.trim() ||
        (id === 'date-difference' && !v.endDate.trim())
      )
        throw Error('incomplete');
      const start = calendarDay(v.startDate);
      if (id === 'date-difference') {
        const days = Math.abs(calendarDay(v.endDate) - start);
        return result(
          line('elapsedDays', days, 'days'),
          [
            line('inclusiveDays', days + 1, 'days'),
            line('elapsedWeeks', days / 7),
            line('approximateMonths', days / 30.4375),
          ],
          '|End date − start date|; inclusive = elapsed + 1',
        );
      }
      const interval = read('interval', true);
      if (!Number.isInteger(interval) || interval > 3650)
        throw Error('invalid');
      const date = new Date((start + interval) * 86400000);
      if (date.getUTCFullYear() > 2199) throw Error('date');
      const text = [
        String(date.getUTCDate()).padStart(2, '0'),
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        date.getUTCFullYear(),
      ].join('/');
      return result(
        { ...line('nextDate', start + interval), text },
        [line('intervalDays', interval, 'days')],
        'Entered date + entered calendar-day interval',
      );
    }
    if (id === 'interest-calculator' || id === 'loan-emi') {
      const principal = read('principal', true),
        rate = read('annualRate');
      if (rate > 1000) throw Error('invalid');
      if (id === 'interest-calculator') {
        const years = read('years');
        if (years > 200) throw Error('invalid');
        const frequencies: Record<string, number> = {
          simple: 0,
          monthly: 12,
          quarterly: 4,
          yearly: 1,
        };
        const n = frequencies[v.interestType];
        if (n === undefined) throw Error('invalid');
        const interest = n
          ? principal * Math.expm1(n * years * Math.log1p(rate / (100 * n)))
          : (principal * rate * years) / 100;
        return result(
          line('interestAmount', interest, 'money'),
          [
            line('principalAmount', principal, 'money'),
            line('totalPayable', principal + interest, 'money'),
          ],
          n
            ? `P × [(1 + r / ${n})^(${n} × years) − 1], r = annual % ÷ 100`
            : 'P × annual % × years ÷ 100',
        );
      }
      const months = read('months', true);
      if (!Number.isInteger(months) || months > 1200) throw Error('months');
      const r = rate / 1200,
        emi =
          r === 0
            ? principal / months
            : (principal * r) / -Math.expm1(-months * Math.log1p(r));
      return result(
        line('monthlyEmi', emi, 'money'),
        [
          line('totalPayable', emi * months, 'money'),
          line(
            'interestAmount',
            Math.max(0, emi * months - principal),
            'money',
          ),
        ],
        'P × monthly rate ÷ [1 − (1 + monthly rate)^−months]',
      );
    }
    if (id === 'number-words') {
      if (!v.wordsValue.trim()) throw Error('incomplete');
      return result(
        {
          ...line('amountInWords', Number(normal(v.wordsValue))),
          text: indianAmountWords(v.wordsValue),
        },
        [],
        'Indian grouping: thousand, lakh, crore; up to two paise decimals',
      );
    }
    if (id === 'length-converter') {
      const amount = read('lengthValue');
      const from =
          CONVERSION_LENGTHS[v.lengthFrom as keyof typeof CONVERSION_LENGTHS],
        to = CONVERSION_LENGTHS[v.lengthTo as keyof typeof CONVERSION_LENGTHS];
      if (!from || !to) throw Error('unit');
      return result(
        line('convertedLength', (amount * from) / to, 'number', v.lengthTo),
        Object.entries(CONVERSION_LENGTHS)
          .filter(([u]) => u !== v.lengthTo)
          .map(([u, f]) =>
            line('length_' + u, (amount * from) / f, 'number', u),
          ),
        `${amount} ${v.lengthFrom} × ${from} ÷ ${to}`,
      );
    }
    if (id === 'spray-dose') {
      const tank = read('tank', true),
        dose = read('dose'),
        water = read('water', true);
      if (!['ml', 'g'].includes(v.doseUnit)) throw Error('unit');
      const tanks = water / tank;
      return result(
        line('totalDose', tanks * dose, 'number', v.doseUnit),
        [
          line('tankLoads', tanks),
          line('wholeTanks', Math.floor(tanks)),
          line('lastTankWater', water % tank, 'number', 'L'),
          line(
            'lastTankDose',
            ((water % tank) / tank) * dose,
            'number',
            v.doseUnit,
          ),
        ],
        'Water ÷ tank capacity × entered dose per full tank',
      );
    }
    const factors: Record<string, number> = {
      hectare: 10000,
      acre: 4046.8564224,
      sqm: 1,
    };
    const area = read('quantityArea', true),
      factor = factors[v.quantityUnit],
      rateFactor = factors[v.rateUnit];
    if (!factor || !rateFactor) throw Error('unit');
    const rateArea = (area * factor) / rateFactor;
    if (id === 'yield-estimate') {
      const rate = read('yieldRate'),
        production = rateArea * rate;
      const price = v.yieldPrice.trim() ? read('yieldPrice') : null;
      return result(
        line('estimatedProduce', production, 'quintal'),
        price === null
          ? []
          : [line('estimatedValue', production * price, 'money')],
        `Area converted to ${v.rateUnit} × entered yield per ${v.rateUnit}`,
      );
    }
    const rate = read('quantityRate');
    return result(
      line(
        id === 'seed-rate' ? 'seedQuantity' : 'fertilizerQuantity',
        rateArea * rate,
        'number',
        'kg',
      ),
      [],
      `Area converted to ${v.rateUnit} × entered kg per ${v.rateUnit}`,
    );
  } catch (e) {
    const error = (e as Error).message;
    return {
      ok: false,
      error: (['incomplete', 'unit', 'date', 'months', 'expression'].includes(
        error,
      )
        ? error
        : 'invalid') as Extract<DeskResult, { ok: false }>['error'],
    };
  }
}
