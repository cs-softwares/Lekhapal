import { createInitialDeskState } from '../test-support/deskData';
import {
  decideMutation,
  polygonArea,
  reliefPayout,
  selfIntersects,
} from '../src/domain/desk';
const now = Date.parse('2026-09-22T12:00:00.000Z');
test('approving a transfer preserves co-owners and total ownership', () => {
  const initial = createInitialDeskState();
  const next = decideMutation(
    initial,
    'MUT-2026-3101',
    'Approved',
    'Verified',
    now,
  );
  expect(next.lands[0].owners).toEqual([
    { name: 'Kamla Devi', share: 25 },
    { name: 'Amit Prasad', share: 75 },
  ]);
  expect(next.lands[0].owners.reduce((n, o) => n + o.share, 0)).toBe(100);
  expect(initial.lands[0].owners[0].name).toBe('Ram Prasad');
  expect(() =>
    decideMutation(next, 'MUT-2026-3101', 'Approved', '', now),
  ).toThrow('already closed');
});
test('notice period, objections, identity and stale seller shares block approval', () => {
  const initial = createInitialDeskState();
  expect(() =>
    decideMutation(
      initial,
      'MUT-2026-3101',
      'Approved',
      '',
      Date.parse('2026-09-10'),
    ),
  ).toThrow('15-day');
  expect(() =>
    decideMutation(initial, 'MUT-2026-3103', 'Approved', '', now),
  ).toThrow('objection');
  expect(() =>
    decideMutation(initial, 'MUT-2026-3104', 'Approved', '', now),
  ).toThrow('identity');
  const stale = {
    ...initial,
    lands: initial.lands.map(l => ({
      ...l,
      owners: [{ name: 'Different seller', share: 100 }],
    })),
  };
  expect(() =>
    decideMutation(stale, 'MUT-2026-3101', 'Approved', '', now),
  ).toThrow('Seller share changed');
});
test('rejection requires a reason and never updates land ownership', () => {
  const initial = createInitialDeskState();
  expect(() =>
    decideMutation(initial, 'MUT-2026-3101', 'Rejected', '', now),
  ).toThrow('legal reason');
  const next = decideMutation(
    initial,
    'MUT-2026-3101',
    'Rejected',
    'Deed does not match parcel',
    now,
  );
  expect(next.lands).toEqual(initial.lands);
  expect(next.mutations[0].status).toBe('Rejected');
});
test('polygon area is accurate for a known equatorial parcel and independent of winding', () => {
  const p = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 0.001 },
    { latitude: 0.001, longitude: 0.001 },
    { latitude: 0.001, longitude: 0 },
  ];
  expect(polygonArea(p)).toBeCloseTo(12364.346, 0);
  expect(polygonArea([...p].reverse())).toBeCloseTo(polygonArea(p), 3);
  expect(polygonArea(p.slice(0, 2))).toBe(0);
  expect(selfIntersects(p)).toBe(false);
  expect(selfIntersects([p[0], p[2], p[1], p[3]])).toBe(true);
});
test('relief calculator respects zero/complete loss and rejects invalid input', () => {
  expect(reliefPayout(1.25, 35, 17000)).toBe(7438);
  expect(reliefPayout(1.25, 0, 17000)).toBe(0);
  expect(reliefPayout(1.25, 100, 17000)).toBe(21250);
  for (const loss of [-1, 101, NaN]) {
    expect(() => reliefPayout(1, loss, 17000)).toThrow();
  }
  expect(() => reliefPayout(-1, 50, 17000)).toThrow();
});
