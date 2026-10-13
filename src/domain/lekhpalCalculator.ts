import type { WorkspaceValues } from '../types/workspace';
import {
  calculateQuick,
  isQuickCalculator,
  QUICK_CALCULATOR_IDS,
  QUICK_DEFAULTS,
} from './quickCalculators';

export const DESK_CALCULATOR_IDS = [
  ...QUICK_CALCULATOR_IDS,
  'share-calculator',
  'fraction-hissa-calculator',
  'registry-estimate',
  'circle-rate-compare',
  'rate-finder',
  'crop-loss',
  'recovery-balance',
] as const;
export type DeskCalculatorId = (typeof DESK_CALCULATOR_IDS)[number];
export type OwnerInput = { id: string; name: string; share: string };
export type ResultUnit =
  | 'area'
  | 'money'
  | 'rate'
  | 'percent'
  | 'fraction'
  | 'quintal'
  | 'number'
  | 'days';
export type ResultLine = {
  key: string;
  value: number;
  unit: ResultUnit;
  text?: string;
  suffix?: string;
};
export type DeskResult =
  | {
      ok: true;
      primary: ResultLine;
      lines: ResultLine[];
      allocations?: Array<{
        name: string;
        fraction: string;
        percent: number;
        area: number;
      }>;
      fraction?: string;
      progress?: number;
      formula: string;
    }
  | {
      ok: false;
      error:
        | 'incomplete'
        | 'invalid'
        | 'fraction'
        | 'overshare'
        | 'negative'
        | 'charges'
        | 'yield'
        | 'waiver'
        | 'unit'
        | 'date'
        | 'months'
        | 'expression';
    };
const invalid = (
  error: Extract<DeskResult, { ok: false }>['error'],
): DeskResult => ({ ok: false, error });
const normal = (v: string) =>
  v.trim().replace(/[०-९]/g, d => String(d.charCodeAt(0) - 0x0966));
export function deskNumber(value: string, zero = false): number | null {
  const s = normal(value);
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n <= 1e14 && (zero ? n >= 0 : n > 0) ? n : null;
}
type Fraction = { n: bigint; d: bigint };
function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  while (b) {
    const r = a % b;
    a = b;
    b = r;
  }
  return a;
}
const reduce = (n: bigint, d: bigint): Fraction => {
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};
export function parseShare(raw: string): Fraction | null {
  const value = normal(raw);
  if (/^\d{1,8}\/\d{1,8}$/.test(value)) {
    const [n, d] = value.split('/').map(BigInt);
    return d > 0n ? reduce(n, d) : null;
  }
  if (!/^\d{1,8}(?:\.\d{1,6})?$/.test(value)) return null;
  const [whole, dec = ''] = value.split('.');
  return reduce(BigInt(whole + dec), 10n ** BigInt(dec.length));
}
const plus = (a: Fraction, b: Fraction) =>
  reduce(a.n * b.d + b.n * a.d, a.d * b.d);
const fractionText = (f: Fraction) => `${f.n}/${f.d}`;
const ratio = (f: Fraction) => Number(f.n) / Number(f.d);
export function readOwners(values: WorkspaceValues): OwnerInput[] {
  try {
    const items = JSON.parse(values.owners || '[]');
    if (
      Array.isArray(items) &&
      items.length <= 12 &&
      items.every(
        o => o && typeof o.name === 'string' && typeof o.share === 'string',
      )
    )
      return items
        .filter(
          o => o && typeof o.name === 'string' && typeof o.share === 'string',
        )
        .slice(0, 12)
        .map((o, i) => ({
          id: typeof o.id === 'string' ? o.id : String(i),
          name: o.name,
          share: o.share,
        }));
  } catch {}
  return [];
}
const line = (key: string, value: number, unit: ResultUnit): ResultLine => ({
  key,
  value,
  unit,
});
export function calculateDesk(
  id: DeskCalculatorId,
  v: WorkspaceValues,
): DeskResult {
  if (isQuickCalculator(id)) return calculateQuick(id, v);
  const number = (key: string, zero = false) => deskNumber(v[key] ?? '', zero);
  const optional = (key: string) => (v[key]?.trim() ? number(key, true) : 0);
  const missing = (keys: string[]) => keys.some(k => !v[k]?.trim());
  const area = number('area');
  const needsUnit =
    id !== 'recovery-balance' &&
    (id !== 'fraction-hissa-calculator' || !!v.area?.trim());
  if (
    needsUnit &&
    !(
      id === 'crop-loss'
        ? ['hectare', 'sqm', 'acre']
        : ['hectare', 'sqm', 'acre', 'bigha']
    ).includes(v.unit)
  )
    return invalid('unit');
  if (id === 'share-calculator') {
    if (!['equal', 'fraction', 'percent'].includes(v.shareMode))
      return invalid('invalid');
    const owners = readOwners(v);
    if (
      !owners.length ||
      missing(['area']) ||
      (v.shareMode !== 'equal' && owners.some(o => !o.share.trim()))
    )
      return invalid('incomplete');
    if (!area) return invalid('invalid');
    const fractions = owners.map(o =>
      v.shareMode === 'equal'
        ? reduce(1n, BigInt(owners.length))
        : parseShare(o.share),
    );
    if (fractions.some(f => !f)) return invalid('fraction');
    const shares = fractions.map(f =>
      v.shareMode === 'percent' ? reduce(f!.n, f!.d * 100n) : f!,
    );
    const sum = shares.reduce(plus, { n: 0n, d: 1n });
    if (sum.n > sum.d) return invalid('overshare');
    if (sum.n <= 0n) return invalid('fraction');
    const remaining = reduce(sum.d - sum.n, sum.d);
    const allocated = area * ratio(sum);
    return {
      ok: true,
      primary: line('allocatedArea', allocated, 'area'),
      lines: [
        line('totalArea', area, 'area'),
        line('remainingArea', area * ratio(remaining), 'area'),
        line('allocatedShare', 100 * ratio(sum), 'percent'),
      ],
      allocations: owners.map((o, i) => ({
        name: o.name.trim(),
        fraction: fractionText(shares[i]),
        percent: 100 * ratio(shares[i]),
        area: area * ratio(shares[i]),
      })),
      progress: ratio(sum),
      formula: 'area × recorded share',
    };
  }
  if (id === 'fraction-hissa-calculator') {
    if (!['single', 'add', 'subtract', 'multiply'].includes(v.operation))
      return invalid('invalid');
    if (
      missing(['fractionA']) ||
      (v.operation !== 'single' && missing(['fractionB']))
    )
      return invalid('incomplete');
    const a = parseShare(v.fractionA),
      b = v.operation === 'single' ? { n: 0n, d: 1n } : parseShare(v.fractionB);
    if (!a || !b) return invalid('fraction');
    let f = a;
    if (v.operation === 'add') f = plus(a, b);
    if (v.operation === 'subtract')
      f = reduce(a.n * b.d - b.n * a.d, a.d * b.d);
    if (v.operation === 'multiply') f = reduce(a.n * b.n, a.d * b.d);
    if (f.n < 0n) return invalid('negative');
    if (f.n > f.d) return invalid('overshare');
    if (v.area?.trim() && !area) return invalid('invalid');
    const share = ratio(f);
    return {
      ok: true,
      primary: {
        ...line('resultShare', share, 'fraction'),
        text: fractionText(f),
      },
      lines: [
        line('sharePercent', share * 100, 'percent'),
        ...(area
          ? [
              line('shareArea', area * share, 'area'),
              line('remainingArea', area * (1 - share), 'area'),
            ]
          : []),
      ],
      fraction: fractionText(f),
      progress: share,
      formula:
        v.operation === 'single'
          ? v.fractionA
          : `${v.fractionA} ${
              v.operation === 'add'
                ? '+'
                : v.operation === 'subtract'
                ? '−'
                : '×'
            } ${v.fractionB}`,
    };
  }
  if (id === 'registry-estimate') {
    if (missing(['area', 'rate'])) return invalid('incomplete');
    const rate = number('rate'),
      stamp = optional('stamp'),
      registration = optional('registration'),
      extra = optional('extra'),
      assessed = optional('assessed');
    if (
      !area ||
      !rate ||
      [stamp, registration, extra, assessed].some(n => n === null) ||
      stamp! > 100 ||
      registration! > 100
    )
      return invalid('invalid');
    const land = area * rate,
      base = assessed! > 0 ? assessed! : land,
      stampFee = (base * stamp!) / 100,
      regFee = (base * registration!) / 100,
      fees = stampFee + regFee + extra!;
    return {
      ok: true,
      primary: line('totalEstimate', land + fees, 'money'),
      lines: [
        line('landValue', land, 'money'),
        line('feeBasis', base, 'money'),
        line('stampFee', stampFee, 'money'),
        line('registrationFee', regFee, 'money'),
        line('otherFees', extra!, 'money'),
        line('totalFees', fees, 'money'),
      ],
      formula: 'area × rate + entered fees',
    };
  }
  if (id === 'circle-rate-compare') {
    if (missing(['area', 'rate', 'rateB'])) return invalid('incomplete');
    const a = number('rate'),
      b = number('rateB');
    if (!area || !a || !b) return invalid('invalid');
    return {
      ok: true,
      primary: line('valueDifference', (b - a) * area, 'money'),
      lines: [
        line('valueA', a * area, 'money'),
        line('valueB', b * area, 'money'),
        line('rateDifference', b - a, 'rate'),
        line('changePercent', ((b - a) / a) * 100, 'percent'),
      ],
      formula: 'area × (rate B − rate A)',
    };
  }
  if (id === 'rate-finder') {
    if (missing(['area', 'value'])) return invalid('incomplete');
    const value = number('value'),
      extra = optional('extra');
    if (!area || !value || extra === null) return invalid('invalid');
    if (extra > value) return invalid('charges');
    return {
      ok: true,
      primary: line('netRate', (value - extra) / area, 'rate'),
      lines: [
        line('grossRate', value / area, 'rate'),
        line('chargesPerUnit', extra / area, 'rate'),
        line('netValue', value - extra, 'money'),
      ],
      formula: '(total value − included charges) ÷ area',
    };
  }
  if (id === 'crop-loss') {
    if (missing(['area', 'normalYield', 'actualYield', 'price']))
      return invalid('incomplete');
    const expected = number('normalYield'),
      actual = number('actualYield', true),
      price = number('price');
    if (!area || !expected || actual === null || !price)
      return invalid('invalid');
    if (actual > expected) return invalid('yield');
    const hectare =
      area *
      (v.unit === 'acre' ? 0.40468564224 : v.unit === 'sqm' ? 0.0001 : 1);
    const loss = hectare * (expected - actual),
      percent = (expected - actual) / expected;
    return {
      ok: true,
      primary: line('cropValueLoss', loss * price, 'money'),
      lines: [
        line('yieldLoss', percent * 100, 'percent'),
        line('lostProduce', loss, 'quintal'),
        line('expectedProduce', hectare * expected, 'quintal'),
        line('actualProduce', hectare * actual, 'quintal'),
      ],
      progress: percent,
      formula: 'area in ha × (expected − actual q/ha) × ₹/q',
    };
  }
  if (missing(['demand'])) return invalid('incomplete');
  const demand = number('demand', true),
    arrears = optional('arrears'),
    paid = optional('paid'),
    waiver = optional('waiver');
  if ([demand, arrears, paid, waiver].some(n => n === null))
    return invalid('invalid');
  const gross = demand! + arrears!;
  if (waiver! > gross) return invalid('waiver');
  const due = gross - waiver!,
    balance = due - paid!;
  return {
    ok: true,
    primary: line(
      balance < 0 ? 'creditBalance' : 'balanceDue',
      Math.abs(balance),
      'money',
    ),
    lines: [
      line('totalDemand', gross, 'money'),
      line('approvedAdjustment', waiver!, 'money'),
      line('netDemand', due, 'money'),
      line('collected', paid!, 'money'),
      line(
        'recoveredPercent',
        due > 0 ? Math.min(paid! / due, 1) * 100 : 100,
        'percent',
      ),
    ],
    progress: due > 0 ? Math.min(paid! / due, 1) : 1,
    formula: 'current demand + arrears − approved adjustment − collected',
  };
}

export const initialDeskValues = (): WorkspaceValues => ({
  ...QUICK_DEFAULTS,
  area: '',
  unit: 'hectare',
  shareMode: 'fraction',
  owners: JSON.stringify([
    { id: '1', name: '', share: '' },
    { id: '2', name: '', share: '' },
  ]),
  fractionA: '',
  fractionB: '',
  operation: 'single',
  rate: '',
  rateB: '',
  stamp: '',
  registration: '',
  assessed: '',
  extra: '',
  value: '',
  normalYield: '',
  actualYield: '',
  price: '',
  demand: '',
  arrears: '',
  paid: '',
  waiver: '',
  village: '',
  gata: '',
  reference: '',
  notes: '',
  rateSource: '',
});
export function restoreDeskValues(
  id: DeskCalculatorId,
  source: WorkspaceValues,
): WorkspaceValues {
  if (source.calculatorVersion === '3')
    return { ...initialDeskValues(), ...source };
  const v = initialDeskValues();
  v.reference = source.referenceLabel || '';
  // Older notes did not record units. Require the user to choose one explicitly.
  v.unit = '';
  if (id === 'share-calculator') {
    // The legacy total was money, not land area. Never reinterpret it as area.
    v.area = '';
    v.notes = source.totalAmount
      ? `Legacy total amount: ₹${source.totalAmount}`
      : '';
    v.shareMode = 'percent';
    const pct = deskNumber(source.ownerPercent || '', true);
    v.owners = JSON.stringify([
      {
        id: '1',
        name: source.ownerLabel || '',
        share: source.ownerPercent || '',
      },
      {
        id: '2',
        name: source.partnerLabel || '',
        share: pct !== null && pct <= 100 ? String(100 - pct) : '',
      },
    ]);
  } else if (id === 'fraction-hissa-calculator') {
    v.area = source.totalArea || '';
    v.fractionA = `${source.numerator || ''}/${source.denominator || ''}`;
  } else if (id === 'registry-estimate') {
    v.area = source.area || '';
    v.rate = source.circleRate || '';
    v.stamp = source.stampPercent || '';
    v.registration = source.registrationPercent || '';
    v.extra = source.otherFee || '';
  } else if (id === 'rate-finder') {
    v.area = source.totalArea || '';
    v.value = source.totalValue || '';
    v.extra = source.extraCharges || '';
  } else if (id === 'circle-rate-compare') {
    v.area = source.area || '';
    v.rate = source.currentRate || '';
    v.rateB = source.revisedRate || '';
  }
  return v;
}
