import {
  censusFill,
  censusPreset,
  censusAreaConversion,
  phase2Areas,
  DEFAULT_CENSUS_RULES,
} from '../src/domain/census';
import { OfficialWorkSnapshot } from '../src/domain/officialWork';
const field = (
  key: string,
  value: string,
  options?: string[],
): OfficialWorkSnapshot['fields'][number] => ({
  ref: key,
  key,
  value,
  label: key,
  kind: options ? 'select' : 'text',
  options: (options || []).map(v => ({ value: v, label: v })),
});
const page = (
  fields: OfficialWorkSnapshot['fields'],
): OfficialWorkSnapshot => ({
  channel: 'lekhpal-official-work-v1',
  type: 'snapshot',
  documentId: 'one',
  revision: 1,
  url: 'https://agcensus.gov.in/AgriCensus/L1_L2_Entry.jsp',
  stage: 'entry',
  busy: false,
  identity: '1',
  context: 'village=123456',
  fields,
  actions: [],
  entries: [],
  notice: '',
  success: false,
  error: false,
});
test('Block C uses each current row and waits for dependent land-use changes', () => {
  const p = page([
    field('land_use_list1', '1', ['1', '2']),
    field('land_use_list7', '1', ['1', '2']),
  ]);
  const rules = {
    ...DEFAULT_CENSUS_RULES,
    mode: 'block-d' as const,
    landType: '5',
  };
  expect(censusFill(p, {}, rules)).toEqual({ land_use_list1: '2' });
  p.fields[0].value = '2';
  expect(() => censusFill(p, {}, rules)).toThrow('missing');
  p.fields.push(field('land_use_type_list1', '5', ['5']));
  expect(censusFill(p, {}, rules)).toEqual({ land_use_list7: '2' });
});
test('small-area rules use complete decimal areas and do not silently skip unknown areas', () => {
  const p = page([field('land_use_list2', '1', ['1', '2'])]);
  const rules = {
    ...DEFAULT_CENSUS_RULES,
    smallArea: '0.005',
    smallAreaType: '3',
  };
  expect(() => censusFill(p, {}, rules)).toThrow('area');
  p.censusAreas = [{ index: '2', area: '0.0050' }];
  expect(censusFill(p, {}, rules)).toEqual({ land_use_list2: '2' });
  p.censusAreas[0].area = '1.0050';
  expect(censusFill(p, {}, rules)).toEqual({});
});
test('presets never copy identities, plot counts, areas or obsolete indexed rows', () => {
  const p = page(
    [
      'sr_no',
      'hl_name_local',
      'f_h_name_local',
      'area1',
      'area1_1',
      'tot_survey',
      'land_use_list1',
      'inst_sector',
    ].map(k => field(k, '3')),
  );
  expect(censusPreset(p)).toEqual({ inst_sector: '3' });
  expect(
    censusFill(
      page([field('inst_sector', '1')]),
      censusPreset(p),
      DEFAULT_CENSUS_RULES,
    ),
  ).toEqual({ inst_sector: '3' });
});
test('Maharashtra area division is fixed-point and requires both current editable fields', () => {
  const p = page([field('area1', '1'), field('area1_1', '0050')]);
  p.censusAreas = [{ index: '1', area: '1.0050' }];
  expect(censusAreaConversion(p, '100')).toEqual({
    area1: '0',
    area1_1: '0101',
  });
  expect(() => censusAreaConversion(p, '0')).toThrow();
  expect(() => censusAreaConversion({ ...p, fields: [] }, '100')).toThrow();
});
test('Phase 2 stages crop count and uses the current holding area, not an old preset', () => {
  const p = {
    ...page([
      field('tot_crops', '1'),
      field('field_05', '0.0000'),
      field('field_06', '0'),
      field('unirri_ar_10', '0'),
      field('unirri_ar_11', '0'),
    ]),
    url: 'https://agcensus.gov.in/AgriCensus/Schedule_H.jsp',
    censusOperatedArea: '1.25',
  };
  const rules = {
    ...DEFAULT_CENSUS_RULES,
    mode: 'phase2' as const,
    phase2Count: '2' as const,
  };
  expect(censusFill(p, { field_06: '99' }, rules)).toEqual({ tot_crops: '2' });
  p.fields[0].value = '2';
  expect(censusFill(p, {}, rules)).toEqual({ field_06: '1.2500' });
  p.fields[2].value = '1.2500';
  expect(censusFill(p, {}, rules)).toEqual({ unirri_ar_10: '1.2500' });
  expect(() =>
    censusFill({ ...p, censusOperatedArea: undefined }, {}, rules),
  ).toThrow('official operated');
});
test('mixed irrigation preserves the holding and crop totals at portal precision', () => {
  const rules = {
    ...DEFAULT_CENSUS_RULES,
    phase2HoldingIrrigatedPercent: '33.33',
    phase2Crops: [
      { code: '106', areaPercent: '75', irrigatedPercent: '40' },
      { code: '102', areaPercent: '25', irrigatedPercent: '0' },
    ],
  };
  expect(phase2Areas('1.0001', rules)).toEqual({
    irrigated: '0.3333',
    unirrigated: '0.6668',
    crops: [
      { code: '106', irrigated: '0.3000', unirrigated: '0.4500' },
      { code: '102', irrigated: '0.0000', unirrigated: '0.2500' },
    ],
  });
  expect(() =>
    phase2Areas('1', { ...rules, phase2HoldingIrrigatedPercent: '101' }),
  ).toThrow('between 0 and 100');
  expect(() => phase2Areas('0.0001', rules)).toThrow('precision');
  expect(() =>
    phase2Areas('1', {
      ...rules,
      phase2Crops: [rules.phase2Crops[0], rules.phase2Crops[0]],
    }),
  ).toThrow('distinct');
});
test('operational-holder selection is limited to identified row checkboxes', () => {
  const p = page([
    { ...field('operational-holder:2', 'false'), kind: 'checkbox' },
    { ...field('unrelated', 'false'), kind: 'checkbox' },
  ]);
  expect(
    censusFill(p, {}, { ...DEFAULT_CENSUS_RULES, mode: 'operational' }),
  ).toEqual({ 'operational-holder:2': 'true' });
});
