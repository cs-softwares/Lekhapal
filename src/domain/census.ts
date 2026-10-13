import { z } from 'zod';
import { OfficialWorkSnapshot } from './officialWork';

export const CENSUS_MODES = [
  'standard',
  'institutional',
  'continuation',
  'block-d',
  'operational',
  'phase2',
] as const;
export const censusRulesSchema = z.object({
  mode: z.enum(CENSUS_MODES).default('standard'),
  landUse: z.string().default(''),
  landType: z.string().default(''),
  holder: z.string().default(''),
  smallArea: z.string().default(''),
  smallAreaType: z.string().default(''),
  phase2Count: z.enum(['1', '2']).default('1'),
  phase2Irrigated: z.boolean().default(false),
  irrigationSource: z.string().default(''),
  phase2HoldingIrrigatedPercent: z.string().default(''),
  phase2Crops: z
    .array(
      z.object({
        code: z.string().max(8),
        areaPercent: z.string(),
        irrigatedPercent: z.string(),
      }),
    )
    .max(2)
    .default([]),
});
export type CensusRules = z.infer<typeof censusRulesSchema>;
export const DEFAULT_CENSUS_RULES = censusRulesSchema.parse({});
const rowKey =
  /^(land_use_list|land_use_type_list|operational_holder_list)\d+$/;
const personal =
  /^(?:sr_no|hl_name_local|f_h_name_local|khata_no|area\d.*|area_opr|field_0[56]|(?:un)?irri_ar_\d+|tot_survey)$/;
export function censusPreset(
  page: OfficialWorkSnapshot,
): Record<string, string> {
  return Object.fromEntries(
    page.fields
      .filter(f => !personal.test(f.key) && !rowKey.test(f.key))
      .map(f => [f.key, f.value]),
  );
}
function field(page: OfficialWorkSnapshot, key: string) {
  const fields = page.fields.filter(f => f.key === key);
  if (fields.length !== 1)
    throw Error(
      `Census field ${key} is missing or ambiguous. Review this record.`,
    );
  return fields[0];
}
/** One dependent control at a time: onchange/onblur can rebuild the form. */
export function censusFill(
  page: OfficialWorkSnapshot,
  preset: Record<string, string>,
  rules: CensusRules,
): Record<string, string> {
  const changes: Record<string, string> = {};
  const put = (key: string, value: string) => {
    const f = field(page, key);
    if (f.kind === 'select' && !f.options.some(o => o.value === value))
      throw Error(`The selected option for ${f.label} is unavailable.`);
    const numeric =
      /^(?:area\d.*|field_0[56]|(?:un)?irri_ar_\d+|tot_crops)$/.test(key);
    const canonical = (s: string) =>
      s
        .replace(/^0+(?=\d)/, '')
        .replace(/(\.\d*?)0+$/, '$1')
        .replace(/\.$/, '');
    if (
      numeric &&
      /^\d+(?:\.\d+)?$/.test(value) &&
      /^\d+(?:\.\d+)?$/.test(f.value) &&
      canonical(value) === canonical(f.value)
    )
      return;
    if (f.value !== value) changes[f.ref] = value;
  };
  if (rules.mode === 'phase2' && !/schedule_h\.jsp/i.test(page.url))
    throw Error('Open the official Phase 2 Schedule H form.');
  if (rules.mode !== 'phase2' && /schedule_h\.jsp/i.test(page.url))
    throw Error('Choose Phase 2 settings for Schedule H.');
  if (rules.mode === 'institutional') {
    const controls = page.fields.filter(
      f =>
        f.kind === 'radio' &&
        /institutional|संस्थागत/i.test(f.key + ' ' + f.label),
    );
    if (controls.length !== 1)
      throw Error(
        'The institutional holding choice is unavailable or ambiguous.',
      );
    put(controls[0].key, 'true');
    if (Object.keys(changes).length) return changes;
    const sector = field(page, 'inst_sector');
    if (!preset.inst_sector && (!sector.value || sector.value === '0'))
      throw Error(
        'Review and choose the institutional sector before starting.',
      );
  }
  if (rules.mode === 'operational') {
    const holders = page.fields.filter(
      f => f.kind === 'checkbox' && f.key.startsWith('operational-holder:'),
    );
    if (!holders.length)
      throw Error('Open the official operational-holder selection table.');
    for (const holder of holders) {
      put(holder.key, 'true');
      if (Object.keys(changes).length) return changes;
    }
    return changes;
  }
  if (rules.mode === 'phase2') {
    const area = page.censusOperatedArea;
    if (!area || Number(area) <= 0)
      throw Error(
        'The official operated holding area is required for Phase 2.',
      );
    const plan = phase2Areas(area, rules);
    put('tot_crops', String(plan.crops.length));
    if (Object.keys(changes).length) return changes;
    for (const key of ['field_05', 'field_06']) {
      put(key, key === 'field_05' ? plan.irrigated : plan.unirrigated);
      if (Object.keys(changes).length) return changes;
    }
    for (let i = 0; i < plan.crops.length; i++) {
      for (const prefix of ['', 'un']) {
        // Legacy presets only exposed the chosen irrigation column. Explicit
        // crop plans require both columns so old values cannot survive.
        if (
          !rules.phase2Crops.length &&
          !page.fields.some(f => f.key === `${prefix}irri_ar_1${i}`)
        )
          continue;
        put(
          `${prefix}irri_ar_1${i}`,
          prefix ? plan.crops[i].unirrigated : plan.crops[i].irrigated,
        );
        if (Object.keys(changes).length) return changes;
      }
    }
    if (
      Number(plan.irrigated) > 0 ||
      plan.crops.some(c => Number(c.irrigated) > 0)
    ) {
      if (!rules.irrigationSource)
        throw Error('Choose the official irrigation source.');
      put('source_irr', rules.irrigationSource);
      if (Object.keys(changes).length) return changes;
    }
  }
  if (rules.mode === 'phase2') return changes;
  if (
    rules.smallArea &&
    (!/^\d+(?:\.\d{1,4})?$/.test(rules.smallArea) || !rules.smallAreaType)
  )
    throw Error('Choose a valid small-area threshold and land-use type.');
  const indices = page.fields
    .filter(f => /^land_use_list\d+$/.test(f.key))
    .map(f => f.key.replace('land_use_list', ''));
  if (
    (rules.landUse ||
      rules.holder ||
      rules.smallArea ||
      rules.mode === 'block-d') &&
    !indices.length
  )
    throw Error('The Block C rows have not loaded.');
  for (const i of indices) {
    const area = page.censusAreas?.find(a => a.index === i)?.area;
    if (rules.smallArea && area === undefined)
      throw Error('A labelled area is required for each small-area rule.');
    const small = !!rules.smallArea && Number(area) <= Number(rules.smallArea);
    const use = small || rules.mode === 'block-d' ? '2' : rules.landUse;
    if (use) put(`land_use_list${i}`, use);
    // Wait for each land-use onchange before reading its dependent controls.
    if (Object.keys(changes).length) return changes;
    if (use === '2') {
      const type = small ? rules.smallAreaType : rules.landType;
      if (!type) throw Error('Choose the land-use type for non-operated land.');
      put(`land_use_type_list${i}`, type);
    } else if (rules.holder) put(`operational_holder_list${i}`, rules.holder);
    if (Object.keys(changes).length) return changes;
  }
  for (const [key, value] of Object.entries(preset)) {
    if (
      personal.test(key) ||
      rowKey.test(key) ||
      (rules.mode === 'institutional' &&
        key.includes('|') &&
        page.fields.some(
          f => f.key === key && f.kind === 'radio' && /hold/i.test(f.key),
        ))
    )
      continue;
    // Unchecked radio siblings must not undo the selected member of a group.
    if (key.includes('|') && value === 'false') continue;
    put(key, value);
    if (Object.keys(changes).length) return changes;
  }
  return changes;
}

export function phase2Areas(area: string, rules: CensusRules) {
  const units = (value: string, decimals: number) => {
    if (!new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`).test(value))
      throw Error(
        'Use valid census areas and percentages with at most two decimal places for percentages.',
      );
    const [whole, fraction = ''] = value.split('.');
    return (
      BigInt(whole) * 10n ** BigInt(decimals) +
      BigInt(fraction.padEnd(decimals, '0'))
    );
  };
  const format = (value: bigint) =>
    `${value / 10000n}.${String(value % 10000n).padStart(4, '0')}`;
  const percent = (value: string) => {
    const p = units(value, 2);
    if (p > 10000n)
      throw Error('Each census percentage must be between 0 and 100.');
    return p;
  };
  const total = units(area, 4);
  if (total <= 0n) throw Error('The official operated area must be positive.');
  const irrigation = percent(
    rules.phase2HoldingIrrigatedPercent ||
      (rules.phase2Irrigated ? '100' : '0'),
  );
  const irrigated = (total * irrigation) / 10000n;
  const rows = rules.phase2Crops.length
    ? rules.phase2Crops
    : Array.from({ length: Number(rules.phase2Count) }, () => ({
        code: '',
        areaPercent: '100',
        irrigatedPercent: rules.phase2Irrigated ? '100' : '0',
      }));
  if (
    new Set(rows.filter(r => r.code).map(r => r.code)).size !==
    rows.filter(r => r.code).length
  )
    throw Error('Choose distinct crop codes for this census plan.');
  return {
    irrigated: format(irrigated),
    unirrigated: format(total - irrigated),
    crops: rows.map(row => {
      const cropArea = (total * percent(row.areaPercent)) / 10000n;
      if (cropArea <= 0n)
        throw Error('A configured crop area is below portal precision.');
      const water = (cropArea * percent(row.irrigatedPercent)) / 10000n;
      return {
        code: row.code,
        irrigated: format(water),
        unirrigated: format(cropArea - water),
      };
    }),
  };
}
/** Maharashtra's split whole/fraction fields, rounded to portal precision. */
export function censusAreaConversion(
  page: OfficialWorkSnapshot,
  divisor: string,
): Record<string, string> {
  if (!/^[1-9]\d{0,5}$/.test(divisor))
    throw Error('Enter a positive whole-number area divisor.');
  if (!page.censusAreas?.length)
    throw Error('Open a populated Block C area table first.');
  const patch: Record<string, string> = {};
  for (const row of page.censusAreas) {
    const [whole, fraction = ''] = row.area.split('.');
    if (!/^\d+(?:\.\d{1,4})?$/.test(row.area))
      throw Error('An area has unsupported precision.');
    const raw = BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0'));
    const divided = (raw + BigInt(divisor) / 2n) / BigInt(divisor);
    if (raw > 0n && divided === 0n)
      throw Error('Converted area is below portal precision.');
    patch[field(page, `area${row.index}`).ref] = String(divided / 10000n);
    patch[field(page, `area${row.index}_1`).ref] = String(
      divided % 10000n,
    ).padStart(4, '0');
  }
  return patch;
}
