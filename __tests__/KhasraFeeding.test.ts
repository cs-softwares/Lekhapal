import {
  applyFeedingPreset,
  createFeedingPreset,
  feedingScopeKey,
  isFeedingUrl,
  isFeedingNavigationUrl,
  validateFeedingContext,
  validateFeedingValues,
  FeedingSnapshot,
} from '../src/domain/khasraFeeding';

const context = {
  year: '1433',
  season: 'kharif' as const,
  village: 'Village A',
  villageCode: '117944',
};
const snapshot: FeedingSnapshot = {
  type: 'snapshot',
  channel: 'lekhpal-feeding-v1',
  documentId: 'doc',
  revision: 1,
  url: 'https://ekhasra.up.gov.in/#/lekhpalInsertFasal',
  stage: 'crop',
  busy: false,
  unsupported: false,
  heading: 'Crop',
  message: '',
  actions: [],
  fields: [
    {
      ref: 'area',
      key: 'INPUT|number|area',
      label: 'Area',
      kind: 'number',
      required: true,
      value: '1',
      options: [],
    },
    {
      ref: 'crop',
      key: 'SELECT|select|crop',
      label: 'Crop',
      kind: 'select',
      required: true,
      value: 'rice',
      options: [{ value: 'rice', label: 'Rice' }],
    },
  ],
};

test('allows the observed RCCMS login handoff but never enables feeding on that origin', () => {
  const url = 'https://rccms.up.gov.in/dashboard/login/';
  expect(isFeedingNavigationUrl(url)).toBe(true);
  expect(isFeedingUrl(url)).toBe(false);
  expect(
    isFeedingNavigationUrl(
      'https://rccms.up.gov.in.example.com/dashboard/login/',
    ),
  ).toBe(false);
  expect(
    isFeedingNavigationUrl('http://rccms.up.gov.in/dashboard/login/'),
  ).toBe(false);
});

test.each([
  'http://ekhasra.up.gov.in',
  'https://ekhasra.up.gov.in.example.com',
  'https://example.com',
  'https://user@ekhasra.up.gov.in',
  'https://ekhasra.up.gov.in:444',
  'file:///tmp/page',
])('rejects an unofficial feeding URL: %s', url => {
  expect(isFeedingUrl(url)).toBe(false);
});
test('requires an explicit Fasli year and village identity; presets cannot cross seasons or villages with the same name', () => {
  expect(validateFeedingContext(context)).toBeNull();
  expect(validateFeedingContext({ ...context, year: '2026' })).toBeTruthy();
  expect(validateFeedingContext({ ...context, villageCode: '' })).toBeTruthy();
  const key = feedingScopeKey(context);
  expect(feedingScopeKey({ ...context, villageCode: '117945' })).not.toBe(key);
  expect(feedingScopeKey({ ...context, season: 'rabi' })).not.toBe(key);
  expect(feedingScopeKey({ ...context, year: '1434' })).not.toBe(key);
  expect(feedingScopeKey({ ...context, village: 'Another spelling' })).toBe(
    key,
  );
});
test('rejects negative areas, missing required fields and options no longer on the official form', () => {
  expect(validateFeedingValues(snapshot, {})).toBeNull();
  expect(validateFeedingValues(snapshot, { area: '-1' })).toBeTruthy();
  expect(validateFeedingValues(snapshot, { area: '' })).toBeTruthy();
  expect(validateFeedingValues(snapshot, { crop: 'wheat' })).toBeTruthy();
  expect(
    validateFeedingValues({ ...snapshot, stage: 'login' }, {}),
  ).toBeTruthy();
  expect(validateFeedingValues({ ...snapshot, busy: true }, {})).toBeTruthy();
  const textArea = {
    ...snapshot,
    fields: snapshot.fields.map(f =>
      f.ref === 'area' ? { ...f, kind: 'text' as const } : f,
    ),
  };
  expect(validateFeedingValues(textArea, { area: '-0.1' })).toBeTruthy();
  expect(
    validateFeedingValues(textArea, { area: 'not a number' }),
  ).toBeTruthy();
});
test('presets match semantic fields across new DOM refs but refuse changed forms and removed options', () => {
  const preset = createFeedingPreset(snapshot, { area: '0.3' });
  const next = {
    ...snapshot,
    fields: snapshot.fields.map(f => ({ ...f, ref: `next-${f.ref}` })),
  };
  expect(applyFeedingPreset(next, preset)).toEqual({
    'next-area': '1',
    'next-crop': 'rice',
  });
  expect(applyFeedingPreset({ ...next, stage: 'trees' }, preset)).toBeNull();
  expect(
    applyFeedingPreset({ ...next, fields: next.fields.slice(1) }, preset),
  ).toBeNull();
  expect(
    applyFeedingPreset(
      { ...next, fields: next.fields.map(f => ({ ...f, key: 'changed' })) },
      preset,
    ),
  ).toBeNull();
  expect(
    applyFeedingPreset(
      { ...next, fields: next.fields.map(f => ({ ...f, options: [] })) },
      preset,
    ),
  ).toBeNull();
});

test('crop presets retain each plot area and stop on a missing required area', () => {
  const preset = createFeedingPreset(snapshot, { area: '99' });
  const next = {
    ...snapshot,
    fields: snapshot.fields.map(f =>
      f.ref === 'area' ? { ...f, value: '0.125' } : f,
    ),
  };
  expect(applyFeedingPreset(next, preset)?.area).toBe('0.125');
  expect(
    applyFeedingPreset(
      {
        ...next,
        fields: next.fields.map(f =>
          f.ref === 'area' ? { ...f, value: '' } : f,
        ),
      },
      preset,
    ),
  ).toBeNull();
});
