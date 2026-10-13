import {
  activeQueueItem,
  addQueueGatas,
  emptyFeedingQueue,
  gataKey,
  gataRange,
  nextQueueItem,
  recoverFeedingQueue,
  updateQueueItem,
} from '../src/domain/khasraQueue';

test('numeric ranges validate limits and cannot silently treat a subdivision as an integer', () => {
  expect(gataRange('१२', '१४')).toEqual(['12', '13', '14']);
  expect(() => gataRange('12/1', '14')).toThrow();
  expect(() => gataRange('14', '12')).toThrow();
  expect(() => gataRange('1', '501')).toThrow();
  expect(() => gataRange('0', '10')).toThrow();
});
test('deduplicates Hindi/English digit variants while preserving subdivision identity', () => {
  const q = addQueueGatas(emptyFeedingQueue('village-a'), [
    '१२',
    '12',
    '12/1',
    '12/2',
    '13क',
  ]);
  expect(q.items.map(item => item.gata)).toEqual(['१२', '12/1', '12/2', '13क']);
  expect(gataKey(' १२ / १ ')).toBe('12/1');
  expect(() => addQueueGatas(q, ['<script>'])).toThrow();
});
test('an active or uncertain plot prevents selecting another plot until review or skip', () => {
  let q = addQueueGatas(emptyFeedingQueue('village-a'), ['12', '13']);
  expect(nextQueueItem(q)?.gata).toBe('12');
  q = updateQueueItem(q, '12', 'opening');
  expect(nextQueueItem(q)).toBeUndefined();
  q = updateQueueItem(q, '12', 'uncertain');
  expect(activeQueueItem(q)?.gata).toBe('12');
  expect(nextQueueItem(q)).toBeUndefined();
  q = updateQueueItem(q, '12', 'skipped');
  expect(nextQueueItem(q)?.gata).toBe('13');
});
test('recovery is paused, retains completed work and never restarts an interrupted plot', () => {
  let q = addQueueGatas(emptyFeedingQueue('village-a'), ['12', '13', '14']);
  q = updateQueueItem(q, '12', 'reviewed');
  q = updateQueueItem(q, '13', 'active');
  q.running = true;
  const restored = recoverFeedingQueue(JSON.stringify(q), 'village-a');
  expect(restored.running).toBe(false);
  expect(restored.items.map(item => item.status)).toEqual([
    'reviewed',
    'uncertain',
    'queued',
  ]);
  expect(() => recoverFeedingQueue(JSON.stringify(q), 'village-b')).toThrow();
  expect(nextQueueItem(restored)).toBeUndefined();
});
