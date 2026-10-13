import { z } from 'zod';
import {
  FeedingSnapshot,
  FeedingValues,
  isPlotAreaField,
} from './khasraFeeding';
export const cropPlanRowSchema = z.object({
  crop: z.string().min(1),
  percent: z.string(),
  area: z.string().optional(),
  irrigated: z.boolean(),
});
export type CropPlanRow = z.infer<typeof cropPlanRowSchema>;
const units = (value: string, scale: number) => {
  if (!/^\d+(?:\.\d+)?$/.test(value))
    throw Error('Enter a valid positive area or percentage.');
  const [whole, decimal = ''] = value.split('.');
  if (decimal.length > scale)
    throw Error(`Use at most ${scale} decimal places.`);
  return (
    BigInt(whole) * 10n ** BigInt(scale) + BigInt(decimal.padEnd(scale, '0'))
  );
};
export function cropPlanAreas(area: string, rows: CropPlanRow[]): string[] {
  if (!rows.length || rows.length > 10) throw Error('Choose 1–10 crops.');
  if (rows.some(r => r.area !== undefined)) {
    const parts = rows.map(r => units(r.area ?? '', 4));
    if (
      parts.some(n => n <= 0n) ||
      parts.reduce((a, b) => a + b, 0n) > units(area, 4)
    )
      throw Error(
        'Imported crop areas must be positive and cannot exceed the official plot area.',
      );
    return parts.map(
      n => `${n / 10000n}.${String(n % 10000n).padStart(4, '0')}`,
    );
  }
  const weights = rows.map(r => units(r.percent, 2));
  if (
    weights.some(w => w <= 0n) ||
    weights.reduce((a, b) => a + b, 0n) !== 10000n
  )
    throw Error('Crop percentages must add up to exactly 100.');
  const total = units(area, 4);
  let allocated = 0n;
  return weights.map((w, i) => {
    const amount =
      i === weights.length - 1 ? total - allocated : (total * w) / 10000n;
    allocated += amount;
    if (amount <= 0n) throw Error('A crop area is below the portal precision.');
    return `${amount / 10000n}.${String(amount % 10000n).padStart(4, '0')}`;
  });
}
export function applyCropPlan(
  page: FeedingSnapshot,
  values: FeedingValues,
  rows: CropPlanRow[],
  index: number,
  area?: string,
): FeedingValues | string {
  if (index >= rows.length)
    return 'All configured crop rows have been submitted.';
  if (!area) return 'Current plot area is required for a multi-crop plan.';
  const crop = page.fields.filter(
      f => f.kind === 'select' && /crop|fasal|फसल/i.test(f.key + ' ' + f.label),
    ),
    areas = page.fields.filter(isPlotAreaField),
    irrigation = page.fields.filter(
      f =>
        f.kind === 'checkbox' &&
        /flexSwitchCheckDefault|irrigated|सिंचित/i.test(f.key + ' ' + f.label),
    );
  if (crop.length !== 1 || areas.length !== 1 || irrigation.length > 1)
    return 'Crop, area or irrigation field is ambiguous.';
  if (rows[index].irrigated && !irrigation.length)
    return 'The irrigation control is unavailable.';
  if (!crop[0].options.some(o => o.value === rows[index].crop))
    return 'A configured crop is unavailable in this season.';
  try {
    const parts = cropPlanAreas(area, rows),
      amount = parts[index];
    if (page.remainingArea === undefined)
      return 'The remaining crop area must be visible before multi-crop feeding.';
    const expectedRemaining =
      (rows[0].area !== undefined
        ? parts.reduce((sum, part) => sum + units(part, 4), 0n)
        : units(area, 4)) -
      parts.slice(0, index).reduce((sum, part) => sum + units(part, 4), 0n);
    if (units(page.remainingArea, 4) !== expectedRemaining)
      return 'The official remaining area does not match this crop-plan step. Review existing crop rows before continuing.';
    if (units(amount, 4) > units(page.remainingArea, 4))
      return 'Configured crop area exceeds the official remaining area.';
    return {
      ...values,
      [crop[0].ref]: rows[index].crop,
      [areas[0].ref]: amount,
      ...(irrigation[0]
        ? { [irrigation[0].ref]: String(rows[index].irrigated) }
        : {}),
    };
  } catch (e) {
    return (e as Error).message;
  }
}

/** Recover only from a complete, labelled official table, never area alone. */
export function reconcileCropPlan(
  page: FeedingSnapshot,
  rows: CropPlanRow[],
  area?: string,
): number | string | undefined {
  if (page.cropRows === undefined) return undefined;
  if (!area || page.remainingArea === undefined)
    return 'The plot and remaining areas are required to recover this crop plan.';
  try {
    const parts = cropPlanAreas(area, rows);
    const crops = page.fields.filter(
      f => f.kind === 'select' && /crop|fasal|फसल/i.test(f.key + ' ' + f.label),
    );
    if (crops.length !== 1) return 'The crop selector could not be identified.';
    const normal = (s: string) =>
      s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
    const recorded = page.cropRows.map(row => {
      const options = crops[0].options.filter(
        o => normal(o.label) === normal(row.crop),
      );
      if (options.length !== 1)
        throw Error(
          'An existing crop cannot be matched uniquely. Review the official rows.',
        );
      return {
        crop: options[0].value,
        area: units(row.area, 4),
        irrigated: row.irrigated,
      };
    });
    if (recorded.length > rows.length)
      throw Error('There are extra official crop rows. Review the plan.');
    const unmatched = [...recorded];
    for (let i = 0; i < recorded.length; i++) {
      const match = unmatched.findIndex(
        r =>
          r.crop === rows[i].crop &&
          r.area === units(parts[i], 4) &&
          r.irrigated === rows[i].irrigated,
      );
      if (match < 0)
        throw Error(
          'Existing crops, areas or irrigation do not match this plan. Review before continuing.',
        );
      unmatched.splice(match, 1);
    }
    const remaining =
      (rows[0].area !== undefined
        ? parts.reduce((sum, part) => sum + units(part, 4), 0n)
        : units(area, 4)) - recorded.reduce((sum, r) => sum + r.area, 0n);
    if (units(page.remainingArea, 4) !== remaining)
      throw Error(
        'The crop table and remaining area disagree. Wait for the official page to finish updating.',
      );
    return recorded.length;
  } catch (e) {
    return (e as Error).message;
  }
}
