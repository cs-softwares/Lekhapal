import {
  DEFAULT_ADVANCED_RULES,
  planAdvancedFill,
  nextSectionAction,
  validateAdvancedRules,
} from '../src/domain/khasraAdvanced';
import {
  FeedingSnapshot,
  createFeedingPreset,
} from '../src/domain/khasraFeeding';

const page: FeedingSnapshot = {
  type: 'snapshot',
  channel: 'lekhpal-feeding-v1',
  documentId: 'doc',
  revision: 1,
  url: 'https://ekhasra.up.gov.in/#/lekhpalInsertFasal',
  stage: 'crop',
  busy: false,
  unsupported: false,
  heading: '',
  message: '',
  plotIdentity: '12',
  plotArea: '0.05',
  actions: [],
  fields: [
    {
      ref: 'crop',
      key: 'SELECT|select|crop',
      label: 'फसल / Crop',
      kind: 'select',
      required: true,
      value: 'rice',
      options: [
        { value: 'rice', label: 'धान' },
        { value: '67', label: 'रिक्त' },
      ],
    },
    {
      ref: 'area',
      key: 'INPUT|number|area',
      label: 'Area',
      kind: 'number',
      required: true,
      value: '0.05',
      options: [],
    },
    {
      ref: 'water',
      key: 'INPUT|checkbox|flexSwitchCheckDefault',
      label: 'Irrigated',
      kind: 'checkbox',
      required: false,
      value: 'true',
      options: [],
    },
  ],
};
const preset = createFeedingPreset(page, { area: '9' });
const rules = {
  ...DEFAULT_ADVANCED_RULES,
  smallAreaEnabled: true,
  smallAreaThreshold: '0.05',
};
test('small-area rule is opt-in, inclusive and uses the current season option', () => {
  expect(planAdvancedFill(page, preset, DEFAULT_ADVANCED_RULES)).toMatchObject({
    values: { crop: 'rice', area: '0.05', water: 'true' },
  });
  expect(planAdvancedFill(page, preset, rules)).toMatchObject({
    values: { crop: '67', area: '0.05', water: 'false' },
  });
  const rabi = {
    ...page,
    fields: page.fields.map(f =>
      f.ref === 'crop'
        ? {
            ...f,
            options: [
              { value: 'rice', label: 'धान' },
              { value: '61', label: 'रिक्त' },
            ],
          }
        : f,
    ),
  };
  expect(planAdvancedFill(rabi, preset, rules)).toMatchObject({
    values: { crop: '61' },
  });
  expect(
    planAdvancedFill({ ...page, plotArea: '0.051' }, preset, rules),
  ).toMatchObject({ values: { crop: 'rice' } });
});
test('requires real plot area and a unique blank option; no synthetic fallback area', () => {
  expect(
    planAdvancedFill({ ...page, plotArea: undefined }, preset, rules),
  ).toHaveProperty('error');
  expect(
    planAdvancedFill({ ...page, plotArea: undefined }, preset, rules, '0.04'),
  ).toHaveProperty('values.crop', '67');
  const withoutBlank = {
    ...page,
    fields: page.fields.map(f =>
      f.ref === 'crop' ? { ...f, options: [f.options[0]] } : f,
    ),
  };
  expect(planAdvancedFill(withoutBlank, preset, rules)).toHaveProperty('error');
  expect(
    validateAdvancedRules({ ...rules, smallAreaThreshold: '-1' }),
  ).toBeTruthy();
  expect(
    validateAdvancedRules({ ...rules, smallAreaThreshold: '' }),
  ).toBeTruthy();
});
test('uses a detected remaining area only for a single empty area field', () => {
  const emptyArea = {
    ...page,
    remainingArea: '0.02',
    fields: page.fields.map(f => (f.ref === 'area' ? { ...f, value: '' } : f)),
  };
  expect(
    planAdvancedFill(emptyArea, preset, DEFAULT_ADVANCED_RULES),
  ).toHaveProperty('values.area', '0.02');
  expect(
    planAdvancedFill(
      { ...emptyArea, remainingArea: undefined },
      preset,
      DEFAULT_ADVANCED_RULES,
    ),
  ).toHaveProperty('error');
  expect(
    planAdvancedFill(
      { ...page, remainingArea: '0.02' },
      preset,
      DEFAULT_ADVANCED_RULES,
    ),
  ).toHaveProperty('values.area', '0.05');
});
test('progression requires a unique forward action and never substitutes save, back or lock', () => {
  const next = { ref: 'next', kind: 'navigate' as const, label: 'अगला' };
  expect(
    nextSectionAction({
      ...page,
      actions: [
        next,
        { ref: 'back', kind: 'navigate', label: 'Back' },
        { ref: 'lock', kind: 'lock', label: 'Lock' },
      ],
    }),
  ).toEqual(next);
  expect(
    nextSectionAction({ ...page, actions: [next, { ...next, ref: 'other' }] }),
  ).toBeUndefined();
  expect(
    nextSectionAction({ ...page, actions: [{ ...next, kind: 'save' }] }),
  ).toBeUndefined();
});
