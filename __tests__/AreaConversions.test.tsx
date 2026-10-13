import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { areaConversions } from '../src/domain/measurement';
import AreaConversionResults, {
  areaConversionRows,
} from '../src/components/measurement/AreaConversionResults';

jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: {} }),
}));
jest.mock('../src/components/measurement/MeasurementUI', () => ({
  MeasurementField: () => null,
}));

test('standard areas and entered local conventions remain correct', () => {
  const result = Object.fromEntries(
    areaConversions(10000, '2500', '20').map(row => [row.unit, row.value]),
  );
  expect(result.sqm).toBe(10000);
  expect(result.hectare).toBe(1);
  expect(result.acre).toBeCloseTo(2.4710538147, 8);
  expect(result.sqft).toBeCloseTo(107639.104167, 5);
  expect(result.sqyard).toBeCloseTo(11959.900463, 5);
  expect(result.bigha).toBe(4);
  expect(result.biswa).toBe(80);
});

test('missing or invalid local factors never invent Bigha or Biswa values', () => {
  expect(
    areaConversions(10000, '', '')
      .filter(row => ['bigha', 'biswa'].includes(row.unit))
      .map(row => row.value),
  ).toEqual([null, null]);
  expect(
    areaConversions(10000, '2500', '0')
      .filter(row => ['bigha', 'biswa'].includes(row.unit))
      .map(row => row.value),
  ).toEqual([4, null]);
  expect(
    areaConversions(null, '2500', '20').every(row => row.value === null),
  ).toBe(true);
  expect(
    areaConversions(Infinity, '2500', '20').every(row => row.value === null),
  ).toBe(true);
});

test('additional reference units retain their definitions and require local Marla/Biswansi factors', () => {
  const missing = Object.fromEntries(
    areaConversions(4046.8564224, '', '').map(r => [r.unit, r.value]),
  );
  expect(missing.decimal).toBeCloseTo(100);
  expect(missing.cent).toBeCloseTo(100);
  expect(missing.guntha).toBeCloseTo(40);
  for (const u of ['bigha', 'biswa', 'biswansi', 'marla', 'kanal'])
    expect(missing[u]).toBeNull();
  const converted = Object.fromEntries(
    areaConversions(2500, '2500', '20', {
      biswansiPerBiswa: '20',
      marlaSqm: '25',
      marlaPerKanal: '20',
    }).map(r => [r.unit, r.value]),
  );
  expect(converted.biswansi).toBe(400);
  expect(converted.marla).toBe(100);
  expect(converted.kanal).toBe(5);
  expect(converted.sqkm).toBe(0.0025);
});

test('reports retain all conversions while the screen no longer renders the all-units grid', async () => {
  const rows = (area: number, factor: string) =>
    Object.fromEntries(
      areaConversionRows(area, factor, '20', false).map(r => [r.unit, r.value]),
    );
  expect(rows(10000, '2500')).toMatchObject({
    hectare: '1',
    bigha: '4',
    biswa: '80',
  });
  expect(rows(20000, '2500')).toMatchObject({
    hectare: '2',
    bigha: '8',
    biswa: '160',
  });
  expect(rows(20000, '2000')).toMatchObject({ bigha: '10', biswa: '200' });
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <AreaConversionResults
        areaSqm={10000}
        bighaSqm="2500"
        biswaPerBigha="20"
        onChange={() => {}}
      />,
    );
  });
  expect(JSON.stringify(tree.toJSON())).not.toContain('Area in all units');
  expect(
    tree.root.findAll(n => n.props.testID?.startsWith('area-conversion-')),
  ).toHaveLength(0);
  await act(() => tree.unmount());
});
