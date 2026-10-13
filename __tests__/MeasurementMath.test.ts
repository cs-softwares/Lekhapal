import {
  areaFactor,
  calculateField,
  compareArea,
  mapScaleResult,
  positiveNumber,
} from '../src/domain/measurement';

describe('field measurement calculations', () => {
  test('rectangle reports area, boundary length and scaled corner geometry', () => {
    const calculation = calculateField(
      'rectangle',
      { length: '50', width: '30' },
      'meter',
    );
    expect(calculation.ok).toBe(true);
    if (!calculation.ok) throw new Error('Expected a valid rectangle');
    expect(calculation.result.areaSqm).toBe(1500);
    expect(calculation.result.perimeterM).toBe(160);
    expect(calculation.result.points).toHaveLength(4);
  });
  test('converts feet and yards before computing square metres', () => {
    const feet = calculateField(
      'rectangle',
      { length: '100', width: '50' },
      'feet',
    );
    const yards = calculateField(
      'rectangle',
      { length: '10', width: '10' },
      'yard',
    );
    expect(feet.ok && feet.result.areaSqm).toBeCloseTo(464.5152, 6);
    expect(yards.ok && yards.result.areaSqm).toBeCloseTo(83.612736, 6);
  });
  test('uses all three measured triangle sides, rejecting impossible and flat triangles', () => {
    const triangle = calculateField(
      'triangle',
      { a: '3', b: '4', c: '5' },
      'meter',
    );
    expect(triangle.ok && triangle.result.areaSqm).toBeCloseTo(6);
    expect(triangle.ok && triangle.result.perimeterM).toBe(12);
    expect(
      calculateField('triangle', { a: '1', b: '2', c: '3' }, 'meter'),
    ).toEqual({ ok: false, error: 'triangle' });
    expect(
      calculateField('triangle', { a: '1', b: '2', c: '10' }, 'meter'),
    ).toEqual({ ok: false, error: 'triangle' });
  });
  test('requires a valid inside diagonal instead of estimating from four sides', () => {
    const quad = calculateField(
      'boundary',
      { a: '3', b: '4', c: '3', d: '4', diagonal: '5' },
      'meter',
    );
    expect(quad.ok && quad.result.areaSqm).toBeCloseTo(12);
    expect(quad.ok && quad.result.perimeterM).toBe(14);
    expect(
      calculateField(
        'boundary',
        { a: '3', b: '4', c: '3', d: '4', diagonal: '' },
        'meter',
      ),
    ).toEqual({ ok: false, error: 'incomplete' });
    expect(
      calculateField(
        'boundary',
        { a: '3', b: '4', c: '3', d: '4', diagonal: '9' },
        'meter',
      ),
    ).toEqual({ ok: false, error: 'triangle' });
  });
  test('trapezoid uses perpendicular height and does not invent a perimeter', () => {
    const result = calculateField(
      'trapezoid',
      { a: '20', b: '30', height: '10' },
      'meter',
    );
    expect(result.ok && result.result.areaSqm).toBe(250);
    expect(result.ok && result.result.perimeterM).toBeNull();
  });
  test.each(['', '0', '-5', 'abc', '1..2', 'Infinity', 'NaN', '1e309'])(
    'rejects invalid input %s',
    value => {
      expect(positiveNumber(value)).toBeNull();
      expect(
        calculateField('rectangle', { length: value, width: '3' }, 'meter').ok,
      ).toBe(false);
    },
  );
  test('supports Hindi digits and decimals', () => {
    expect(positiveNumber('१२.५')).toBe(12.5);
    expect(positiveNumber(' .5 ')).toBe(0.5);
  });
});

describe('unit conversion and map scales', () => {
  test('standard units use exact length-based conversion factors', () => {
    expect(areaFactor('acre', '', '')).toBe(4046.8564224);
    expect(areaFactor('hectare', '', '')).toBe(10000);
    expect(areaFactor('sqft', '', '')).toBe(0.09290304);
  });
  test('local units require the entered survey convention', () => {
    expect(areaFactor('bigha', '', '')).toBeNull();
    expect(areaFactor('biswa', '2500', '')).toBeNull();
    expect(areaFactor('bigha', '2529.285264', '20')).toBeCloseTo(2529.285264);
    expect(areaFactor('biswa', '2500', '20')).toBe(125);
    expect(areaFactor('biswa', '2500', '0')).toBeNull();
  });
  test('map distance and paper area use different powers of scale', () => {
    expect(mapScaleResult('2.5', '4000', 'cm', 'length')).toBe(100);
    expect(mapScaleResult('25', '4000', 'mm', 'length')).toBe(100);
    expect(mapScaleResult('2.5', '4000', 'cm', 'area')).toBe(4000);
    expect(mapScaleResult('250', '4000', 'mm', 'area')).toBe(4000);
    expect(mapScaleResult('2', '0', 'cm', 'length')).toBeNull();
  });
  test('record comparison preserves whether the measured area is above or below', () => {
    expect(compareArea(1500, '1600')).toEqual({
      difference: -100,
      percent: -6.25,
    });
    expect(compareArea(1500, '1500')).toEqual({ difference: 0, percent: 0 });
    expect(compareArea(1500, '0')).toBeNull();
  });
});
