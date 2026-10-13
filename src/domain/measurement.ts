export type FieldShape = 'rectangle' | 'triangle' | 'trapezoid' | 'boundary';
export type Point = { x: number; y: number };
export type FieldResult = {
  areaSqm: number;
  perimeterM: number | null;
  points: Point[];
  formula: string;
};
export type Calculation =
  | { ok: true; result: FieldResult }
  | { ok: false; error: 'incomplete' | 'invalid' | 'triangle' };

export const AREA_FACTORS = {
  sqm: 1,
  hectare: 10000,
  acre: 4046.8564224,
  sqft: 0.09290304,
  sqyard: 0.83612736,
  decimal: 4046.8564224 / 100,
  cent: 4046.8564224 / 100,
  guntha: 4046.8564224 / 40,
  sqkm: 1000000,
} as const;
export type StandardAreaUnit = keyof typeof AREA_FACTORS;
export type AreaUnit =
  | StandardAreaUnit
  | 'bigha'
  | 'biswa'
  | 'biswansi'
  | 'marla'
  | 'kanal';
export type LocalAreaSettings = {
  biswansiPerBiswa?: string;
  marlaSqm?: string;
  marlaPerKanal?: string;
};
export const LENGTH_FACTORS = { meter: 1, feet: 0.3048, yard: 0.9144 } as const;
export type LengthUnit = keyof typeof LENGTH_FACTORS;

export function positiveNumber(text: string): number | null {
  const normal = text
    .trim()
    .replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x0966));
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normal)) return null;
  const n = Number(normal);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function triangleHeight(a: number, b: number, base: number) {
  if (a + b <= base || a + base <= b || b + base <= a) return null;
  const x = (a * a + base * base - b * b) / (2 * base);
  // Heron's formula gives the altitude without subtracting nearly equal squares.
  const s = (a + b + base) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - base));
  return { x, y: (2 * area) / base, area };
}

export function calculateField(
  shape: FieldShape,
  values: Record<string, string>,
  unit: LengthUnit,
): Calculation {
  const keys =
    shape === 'rectangle'
      ? ['length', 'width']
      : shape === 'triangle'
      ? ['a', 'b', 'c']
      : shape === 'trapezoid'
      ? ['a', 'b', 'height']
      : ['a', 'b', 'c', 'd', 'diagonal'];
  if (keys.some(key => !values[key]?.trim()))
    return { ok: false, error: 'incomplete' };
  const numbers = keys.map(key => positiveNumber(values[key]));
  if (numbers.some(n => n === null)) return { ok: false, error: 'invalid' };
  const [a, b, c, d, diagonal] = numbers.map(n => n! * LENGTH_FACTORS[unit]);
  let result: FieldResult;
  if (shape === 'rectangle') {
    result = {
      areaSqm: a * b,
      perimeterM: 2 * (a + b),
      points: [
        { x: 0, y: 0 },
        { x: a, y: 0 },
        { x: a, y: b },
        { x: 0, y: b },
      ],
      formula: 'L × W',
    };
  } else if (shape === 'trapezoid') {
    result = {
      areaSqm: ((a + b) * c) / 2,
      perimeterM: null,
      points: [
        { x: (b - a) / 2, y: 0 },
        { x: (b + a) / 2, y: 0 },
        { x: b, y: c },
        { x: 0, y: c },
      ],
      formula: '½ × (a + b) × h',
    };
  } else if (shape === 'triangle') {
    const triangle = triangleHeight(a, b, c);
    if (!triangle) return { ok: false, error: 'triangle' };
    result = {
      areaSqm: triangle.area,
      perimeterM: a + b + c,
      points: [
        { x: 0, y: 0 },
        { x: triangle.x, y: triangle.y },
        { x: c, y: 0 },
      ],
      formula: '√[s(s − a)(s − b)(s − c)]',
    };
  } else {
    const first = triangleHeight(a, b, diagonal);
    const second = triangleHeight(d, c, diagonal);
    if (!first || !second) return { ok: false, error: 'triangle' };
    result = {
      areaSqm: first.area + second.area,
      perimeterM: a + b + c + d,
      points: [
        { x: 0, y: 0 },
        { x: first.x, y: first.y },
        { x: diagonal, y: 0 },
        { x: second.x, y: -second.y },
      ],
      formula: 'Area ABC + Area ACD',
    };
  }
  if (
    !Number.isFinite(result.areaSqm) ||
    result.areaSqm <= 0 ||
    result.points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  ) {
    return { ok: false, error: 'invalid' };
  }
  return { ok: true, result };
}

export function areaFactor(
  unit: AreaUnit,
  bighaSqm: string,
  biswaPerBigha: string,
  local: LocalAreaSettings = {},
): number | null {
  if (Object.prototype.hasOwnProperty.call(AREA_FACTORS, unit))
    return AREA_FACTORS[unit as StandardAreaUnit];
  if (unit === 'marla' || unit === 'kanal') {
    const marla = positiveNumber(local.marlaSqm || '');
    const count = positiveNumber(local.marlaPerKanal || '');
    const result =
      marla && (unit === 'marla' || count)
        ? marla * (unit === 'marla' ? 1 : count!)
        : null;
    return result && Number.isFinite(result) && result > 0 ? result : null;
  }
  if (!['bigha', 'biswa', 'biswansi'].includes(unit)) return null;
  const bigha = positiveNumber(bighaSqm);
  if (!bigha) return null;
  if (unit === 'bigha') return bigha;
  const count = positiveNumber(biswaPerBigha);
  const small =
    unit === 'biswansi' ? positiveNumber(local.biswansiPerBiswa || '') : 1;
  const factor = count && small ? bigha / count / small : null;
  return factor && Number.isFinite(factor) && factor > 0 ? factor : null;
}

export function areaConversions(
  areaSqm: number | null,
  bighaSqm: string,
  biswaPerBigha: string,
  local: LocalAreaSettings = {},
): Array<{ unit: AreaUnit; value: number | null }> {
  const units: AreaUnit[] = [
    'sqm',
    'hectare',
    'acre',
    'sqft',
    'sqyard',
    'bigha',
    'biswa',
    'biswansi',
    'decimal',
    'cent',
    'guntha',
    'marla',
    'kanal',
    'sqkm',
  ];
  return units.map(unit => {
    const factor = areaFactor(unit, bighaSqm, biswaPerBigha, local);
    const value =
      areaSqm !== null && areaSqm > 0 && factor ? areaSqm / factor : null;
    return {
      unit,
      value: value !== null && Number.isFinite(value) ? value : null,
    };
  });
}

export function mapScaleResult(
  distance: string,
  ratio: string,
  unit: 'cm' | 'mm',
  kind: 'length' | 'area',
) {
  const input = positiveNumber(distance);
  const denominator = positiveNumber(ratio);
  if (!input || !denominator) return null;
  const factor = denominator / (unit === 'cm' ? 100 : 1000);
  const result = input * Math.pow(factor, kind === 'area' ? 2 : 1);
  return Number.isFinite(result) && result > 0 ? result : null;
}

export function compareArea(measured: number, recorded: string) {
  const reference = positiveNumber(recorded);
  if (!reference || !Number.isFinite(measured)) return null;
  return {
    difference: measured - reference,
    percent: ((measured - reference) / reference) * 100,
  };
}
