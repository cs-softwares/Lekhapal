import {
  calculateDesk,
  DeskCalculatorId,
  initialDeskValues,
  readOwners,
  restoreDeskValues,
  deskNumber,
} from '../src/domain/lekhpalCalculator';
const calculate = (id: DeskCalculatorId, values: Record<string, string>) =>
  calculateDesk(id, { ...initialDeskValues(), ...values });
const shares = (...values: string[]) =>
  JSON.stringify(
    values.map((share, i) => ({
      id: String(i),
      name: `Owner ${i + 1}`,
      share,
    })),
  );
const success = (id: DeskCalculatorId, values: Record<string, string>) => {
  const result = calculate(id, values);
  if (!result.ok) throw Error(result.error);
  return result;
};
test('three exact thirds allocate the whole area without rounding remainder', () => {
  const r = success('share-calculator', {
    area: '1.2',
    owners: shares('1/3', '1/3', '1/3'),
  });
  expect(r.primary.value).toBe(1.2);
  expect(r.lines.find(l => l.key === 'remainingArea')?.value).toBe(0);
  expect(r.allocations?.[0].area).toBeCloseTo(0.4);
  expect(r.allocations?.[0].fraction).toBe('1/3');
});
test('incomplete shares preserve the unallocated remainder', () => {
  const r = success('share-calculator', {
    area: '12',
    owners: shares('1/3', '1/4'),
  });
  expect(r.primary.value).toBe(7);
  expect(r.lines.find(l => l.key === 'remainingArea')?.value).toBe(5);
});
test('equal and percentage modes allocate correctly, including a zero share', () => {
  expect(
    success('share-calculator', {
      area: '9',
      owners: shares('', '', ''),
      shareMode: 'equal',
    }).allocations?.map(o => o.area),
  ).toEqual([3, 3, 3]);
  expect(
    success('share-calculator', {
      area: '10',
      owners: shares('0', '100'),
      shareMode: 'percent',
    }).allocations?.map(o => o.area),
  ).toEqual([0, 10]);
});
test.each([
  ['1/2', '2/3'],
  ['100', '0.1'],
])('over-allocation is rejected: %s + %s', (a, b) => {
  expect(
    calculate('share-calculator', {
      area: '10',
      owners: shares(a, b),
      shareMode: a === '100' ? 'percent' : 'fraction',
    }),
  ).toEqual({ ok: false, error: 'overshare' });
});
test('blank shares are not silently treated as equal ownership', () => {
  expect(
    calculate('share-calculator', { area: '10', owners: shares('1/2', '') }),
  ).toEqual({ ok: false, error: 'incomplete' });
});
test('malformed or oversized owner lists are rejected rather than partially allocated', () => {
  expect(calculate('share-calculator', { area: '12', owners: shares(...Array(13).fill('1/13')) }).ok).toBe(false);
  expect(calculate('share-calculator', { area: '12', owners: JSON.stringify([{ name: 'A', share: '1/2' }, { name: 'B', share: 0.5 }]) }).ok).toBe(false);
  expect(calculate('fraction-hissa-calculator', { fractionA: '1/2', fractionB: '1/3', operation: 'unknown' }).ok).toBe(false);
});
test.each([
  ['single', '6/12', '', '1/2'],
  ['add', '1/3', '1/6', '1/2'],
  ['subtract', '3/4', '1/4', '1/2'],
  ['multiply', '1/2', '1/3', '1/6'],
])(
  'fraction operation %s is exact',
  (operation, fractionA, fractionB, expected) => {
    const r = success('fraction-hissa-calculator', {
      operation,
      fractionA,
      fractionB,
      area: '12',
    });
    expect(r.fraction).toBe(expected);
    expect(r.lines.find(l => l.key === 'shareArea')?.value).toBe(
      expected === '1/6' ? 2 : 6,
    );
  },
);
test('fractions work without area; invalid denominators and negative results are rejected', () => {
  expect(
    success('fraction-hissa-calculator', { fractionA: '1/2', unit: '' }).primary
      .text,
  ).toBe('1/2');
  expect(calculate('fraction-hissa-calculator', { fractionA: '1/0' })).toEqual({
    ok: false,
    error: 'fraction',
  });
  expect(
    calculate('fraction-hissa-calculator', {
      fractionA: '1/3',
      fractionB: '1/2',
      operation: 'subtract',
    }),
  ).toEqual({ ok: false, error: 'negative' });
});
test('valuation uses the entered assessment only for fees', () => {
  const r = success('registry-estimate', {
    area: '2',
    rate: '100000',
    assessed: '250000',
    stamp: '7',
    registration: '1',
    extra: '500',
  });
  expect(r.primary.value).toBe(220500);
  expect(r.lines.find(l => l.key === 'feeBasis')?.value).toBe(250000);
  expect(r.lines.find(l => l.key === 'landValue')?.value).toBe(200000);
});
test('blank fees are zero, and percentages above 100 are rejected', () => {
  expect(
    success('registry-estimate', { area: '2', rate: '1000' }).primary.value,
  ).toBe(2000);
  expect(
    calculate('registry-estimate', { area: '2', rate: '1000', stamp: '101' }),
  ).toEqual({ ok: false, error: 'invalid' });
});
test('comparison preserves decreases and rate-finder removes only included charges', () => {
  const r = success('circle-rate-compare', {
    area: '2',
    rate: '100',
    rateB: '80',
  });
  expect(r.primary.value).toBe(-40);
  expect(r.lines.find(l => l.key === 'changePercent')?.value).toBe(-20);
  expect(
    success('rate-finder', { area: '2', value: '1000', extra: '200' }).primary
      .value,
  ).toBe(400);
  expect(
    calculate('rate-finder', { area: '2', value: '1000', extra: '1001' }),
  ).toEqual({ ok: false, error: 'charges' });
});
test.each([
  ['hectare', '1'],
  ['sqm', '10000'],
  ['acre', String(1 / 0.40468564224)],
])('crop loss converts %s to hectares before applying yield', (unit, area) => {
  const r = success('crop-loss', {
    area,
    unit,
    normalYield: '40',
    actualYield: '25',
    price: '2000',
  });
  expect(r.primary.value).toBeCloseTo(30000);
  expect(r.lines.find(l => l.key === 'yieldLoss')?.value).toBe(37.5);
});
test('crop loss accepts complete loss and rejects local units or increased yield', () => {
  expect(
    success('crop-loss', {
      area: '1',
      normalYield: '40',
      actualYield: '0',
      price: '2000',
    }).primary.value,
  ).toBe(80000);
  expect(
    calculate('crop-loss', {
      area: '1',
      unit: 'bigha',
      normalYield: '40',
      actualYield: '0',
      price: '2000',
    }),
  ).toEqual({ ok: false, error: 'unit' });
  expect(
    calculate('crop-loss', {
      area: '1',
      normalYield: '40',
      actualYield: '41',
      price: '2000',
    }),
  ).toEqual({ ok: false, error: 'yield' });
});
test('recovery preserves balance, shows excess collection, and caps the progress indicator', () => {
  expect(
    success('recovery-balance', {
      demand: '1000',
      arrears: '200',
      paid: '700',
      waiver: '100',
    }).primary.value,
  ).toBe(400);
  const r = success('recovery-balance', { demand: '100', paid: '150' });
  expect(r.primary).toMatchObject({ key: 'creditBalance', value: 50 });
  expect(r.progress).toBe(1);
  expect(
    calculate('recovery-balance', { demand: '100', waiver: '101' }),
  ).toEqual({ ok: false, error: 'waiver' });
});
test('numbers support Hindi digits without silently coercing malformed input', () => {
  expect(deskNumber('१२.५')).toBe(12.5);
  for (const input of ['', '-1', 'Infinity', '1e2', '4abc', 'NaN'])
    expect(deskNumber(input)).toBeNull();
  expect(
    success('fraction-hissa-calculator', { fractionA: '१/२' }).fraction,
  ).toBe('1/2');
});
test('old money-share records cannot turn into land area', () => {
  const values = restoreDeskValues('share-calculator', {
    totalAmount: '10000',
    ownerPercent: '25',
    ownerLabel: 'A',
    partnerLabel: 'B',
  });
  expect(values.area).toBe('');
  expect(values.unit).toBe('');
  expect(readOwners(values).map(o => o.share)).toEqual(['25', '75']);
  expect(values.notes).toContain('10000');
});
test('old area notes require an explicit unit; new notes preserve all inputs', () => {
  const values = restoreDeskValues('registry-estimate', {
    area: '2',
    circleRate: '5000',
    stampPercent: '7',
    registrationPercent: '1',
  });
  expect(values).toMatchObject({
    area: '2',
    rate: '5000',
    stamp: '7',
    registration: '1',
    unit: '',
  });
  expect(calculateDesk('registry-estimate', values)).toEqual({
    ok: false,
    error: 'unit',
  });
  const current = {
    ...initialDeskValues(),
    calculatorVersion: '3',
    unit: 'acre',
    area: '2',
    village: 'Village',
    owners: shares('1/2', '1/2'),
  };
  expect(restoreDeskValues('share-calculator', current)).toEqual(current);
});
