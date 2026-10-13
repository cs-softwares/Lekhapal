import { DEFAULT_CENSUS_RULES } from '../src/domain/census';
import {
  nextPhase2Step,
  phase2Progress,
  validatePhase2Batch,
} from '../src/domain/censusPhase2';
import { OfficialWorkSnapshot } from '../src/domain/officialWork';

const rules = {
  ...DEFAULT_CENSUS_RULES,
  mode: 'phase2' as const,
  phase2Count: '2' as const,
  phase2HoldingIrrigatedPercent: '50',
  irrigationSource: 'well',
  phase2Crops: [
    { code: '106', areaPercent: '75', irrigatedPercent: '40' },
    { code: '102', areaPercent: '25', irrigatedPercent: '0' },
  ],
};
const action = (label: string, kind: 'navigate' | 'save' = 'navigate') => ({
  label,
  ref: label,
  kind,
});
const parent = (): OfficialWorkSnapshot => ({
  channel: 'lekhpal-official-work-v1',
  type: 'snapshot',
  documentId: 'parent',
  revision: 1,
  url: 'https://agcensus.gov.in/AgriCensus/Schedule_H.jsp',
  stage: 'entry',
  busy: false,
  identity: '1',
  context: 'village=123',
  entries: [],
  notice: '',
  success: false,
  error: false,
  censusCropCodes: [],
  censusOperatedStatus: 'Partially operated',
  censusOperatedArea: '10.0000',
  fields: [
    'tot_crops',
    'field_05',
    'field_06',
    'irri_ar_10',
    'unirri_ar_10',
    'irri_ar_11',
    'unirri_ar_11',
    'source_irr',
  ].map(key => ({
    key,
    ref: key,
    label: key,
    value: '',
    kind: 'text',
    options: [],
  })),
  actions: [
    'Open serial list',
    'Open survey list',
    'Open crop chooser',
    'Calculate census area',
  ]
    .map(label => action(label))
    .concat(action('Save census entry', 'save')),
});

test('Phase 2 follows serial, operated survey, calculation, both crop popups and mixed areas before Save', () => {
  let progress = phase2Progress('2');
  let page = parent();
  const step = () => {
    const result = nextPhase2Step(page, rules, progress);
    progress = result.progress;
    return result;
  };
  const expectAction = (label: string) =>
    expect(step()).toMatchObject({ kind: 'action', action: { label } });
  expectAction('Open serial list');
  page = {
    ...page,
    documentId: 'serial',
    censusPopup: 'serial',
    censusChoices: [{ ref: 'choose2', code: '2', label: '2', checked: false }],
    actions: [action('Choose serial 2'), action('Return to census form')],
  };
  expectAction('Choose serial 2');
  page.identity = '2';
  expectAction('Return to census form');
  page = { ...parent(), identity: '2' };
  expectAction('Open survey list');
  page = {
    ...page,
    documentId: 'survey',
    censusPopup: 'survey',
    censusSurveyArea: '1.0000',
    actions: [action('Return to census form')],
  };
  expectAction('Return to census form');
  expect(progress.area).toBe('1.0000');
  page = { ...parent(), identity: '2' };
  expectAction('Calculate census area');
  expect(step().kind).toBe('wait');
  page.actions.push(action('Acknowledge census calculation'));
  expectAction('Acknowledge census calculation');
  page.actions = parent().actions;
  page.censusCalculated = true;
  expect(step()).toMatchObject({ kind: 'fill', values: { tot_crops: '2' } });
  page.fields[0].value = '2';
  for (const code of ['106', '102']) {
    expectAction('Open crop chooser');
    expect(progress.crop).toBe(code);
    const form = page;
    page = {
      ...page,
      documentId: `crop-${code}`,
      censusPopup: 'crop',
      censusChoices: [{ ref: code, code, label: code, checked: false }],
      actions: [action(`Choose crop ${code}`), action('Return to census form')],
    };
    expectAction(`Choose crop ${code}`);
    page.censusCropCodes = [...page.censusCropCodes!, code];
    expectAction('Return to census form');
    page = { ...form, censusCropCodes: page.censusCropCodes };
  }
  let result = step();
  const patched: Record<string, string> = {};
  for (let count = 0; result.kind === 'fill' && count < 20; count++) {
    Object.assign(patched, result.values);
    for (const f of page.fields)
      if (result.values[f.ref] !== undefined) f.value = result.values[f.ref];
    result = step();
  }
  expect(patched).toEqual({
    field_05: '0.5000',
    field_06: '0.5000',
    irri_ar_10: '0.3000',
    unirri_ar_10: '0.4500',
    irri_ar_11: '0.0000',
    unirri_ar_11: '0.2500',
    source_irr: 'well',
  });
  expect(result).toMatchObject({
    kind: 'action',
    action: { label: 'Save census entry', kind: 'save' },
  });
  expect(nextPhase2Step(page, rules, phase2Progress('3'))).toMatchObject({
    action: { label: 'Open serial list' },
  });
});
test('Phase 2 refuses ambiguous serials, unreturned choices and unknown survey areas', () => {
  const p = {
    ...parent(),
    censusPopup: 'serial' as const,
    censusChoices: [
      { ref: '1', code: '2', label: '2', checked: false },
      { ref: '2', code: '2', label: '2', checked: false },
    ],
  };
  expect(() => nextPhase2Step(p, rules, phase2Progress('2'))).toThrow('unique');
  p.censusChoices = [{ ...p.censusChoices[0], checked: true }];
  expect(() => nextPhase2Step(p, rules, phase2Progress('2'))).toThrow('return');
  expect(() =>
    nextPhase2Step(
      { ...parent(), censusPopup: 'survey' },
      rules,
      phase2Progress('1'),
    ),
  ).toThrow('verified');
});
test('Phase 2 rejects mismatched crop order, existing other crops and portal errors', () => {
  const page = parent();
  page.fields[0].value = '2';
  page.censusCalculated = true;
  const progress = { ...phase2Progress('1'), calculated: true, area: '1' };
  expect(() =>
    nextPhase2Step(
      { ...page, censusCropCodes: ['102', '106'] },
      rules,
      progress,
    ),
  ).toThrow('order');
  expect(() =>
    nextPhase2Step({ ...page, censusCropCodes: ['999'] }, rules, progress),
  ).toThrow('another crop');
  expect(() =>
    nextPhase2Step({ ...page, error: true }, rules, progress),
  ).toThrow('portal reported');
});
test('batch validation requires explicit distinct official crops and valid percentages', () => {
  expect(() => validatePhase2Batch({ ...rules, phase2Crops: [] })).toThrow(
    'official crop code',
  );
  expect(() =>
    validatePhase2Batch({
      ...rules,
      phase2Crops: [rules.phase2Crops[0], rules.phase2Crops[0]],
    }),
  ).toThrow('distinct');
  expect(() =>
    validatePhase2Batch({ ...rules, phase2HoldingIrrigatedPercent: '101' }),
  ).toThrow('between');
});
test('fully operated holding skips survey lookup and Phase 1 settings cannot affect Schedule H', () => {
  const page = {
    ...parent(),
    censusOperatedStatus: 'Fully operated',
    censusOperatedArea: '2',
  };
  const result = nextPhase2Step(
    page,
    { ...rules, landUse: '2', smallArea: 'bad' },
    phase2Progress('1'),
  );
  expect(result).toMatchObject({
    action: { label: 'Calculate census area' },
    progress: { area: '2' },
  });
});
