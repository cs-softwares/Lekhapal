import {
  parseKhasraBulk,
  importKhasraBulk,
  resolveImportedCrops,
  filterReport,
  localDay,
  reportStatus,
  khasraReportCsv,
  khasraReportHtml,
} from '../src/domain/khasraBulk';
import {
  emptyFeedingQueue,
  recoverFeedingQueue,
  updateQueueItem,
} from '../src/domain/khasraQueue';
import { applyCropPlan, reconcileCropPlan } from '../src/domain/cropPlan';
import { FeedingSnapshot } from '../src/domain/khasraFeeding';
const raw =
  'Gata\tCrop\tArea_ha\tIrrigation\n१२/१\tधान\t०.१२३४\tसिंचित\n12/1\tधान\t0.0766\tNo\n13\tगेहूँ\t0.5000\tYes';
const context = {
  year: '1433',
  season: 'kharif' as const,
  village: 'गांव',
  villageCode: '117944',
};
const review = () => parseKhasraBulk(raw);
const page = {
  plotArea: '0.3',
  remainingArea: '0.2',
  cropRows: [],
  fields: [
    {
      ref: 'crop',
      key: 'crop',
      label: 'Crop',
      kind: 'select',
      options: [
        { value: 'p', label: 'धान' },
        { value: 'w', label: 'गेहूँ' },
      ],
    },
    { ref: 'area', key: 'area', label: 'Area', kind: 'number' },
    {
      ref: 'irr',
      key: 'flexSwitchCheckDefault',
      label: 'Irrigated',
      kind: 'checkbox',
    },
  ],
} as unknown as FeedingSnapshot;
test('groups Hindi/English Gata variants and preserves exact areas and mixed irrigation', () => {
  const r = review();
  expect(r.errors).toEqual([]);
  expect(r.plots).toHaveLength(2);
  expect(r.plots[0].plan.map(p => [p.area, p.irrigated])).toEqual([
    ['0.1234', true],
    ['0.0766', false],
  ]);
  expect(r.plots[1].gata).toBe('13');
});
test.each([
  ['12|Rice|0.1|yes\n१२|rice|0.2|yes', 'Duplicate'],
  ['12|Rice|0.12345|yes', '4 decimal'],
  ['12|Rice|0|yes', 'positive'],
  ['12|Rice|-1|yes', 'positive'],
  ['12|Rice|1e2|yes', 'positive'],
  ['12|Rice|1|maybe', 'Irrigation'],
  ['12|Rice|1|', 'Irrigation'],
  ['12|Rice|1', 'four columns'],
  ['12|Rice|1|yes|extra', 'four columns'],
  ['bad-gata|Rice|1|yes', 'Gata'],
  ['Gata|Crop|Area_acres|Irrigation\n12|Rice|1|yes', 'headers'],
  ['12,"Rice, broken,0.1,Yes', 'quoted'],
])(
  'rejects invalid input without importing partial work: %s',
  (input, error) => {
    const r = parseKhasraBulk(input);
    expect(r.errors[0].message).toContain(error);
    expect(() => importKhasraBulk(emptyFeedingQueue('a'), r)).toThrow();
  },
);
test('quoted CSV crops with commas and escaped quotes are parsed intact', () => {
  const r = parseKhasraBulk('12,"Crop, ""A""",0.1,yes');
  expect(r.errors).toEqual([]);
  expect(r.plots[0].plan[0].crop).toBe('Crop, "A"');
});
test('rejects 501 plots and more than 10 crops per plot', () => {
  expect(
    parseKhasraBulk(
      Array.from({ length: 501 }, (_, i) => `${i + 1}|Rice|1|yes`).join('\n'),
    ).errors[0].message,
  ).toContain('500');
  expect(
    parseKhasraBulk(
      Array.from({ length: 11 }, (_, i) => `1|Crop ${i}|1|yes`).join('\n'),
    ).errors[0].message,
  ).toContain('10');
});
test('import is atomic, refuses existing Gatas and survives a paused restart', () => {
  const q = importKhasraBulk(emptyFeedingQueue('a'), review());
  expect(() => importKhasraBulk(q, review())).toThrow('already');
  expect(q.items).toHaveLength(2);
  const restored = recoverFeedingQueue(JSON.stringify(q), 'a');
  expect(restored.items[0].plan).toEqual(review().plots[0].plan);
  expect(() => recoverFeedingQueue(JSON.stringify(q), 'b')).toThrow();
  const interrupted = updateQueueItem(q, '12/1', 'active');
  expect(() => importKhasraBulk(interrupted, review())).toThrow('review');
  expect(
    recoverFeedingQueue(JSON.stringify(interrupted), 'a').items[0].status,
  ).toBe('uncertain');
});
test('matches official labels uniquely and refuses unavailable crop/table/irrigation evidence', () => {
  const plan = review().plots[0].plan;
  expect(resolveImportedCrops(plan, page)[0].crop).toBe('p');
  expect(() =>
    resolveImportedCrops([{ ...plan[0], crop: 'Rice' }], page),
  ).toThrow('uniquely');
  expect(() =>
    resolveImportedCrops(plan, { ...page, cropRows: undefined }),
  ).toThrow('table');
  expect(() =>
    resolveImportedCrops(plan, { ...page, fields: page.fields.slice(0, 2) }),
  ).toThrow('irrigation');
  expect(() =>
    resolveImportedCrops(plan, {
      ...page,
      fields: [
        {
          ...page.fields[0],
          options: [...page.fields[0].options, { label: 'धान', value: 'x' }],
        },
        ...page.fields.slice(1),
      ],
    }),
  ).toThrow('uniquely');
});
test('exact mixed-irrigation plan resumes only from matching rows and full available crop area', () => {
  const rows = resolveImportedCrops(review().plots[0].plan, page);
  expect(reconcileCropPlan(page, rows, page.plotArea)).toBe(0);
  expect(applyCropPlan(page, {}, rows, 0, page.plotArea)).toEqual({
    crop: 'p',
    area: '0.1234',
    irr: 'true',
  });
  const saved = {
    ...page,
    remainingArea: '0.0766',
    cropRows: [{ crop: 'धान', area: '0.1234', irrigated: true }],
  };
  expect(reconcileCropPlan(saved, rows, page.plotArea)).toBe(1);
  expect(applyCropPlan(saved, {}, rows, 1, page.plotArea)).toEqual({
    crop: 'p',
    area: '0.0766',
    irr: 'false',
  });
  for (const invalid of [
    { ...saved, remainingArea: '0.2' },
    { ...saved, remainingArea: '0.01' },
    { ...saved, cropRows: [{ ...saved.cropRows[0], irrigated: false }] },
  ])
    expect(typeof reconcileCropPlan(invalid, rows, page.plotArea)).toBe(
      'string',
    );
  expect(typeof reconcileCropPlan(page, rows, '0.1')).toBe('string');
  expect(
    typeof applyCropPlan({ ...page, remainingArea: '0.3' }, {}, rows, 0, '0.3'),
  ).toBe('string');
});
test('reports require explicit portal confirmation and escape HTML/CSV', () => {
  let q = importKhasraBulk(emptyFeedingQueue('a'), review());
  q = updateQueueItem(q, '12/1', 'reviewed', '=HYPERLINK("evil") <script>');
  expect(reportStatus(q.items[0])).toBe('Needs review');
  q.items[0].confirmation = { id: 'confirmed-1', at: new Date().toISOString() };
  expect(reportStatus(q.items[0])).toBe('Confirmed');
  expect(
    filterReport(
      q.items,
      localDay(new Date().toISOString()),
      'धान',
      'Confirmed',
    ),
  ).toHaveLength(1);
  expect(filterReport(q.items, '1900-01-01', '', '')).toHaveLength(0);
  const csv = khasraReportCsv({ ...context, village: '@formula' }, q.items);
  expect(csv).toContain('"\'@formula"');
  expect(csv).toContain('"\'=HYPERLINK');
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  const html = khasraReportHtml(context, q.items, '', 1);
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('not an official government receipt');
});

test('large escaped reports are split without dropping rows or exceeding the renderer size limit', () => {
  const { khasraReportParts } = require('../src/domain/khasraBulk');
  const item = importKhasraBulk(emptyFeedingQueue('a'), review()).items[0];
  const items = Array.from({ length: 70 }, (_, i) => ({
    ...item,
    gata: String(i + 1),
    note: '<'.repeat(2000),
    plan: Array.from({ length: 10 }, (_, j) => ({
      crop: '<'.repeat(150),
      area: '0.1',
      irrigated: false,
      sourceRow: j + 1,
    })),
  }));
  const parts = khasraReportParts(context, items, '2026-10-12');
  expect(parts.flat()).toEqual(items);
  expect(parts.length).toBeGreaterThan(3);
  parts.forEach((part: typeof items, i: number) => {
    expect(part.length).toBeLessThanOrEqual(30);
    expect(
      khasraReportHtml(context, part, '2026-10-12', i + 1).length,
    ).toBeLessThan(180000);
  });
});
