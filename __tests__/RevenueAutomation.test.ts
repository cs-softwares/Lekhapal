import {
  DEFAULT_REVENUE_AUTOMATION,
  planRevenueFill,
  revenuePreset,
} from '../src/domain/revenueAutomation';
import { RevenueSnapshot } from '../src/domain/revenueFeeding';
import { cropPlanAreas, applyCropPlan } from '../src/domain/cropPlan';
import {
  DEFAULT_ADVANCED_RULES,
  advancedRulesSchema,
  officialContextError,
} from '../src/domain/khasraAdvanced';
import { mapKml, mapImageUrl, utmToWgs84 } from '../src/domain/bhunakshaExport';
const field = (key: string, value: string, readOnly = false) => ({
  key,
  ref: key,
  label: key,
  value,
  kind: 'text' as const,
  readOnly,
  required: false,
  options: [],
});
const page = {
  stage: 'share',
  fields: [
    field('area', '1.0001', true),
    field('share', '1/1'),
    field('hissa', '1.0001'),
  ],
} as unknown as RevenueSnapshot;
test('automatic share plans use this owner area and change only share fields', () => {
  expect(
    planRevenueFill(page, { ...DEFAULT_REVENUE_AUTOMATION, fraction: '1/2' }),
  ).toEqual({ share: '1/2', hissa: '0.5001' });
  expect(
    planRevenueFill(page, { ...DEFAULT_REVENUE_AUTOMATION, fraction: '1/0' }),
  ).toEqual(expect.any(String));
  expect(
    revenuePreset({
      ...page,
      fields: [
        ...page.fields,
        field('password', 'secret'),
        field('name', 'Owner'),
        field('village', 'v1'),
      ],
    }),
  ).toEqual({ share: '1/1', hissa: '1.0001' });
});
test('Prapatra presets reject removed or ambiguous fields instead of partially applying', () => {
  const config = {
    ...DEFAULT_REVENUE_AUTOMATION,
    presets: { boundaries: { east: 'road', west: 'pond' } },
  };
  expect(
    planRevenueFill(
      { ...page, stage: 'boundaries', fields: [field('east', '')] },
      config,
    ),
  ).toContain('west');
});
test('mixed-crop allocations preserve the exact total and reject over-allocation', () => {
  const rows = [
    { crop: 'a', percent: '33.33', irrigated: false },
    { crop: 'b', percent: '66.67', irrigated: true },
  ];
  expect(cropPlanAreas('1.0001', rows)).toEqual(['0.3333', '0.6668']);
  expect(() => cropPlanAreas('1', [{ ...rows[0], percent: '110' }])).toThrow(
    '100',
  );
  const cropPage: any = {
    stage: 'crop',
    remainingArea: '0.2',
    fields: [
      {
        ...field('crop', ''),
        kind: 'select',
        options: [{ value: 'a', label: 'Wheat' }],
      },
      field('area', ''),
    ],
  };
  expect(applyCropPlan(cropPage, {}, rows, 0, '1')).toContain('remaining area');
});
test('old advanced settings migrate with auto-lock off and official context mismatches stop automation', () => {
  const { autoLock, cropPlan, ...old } = DEFAULT_ADVANCED_RULES;
  expect(advancedRulesSchema.parse(old)).toMatchObject({
    autoLock: false,
    cropPlan: [],
  });
  expect(
    officialContextError(
      {} as any,
      { year: '1433', season: 'rabi', villageCode: '123456' },
      true,
    ),
  ).toContain('must be visible');
  expect(
    officialContextError({ officialContext: { year: '1432' } } as any, {
      year: '1433',
      season: 'rabi',
      villageCode: '123456',
    }),
  ).toContain('differs');
});
test('map exports use georeferenced northern UTM corners, escaped names and bundled KMZ resource path', () => {
  expect(utmToWgs84(500000, 0, 44)).toEqual({ lat: 0, lng: 81 });
  const info = {
    crs: 'EPSG:32644',
    xmin: 500000,
    xmax: 501000,
    ymin: 2800000,
    ymax: 2802000,
    gisCode: 'test',
  };
  const kml = mapKml(info, 'fallback', 'A & B', true);
  expect(kml).toContain('A &amp; B');
  expect(kml).toContain('files/village_map.png');
  expect(kml).toContain('gx:LatLonQuad');
  expect(mapImageUrl(info, 'fallback')).toContain('WIDTH=2048');
  expect(mapImageUrl(info, 'fallback')).toContain('HEIGHT=4096');
  expect(() => mapKml({ ...info, crs: 'EPSG:4326' }, 'x', 'x')).toThrow(
    'not supported',
  );
  expect(() => mapKml({ ...info, xmax: 499999 }, 'x', 'x')).toThrow();
});
