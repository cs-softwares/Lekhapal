import { reconcileCropPlan, CropPlanRow } from '../src/domain/cropPlan';
import { FeedingSnapshot } from '../src/domain/khasraFeeding';
const rows: CropPlanRow[] = [
  { crop: 'p', percent: '60', irrigated: true },
  { crop: 'w', percent: '40', irrigated: false },
];
const p = {
  fields: [
    {
      ref: 'crop',
      key: 'crop',
      kind: 'select',
      label: 'Crop',
      options: [
        { value: 'p', label: 'धान' },
        { value: 'w', label: 'गेहूँ' },
      ],
    },
  ],
  remainingArea: '0.4000',
  cropRows: [{ crop: 'धान', area: '0.6000', irrigated: true }],
} as FeedingSnapshot;
test('a restarted plan resumes after exact official crop rows and matching remaining area', () => {
  expect(reconcileCropPlan(p, rows, '1')).toBe(1);
  expect(
    reconcileCropPlan(
      {
        ...p,
        cropRows: [
          ...p.cropRows!,
          { crop: 'गेहूँ', area: '0.4', irrigated: false },
        ],
        remainingArea: '0',
      },
      rows,
      '1',
    ),
  ).toBe(2);
});
test('no recovery from area alone, different crop, irrigation, extra rows or stale remaining area', () => {
  expect(
    reconcileCropPlan({ ...p, cropRows: undefined }, rows, '1'),
  ).toBeUndefined();
  for (const modified of [
    { ...p, remainingArea: '1' },
    { ...p, cropRows: [{ crop: 'गेहूँ', area: '0.6', irrigated: true }] },
    { ...p, cropRows: [{ ...p.cropRows![0], irrigated: false }] },
    { ...p, cropRows: Array(3).fill(p.cropRows![0]) },
  ])
    expect(typeof reconcileCropPlan(modified, rows, '1')).toBe('string');
});
test('ambiguous crop labels block recovery and repeated identical rows are counted', () => {
  const ambiguous = {
    ...p,
    fields: [
      {
        ...p.fields[0],
        options: [...p.fields[0].options, { value: 'x', label: 'धान' }],
      },
    ],
  };
  expect(typeof reconcileCropPlan(ambiguous, rows, '1')).toBe('string');
  const repeated = [
    { crop: 'p', percent: '50', irrigated: true },
    { crop: 'p', percent: '50', irrigated: true },
  ];
  expect(
    reconcileCropPlan(
      {
        ...p,
        remainingArea: '0',
        cropRows: Array(2).fill({ crop: 'धान', area: '0.5', irrigated: true }),
      },
      repeated,
      '1',
    ),
  ).toBe(2);
});
