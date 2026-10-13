import { z } from 'zod';

export const importedCropSchema = z.object({
  crop: z.string().trim().min(1).max(150),
  area: z
    .string()
    .regex(/^\d{1,8}(?:\.\d{1,4})?$/)
    .refine(n => Number(n) > 0),
  irrigated: z.boolean(),
  sourceRow: z.number().int().positive(),
});

export const gataKey = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[०-९]/g, digit => String('०१२३४५६७८९'.indexOf(digit)))
    .toLowerCase();
export const isGataNumber = (value: string) =>
  /^[0-9]+(?:[/.-][0-9a-z\u0900-\u097f]+)*[a-z\u0900-\u097f]*$/i.test(
    gataKey(value),
  );
const itemSchema = z.object({
  gata: z.string().min(1).max(80),
  status: z.enum([
    'queued',
    'opening',
    'active',
    'reviewed',
    'skipped',
    'uncertain',
  ]),
  note: z.string().max(2000).default(''),
  plan: z.array(importedCropSchema).min(1).max(10).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  confirmation: z
    .object({ id: z.string().min(1), at: z.string().datetime() })
    .optional(),
});
export const feedingQueueSchema = z.object({
  version: z.literal(1),
  id: z.string().max(100).optional(),
  scope: z.string(),
  running: z.boolean(),
  items: z.array(itemSchema).max(500),
});
export type FeedingQueue = z.infer<typeof feedingQueueSchema>;
export type QueueItem = z.infer<typeof itemSchema>;
export const emptyFeedingQueue = (scope: string): FeedingQueue => ({
  version: 1,
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  scope,
  running: false,
  items: [],
});

export function gataRange(from: string, to: string): string[] {
  const a = gataKey(from),
    b = gataKey(to);
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b))
    throw new Error(
      'Use whole gata numbers for a range. Add subdivided gatas individually.',
    );
  const start = Number(a),
    end = Number(b);
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 1 ||
    end < start ||
    end - start >= 500
  )
    throw new Error('Choose an increasing range of up to 500 gatas.');
  return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
}
export function addQueueGatas(
  queue: FeedingQueue,
  gatas: string[],
): FeedingQueue {
  const known = new Set(queue.items.map(item => gataKey(item.gata)));
  const additions: QueueItem[] = [];
  for (const gata of gatas) {
    if (!isGataNumber(gata)) throw new Error(`Invalid gata number: ${gata}`);
    const key = gataKey(gata);
    if (!known.has(key)) {
      known.add(key);
      additions.push({
        gata: gata.trim(),
        status: 'queued',
        note: '',
        createdAt: new Date().toISOString(),
      });
    }
  }
  if (queue.items.length + additions.length > 500)
    throw new Error('A queue can contain up to 500 gatas.');
  return { ...queue, items: [...queue.items, ...additions] };
}
export const activeQueueItem = (queue: FeedingQueue) =>
  queue.items.find(item =>
    ['opening', 'active', 'uncertain'].includes(item.status),
  );
export const nextQueueItem = (queue: FeedingQueue) =>
  activeQueueItem(queue)
    ? undefined
    : queue.items.find(item => item.status === 'queued');
export function updateQueueItem(
  queue: FeedingQueue,
  gata: string,
  status: QueueItem['status'],
  note = '',
): FeedingQueue {
  const key = gataKey(gata);
  return {
    ...queue,
    items: queue.items.map(item =>
      gataKey(item.gata) === key
        ? {
            ...item,
            status,
            note,
            updatedAt: new Date().toISOString(),
            confirmation: undefined,
          }
        : item,
    ),
  };
}
export function recoverFeedingQueue(
  raw: string | null,
  scope: string,
): FeedingQueue {
  if (!raw) return emptyFeedingQueue(scope);
  const queue = feedingQueueSchema.parse(JSON.parse(raw));
  if (queue.scope !== scope)
    throw new Error('This queue belongs to a different village or season.');
  if (
    new Set(queue.items.map(item => gataKey(item.gata))).size !==
      queue.items.length ||
    queue.items.some(item => !isGataNumber(item.gata))
  )
    throw new Error('The saved queue contains invalid or duplicate gatas.');
  return {
    ...queue,
    running: false,
    items: queue.items.map(item =>
      ['opening', 'active'].includes(item.status)
        ? {
            ...item,
            status: 'uncertain',
            note: 'Interrupted. Check this gata before continuing.',
          }
        : item,
    ),
  };
}
