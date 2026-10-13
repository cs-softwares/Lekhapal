import {
  calculateDesk,
  initialDeskValues,
} from '../src/domain/lekhpalCalculator';
import {
  calendarDay,
  indianAmountWords,
  QuickCalculatorId,
  QUICK_CALCULATOR_IDS,
} from '../src/domain/quickCalculators';
import { scientificResult } from '../src/domain/scientificCalculator';
const calc = (id: QuickCalculatorId, v: Record<string, string>) =>
  calculateDesk(id, { ...initialDeskValues(), ...v });
const ok = (id: QuickCalculatorId, v: Record<string, string>) => {
  const r = calc(id, v);
  if (!r.ok) throw Error(r.error);
  return r;
};
test.each(QUICK_CALCULATOR_IDS)(
  '%s requires inputs rather than displaying a fabricated zero',
  id => expect(calc(id, {})).toMatchObject({ ok: false, error: 'incomplete' }),
);
test.each([
  ['2+3*4', 14],
  ['(2+3)*4', 20],
  ['-2^2', -4],
  ['2^-2', 0.25],
  ['2^3^2', 512],
  ['5!', 120],
  ['0!', 1],
  ['sqrt(144)', 12],
  ['log(1000)', 3],
  ['ln(e)', 1],
  ['sin(30)', 0.5],
  ['cos(60)', 0.5],
  ['tan(45)', 1],
  ['200*15%', 30],
  ['१२.५×२', 25],
  ['1e-12', 1e-12],
])(
  'scientific expression %s obeys precedence and explicit operations',
  (expression, expected) =>
    expect(scientificResult(String(expression), 'degree')).toBeCloseTo(
      Number(expected),
      12,
    ),
);
test('radian angles remain distinct from degrees', () =>
  expect(scientificResult('sin(pi/2)', 'radian')).toBeCloseTo(1, 12));
test.each([
  '1/0',
  'sqrt(-1)',
  'log(0)',
  'tan(90)',
  '171!',
  '1.5!',
  '2**3',
  '2(3)',
  'sin()',
  '(2+3',
  '2+',
  'NaN',
  'alert(1)',
  'globalThis.process.exit()',
  '1e309',
  '1'.repeat(161),
])('rejects malformed or undefined expression %s', expression =>
  expect(() => scientificResult(expression, 'degree')).toThrow(),
);
test('percentage supports zero and explicitly shows addition/deduction', () => {
  const r = ok('percentage-calculator', { value: '800', percentage: '12.5' });
  expect(r.primary.value).toBe(100);
  expect(r.lines.map(l => l.value)).toEqual([900, 700]);
  expect(
    ok('percentage-calculator', { value: '0', percentage: '0' }).primary.value,
  ).toBe(0);
});
test('dates count leap days and inclusive dates independently of time zones', () => {
  const r = ok('date-difference', {
    startDate: '28/02/2024',
    endDate: '01/03/2024',
  });
  expect(r.primary.value).toBe(2);
  expect(r.lines[0].value).toBe(3);
  expect(
    ok('date-difference', { startDate: '01/03/2024', endDate: '28/02/2024' })
      .primary.value,
  ).toBe(2);
  expect(
    ok('date-difference', { startDate: '13/10/2026', endDate: '13/10/2026' })
      .lines[0].value,
  ).toBe(1);
});
test.each([
  '31/04/2026',
  '29/02/2025',
  '00/01/2026',
  '01/13/2026',
  '01/01/1899',
  '1/2/2026',
  '2026-02-01',
])('rejects invalid or ambiguous calendar date %s', s =>
  expect(() => calendarDay(s)).toThrow(),
);
test('irrigation uses only the entered interval and crosses years', () => {
  expect(
    ok('irrigation-date', { startDate: '25/12/2026', interval: '10' }).primary
      .text,
  ).toBe('04/01/2027');
  expect(
    calc('irrigation-date', { startDate: '25/12/2026', interval: '1.5' }).ok,
  ).toBe(false);
});
test.each([
  ['simple', 2000],
  ['yearly', 2100],
  ['quarterly', 2184.0289750992],
  ['monthly', 2203.9096137556],
])(
  'interest mode %s applies its actual compounding frequency',
  (interestType, expected) => {
    expect(
      ok('interest-calculator', {
        principal: '10000',
        annualRate: '10',
        years: '2',
        interestType: String(interestType),
      }).primary.value,
    ).toBeCloseTo(Number(expected), 7);
  },
);
test('EMI handles zero interest, tiny interest and ordinary loan values', () => {
  expect(
    ok('loan-emi', { principal: '12000', annualRate: '0', months: '12' })
      .primary.value,
  ).toBe(1000);
  expect(
    ok('loan-emi', {
      principal: '12000',
      annualRate: '0.000000000001',
      months: '12',
    }).primary.value,
  ).toBeCloseTo(1000, 8);
  expect(
    ok('loan-emi', { principal: '100000', annualRate: '12', months: '12' })
      .primary.value,
  ).toBeCloseTo(8884.878867834, 7);
  for (const months of ['0', '1.5', '1201'])
    expect(
      calc('loan-emi', { principal: '100', annualRate: '10', months }).ok,
    ).toBe(false);
});
test('amount wording retains paise exactly and uses lakh/crore groups', () => {
  expect(indianAmountWords('१०००००.०५')).toBe(
    'One Lakh Rupees and Five Paise Only',
  );
  expect(indianAmountWords('10000000')).toBe('One Crore Rupees Only');
  expect(indianAmountWords('0')).toBe('Zero Rupees Only');
  for (const v of ['1.001', '-1', '1e4', '1,000', '1000000000000'])
    expect(() => indianAmountWords(v)).toThrow();
});
test('length conversion uses exact international factors and exposes all eight units', () => {
  expect(
    ok('length-converter', {
      lengthValue: '1',
      lengthFrom: 'mile',
      lengthTo: 'feet',
    }).primary.value,
  ).toBe(5280);
  expect(
    ok('length-converter', {
      lengthValue: '1',
      lengthFrom: 'inch',
      lengthTo: 'mm',
    }).primary.value,
  ).toBeCloseTo(25.4, 12);
  expect(ok('length-converter', { lengthValue: '1' }).lines).toHaveLength(7);
  expect(
    calc('length-converter', { lengthValue: '1', lengthFrom: 'unknown' }).ok,
  ).toBe(false);
});
test('seed/fertilizer quantities convert field units before using the entered rate', () => {
  expect(
    ok('seed-rate', {
      quantityArea: '4046.8564224',
      quantityUnit: 'sqm',
      quantityRate: '20',
    }).primary.value,
  ).toBeCloseTo(20);
  expect(
    ok('fertilizer-quantity', {
      quantityArea: '1',
      quantityUnit: 'hectare',
      rateUnit: 'hectare',
      quantityRate: '50',
    }).primary.value,
  ).toBe(50);
});
test('spray preserves the dose unit and calculates only a proportional final tank', () => {
  const r = ok('spray-dose', {
    tank: '15',
    dose: '30',
    water: '40',
    doseUnit: 'g',
  });
  expect(r.primary).toMatchObject({ value: 80, suffix: 'g' });
  expect(r.lines.slice(1).map(l => l.value)).toEqual([2, 10, 20]);
  expect(
    ok('spray-dose', { tank: '15', dose: '30', water: '30' })
      .lines.slice(2)
      .map(l => l.value),
  ).toEqual([0, 0]);
  expect(calc('spray-dose', { tank: '0', dose: '30', water: '30' }).ok).toBe(
    false,
  );
});
test('yield calculation labels quintals and excludes an unentered price', () => {
  expect(
    ok('yield-estimate', {
      quantityArea: '2',
      quantityUnit: 'acre',
      yieldRate: '15',
    }),
  ).toMatchObject({ primary: { value: 30, unit: 'quintal' }, lines: [] });
  expect(
    ok('yield-estimate', {
      quantityArea: '2',
      quantityUnit: 'acre',
      yieldRate: '15',
      yieldPrice: '2000',
    }).lines[0].value,
  ).toBe(60000);
});
