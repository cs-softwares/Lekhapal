import { z } from 'zod';
import { RevenueSnapshot } from './revenueFeeding';

export const propertyContextSchema = z.object({
  village: z.string().min(1),
  survey: z.string().min(1),
  gata: z.string().min(1),
});
export type PropertyContext = z.infer<typeof propertyContextSchema>;
export const propertyQueueSchema = z.object({
  context: propertyContextSchema,
  items: z
    .array(
      z.object({
        number: z.string().regex(/^[1-9]\d{0,8}$/),
        status: z.enum([
          'pending',
          'prepared',
          'confirmed',
          'skipped',
          'uncertain',
        ]),
      }),
    )
    .min(1)
    .max(1000),
});
export type PropertyQueue = z.infer<typeof propertyQueueSchema>;
export type PropertyReceipt = {
  id: string;
  context: PropertyContext;
  number: string;
  confirmed: boolean;
};
const normalize = (s: string) =>
  s.replace(/[०-९]/g, c => String(c.charCodeAt(0) - 0x966)).trim();
export function propertyNumbers(
  from: string,
  to: string,
  custom: string,
): string[] {
  let values: string[];
  if (custom.trim())
    values = normalize(custom)
      .split(/[\s,;]+/)
      .filter(Boolean);
  else {
    const a = normalize(from),
      b = normalize(to);
    if (
      !/^[1-9]\d{0,8}$/.test(a) ||
      !/^[1-9]\d{0,8}$/.test(b) ||
      +b < +a ||
      +b - +a >= 1000
    )
      throw Error('Enter a property range of 1–1000 entries.');
    values = Array.from({ length: +b - +a + 1 }, (_, i) => String(+a + i));
  }
  if (
    !values.length ||
    values.length > 1000 ||
    values.some(v => !/^[1-9]\d{0,8}$/.test(v))
  )
    throw Error(
      'Enter up to 1000 positive property numbers, separated by commas.',
    );
  return [...new Set(values)];
}
export function propertyContext(page: RevenueSnapshot): PropertyContext | null {
  const read = (key: string) =>
    page.fields.find(f => f.key === key)?.value.trim() || '';
  const context = {
    village: read('village'),
    survey: read('survey'),
    gata: read('khasraNo'),
  };
  return Object.values(context).every(v => v && v !== '0' && v !== '-1')
    ? context
    : null;
}
export const samePropertyContext = (a: PropertyContext, b: PropertyContext) =>
  a.village === b.village && a.survey === b.survey && a.gata === b.gata;
export function receivePropertyResult(
  queue: PropertyQueue,
  receipt: PropertyReceipt,
): PropertyQueue {
  if (!samePropertyContext(queue.context, receipt.context)) return queue;
  return {
    ...queue,
    items: queue.items.map(item =>
      item.number === receipt.number && item.status === 'prepared'
        ? { ...item, status: receipt.confirmed ? 'confirmed' : 'uncertain' }
        : item,
    ),
  };
}
