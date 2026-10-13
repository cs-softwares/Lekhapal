import {
  DEFAULT_SUBSECTION_RULES,
  planSubsection,
  recoverTreeEntries,
  sectionIsTerminal,
} from '../src/domain/khasraSections';
import {
  advancedRulesSchema,
  DEFAULT_ADVANCED_RULES,
  filledValuesStillMatch,
} from '../src/domain/khasraAdvanced';
import { FeedingField, FeedingSnapshot } from '../src/domain/khasraFeeding';

const field = (
  name: string,
  kind: FeedingField['kind'],
  value = '',
  options: FeedingField['options'] = [],
): FeedingField => ({
  ref: name,
  key: `INPUT|${kind}|${name}|${name}`,
  label: name,
  kind,
  value,
  options,
  required: false,
});
const rules = { ...DEFAULT_SUBSECTION_RULES, enabled: true, crop: 'rice' };
const page = (
  stage: FeedingSnapshot['stage'],
  fields: FeedingField[],
): FeedingSnapshot => ({
  type: 'snapshot',
  channel: 'lekhpal-feeding-v1',
  documentId: 'doc',
  revision: 1,
  url: 'https://ekhasra.up.gov.in/#/survey',
  stage,
  busy: false,
  unsupported: false,
  fields,
  actions: [],
  heading: '',
  message: '',
  plotIdentity: '12',
  plotArea: '1.25',
  remainingArea: '1.25',
});
const area = field('area', 'number', '9');
const landType = field('agriculturalType', 'select', '0', [
  { value: '0', label: 'None' },
  { value: '7', label: 'Road' },
]);
const treeType = field('vrikshType1', 'select', '1', [
  { value: '1', label: 'Category A' },
  { value: '2', label: 'Category B' },
]);

test('old settings migrate with subsection automation disabled', () => {
  const { sections: _sections, ...old } = DEFAULT_ADVANCED_RULES;
  expect(_sections.enabled).toBe(false);
  expect(advancedRulesSchema.parse(old).sections).toEqual(
    DEFAULT_SUBSECTION_RULES,
  );
});
test.each(['land', 'fallow', 'crop'] as const)(
  'selects the %s mode in a separate operation before dependent fields',
  stage => {
    const mode = { land: 'option1', fallow: 'option2', crop: 'option3' }[stage];
    expect(
      planSubsection(page(stage, [field(mode, 'radio', 'false'), area]), rules),
    ).toEqual({
      kind: 'prepare',
      values: { [mode]: 'true' },
      note: `Selecting ${mode}.`,
    });
  },
);
test('cultivated and fully fallow plots use their own current area, never a saved plot area', () => {
  expect(planSubsection(page('land', [landType, area]), rules)).toMatchObject({
    kind: 'fill',
    values: { area: '0' },
  });
  expect(planSubsection(page('fallow', [area]), rules)).toMatchObject({
    values: { area: '0' },
  });
  expect(
    planSubsection(page('fallow', [area]), { ...rules, land: 'fallow' }),
  ).toMatchObject({ values: { area: '1.25' } });
  expect(
    planSubsection(
      {
        ...page('fallow', [area]),
        remainingArea: undefined,
        plotArea: undefined,
      },
      { ...rules, land: 'fallow' },
    ),
  ).toHaveProperty('error');
});
test('non-agricultural entry selects a verified official type then fills current remaining area', () => {
  const r = { ...rules, land: 'nonAgricultural' as const, landType: '7' };
  expect(planSubsection(page('land', [landType, area]), r)).toMatchObject({
    kind: 'prepare',
    values: { agriculturalType: '7' },
  });
  expect(
    planSubsection(page('land', [{ ...landType, value: '7' }, area]), r),
  ).toMatchObject({ kind: 'fill', values: { area: '1.25' } });
  expect(
    planSubsection(page('land', [landType, area]), {
      ...r,
      landType: 'missing',
    }),
  ).toHaveProperty('error');
  expect(sectionIsTerminal('land', r)).toBe(true);
  expect(sectionIsTerminal('fallow', { ...rules, land: 'fallow' })).toBe(true);
  expect(sectionIsTerminal('fallow', rules)).toBe(false);
});
test('existing matching land rows complete without another save; different rows block', () => {
  const p = {
    ...page('fallow', [area]),
    remainingArea: '0',
    landRows: [{ type: '', area: '1.25' }],
  };
  expect(planSubsection(p, { ...rules, land: 'fallow' })).toMatchObject({
    kind: 'complete',
  });
  expect(planSubsection(p, rules)).toHaveProperty('error');
});
test('tree entries use both configured categories, scoped form and explicit counts', () => {
  const count = field('treeCount', 'number', '7');
  const p = page('trees', [
    { ...treeType, formRef: 'tree-form' },
    { ...count, formRef: 'tree-form' },
    { ...area, required: true, value: '', formRef: 'other-form' },
  ]);
  expect(planSubsection(p, rules, undefined, 0)).toMatchObject({
    kind: 'fill',
    formRef: 'tree-form',
    values: { vrikshType1: '1', treeCount: '0' },
  });
  expect(planSubsection(p, rules, undefined, 1)).toMatchObject({
    kind: 'prepare',
    values: { vrikshType1: '2' },
  });
  expect(planSubsection(p, rules, undefined, 2)).toMatchObject({
    kind: 'complete',
  });
  expect(
    planSubsection(page('trees', [treeType]), {
      ...rules,
      trees: [{ type: '1', count: '3' }],
    }),
  ).toHaveProperty('error');
});
test('tree recovery requires exact matching categories and counts, and refuses extra or conflicting records', () => {
  const p = page('trees', [treeType]);
  expect(recoverTreeEntries(p, rules)).toBeUndefined();
  expect(
    recoverTreeEntries(
      { ...p, treeRows: [{ type: 'Category A', count: '0' }] },
      rules,
    ),
  ).toBe(1);
  expect(
    recoverTreeEntries(
      {
        ...p,
        treeRows: [
          { type: 'Category B', count: '0' },
          { type: 'Category A', count: '0' },
        ],
      },
      rules,
    ),
  ).toBe(2);
  expect(
    typeof recoverTreeEntries(
      { ...p, treeRows: [{ type: 'Category A', count: '5' }] },
      rules,
    ),
  ).toBe('string');
});
test.each(['kharif', 'rabi', 'zaid'] as const)(
  '%s uses current crop and irrigation options without hardcoded seasonal crop IDs',
  season => {
    const crop = field('crop', 'select', `${season}-crop`, [
      { value: `${season}-crop`, label: 'Season crop' },
    ]);
    const irrigation = field('flexSwitchCheckDefault', 'checkbox', 'false');
    const p = {
      ...page('crop', [crop, area, irrigation]),
      officialContext: { season },
    };
    expect(
      planSubsection(p, { ...rules, crop: `${season}-crop` }),
    ).toMatchObject({
      kind: 'fill',
      values: {
        crop: `${season}-crop`,
        area: '1.25',
        flexSwitchCheckDefault: 'false',
      },
    });
    expect(planSubsection(p, rules)).toHaveProperty('error');
    expect(
      planSubsection(p, { ...rules, crop: `${season}-crop`, irrigated: true }),
    ).toMatchObject({
      kind: 'prepare',
      values: { flexSwitchCheckDefault: 'true' },
    });
    const irrigated = {
      ...p,
      fields: [
        crop,
        area,
        { ...irrigation, value: 'true' },
        field('agriTech', 'select', '', [{ value: 'well', label: 'Well' }]),
      ],
    };
    expect(
      planSubsection(irrigated, {
        ...rules,
        crop: `${season}-crop`,
        irrigated: true,
        irrigationMethod: 'well',
      }),
    ).toMatchObject({ kind: 'fill', values: { agriTech: 'well' } });
    expect(
      planSubsection(irrigated, {
        ...rules,
        crop: `${season}-crop`,
        irrigated: true,
      }),
    ).toHaveProperty('error');
  },
);
test('remarks and field identity are checked before save', () => {
  expect(
    planSubsection(
      page('trees', [treeType, field('unrecognized', 'number', '5')]),
      rules,
    ),
  ).toHaveProperty('error');
  expect(
    planSubsection(page('remarks', [field('remarks', 'textarea')]), rules),
  ).toMatchObject({ values: { remarks: 'done' } });
  expect(filledValuesStillMatch(page('fallow', []), { area: '1' })).toBe(false);
  expect(
    filledValuesStillMatch(page('fallow', [area]), { area: '9.0000' }),
  ).toBe(true);
});

test('a matching single crop resumes without another entry, but partial or changed crops pause', () => {
  const crop = field('crop', 'select', 'rice', [
    { value: 'rice', label: 'Rice' },
  ]);
  const p = {
    ...page('crop', [crop, area]),
    remainingArea: '0',
    cropRows: [{ crop: 'Rice', area: '1.25', irrigated: false }],
  };
  expect(planSubsection(p, rules)).toMatchObject({ kind: 'complete' });
  expect(
    planSubsection(
      { ...p, cropRows: [{ crop: 'Rice', area: '0.25', irrigated: false }] },
      rules,
    ),
  ).toHaveProperty('error');
  expect(
    planSubsection(
      { ...p, cropRows: [{ crop: 'Rice', area: '1.25', irrigated: true }] },
      rules,
    ),
  ).toHaveProperty('error');
});
