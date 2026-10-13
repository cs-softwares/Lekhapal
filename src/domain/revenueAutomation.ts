import { z } from 'zod';
import {
  RevenueSnapshot,
  anshShare,
  validateRevenueValues,
} from './revenueFeeding';

export const revenueAutomationSchema = z.object({
  autoSubmit: z.boolean().default(false),
  fraction: z.string().default('1/1'),
  remark: z.string().optional(),
  presets: z
    .record(z.string(), z.record(z.string(), z.string().max(2000)))
    .default({}),
});
export type RevenueAutomation = z.infer<typeof revenueAutomationSchema>;
export const DEFAULT_REVENUE_AUTOMATION = revenueAutomationSchema.parse({});
// Identity and authentication fields must always come from the current portal.
export const reusableRevenueField = (key: string) =>
  !/^(?:gataNumber|ownerName|khasra_no|name|father|area|village|survey|khasraNo|entrySeqNo)$|password|captcha|otp|token|username/i.test(
    key,
  );
export function revenuePreset(page: RevenueSnapshot) {
  return Object.fromEntries(
    page.fields
      .filter(f => !f.readOnly && reusableRevenueField(f.key))
      .map(f => [f.key, f.value]),
  );
}
export function planRevenueFill(
  page: RevenueSnapshot,
  config: RevenueAutomation,
): Record<string, string> | string {
  let byKey: Record<string, string>;
  if (page.stage === 'share') {
    const area = page.fields.find(f => f.key === 'area');
    if (!area) return 'Plot area is unavailable.';
    try {
      byKey = anshShare(area.value, config.fraction);
    } catch (e) {
      return (e as Error).message;
    }
    if (config.remark !== undefined) byKey.remark = config.remark;
  } else {
    const preset = config.presets[page.stage];
    if (!preset)
      return 'Save a reviewed preset for this section before starting automatic feeding.';
    byKey = preset;
  }
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(byKey)) {
    const fields = page.fields.filter(
      f => f.key === key && !f.readOnly && reusableRevenueField(f.key),
    );
    if (fields.length !== 1)
      return `The preset field ${key} is missing or ambiguous.`;
    if (fields[0].value !== value) patch[fields[0].ref] = value;
  }
  return validateRevenueValues(page, patch) || patch;
}
export const revenueBatchSchema = z.object({
  mode: z.enum(['normal', 'advanced']),
  context: z.string().default(''),
  gata: z.string(),
  done: z.array(z.string()).max(10000),
  owners: z.array(z.string()).max(10000),
});
