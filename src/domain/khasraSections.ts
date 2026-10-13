import { z } from 'zod';
import {
  FeedingField,
  FeedingSnapshot,
  FeedingValues,
  isPlotAreaField,
  validateFeedingValues,
} from './khasraFeeding';

export const subsectionRulesSchema = z.object({
  enabled: z.boolean().default(false),
  land: z
    .enum(['cultivated', 'fallow', 'nonAgricultural'])
    .default('cultivated'),
  landType: z.string().max(100).default(''),
  trees: z
    .array(
      z.object({ type: z.string().min(1), count: z.string().regex(/^\d+$/) }),
    )
    .max(20)
    .default([
      { type: '1', count: '0' },
      { type: '2', count: '0' },
    ]),
  crop: z.string().max(100).default(''),
  irrigated: z.boolean().default(false),
  irrigationMethod: z.string().max(100).default(''),
  remarks: z.string().max(2000).default('done'),
});
export type SubsectionRules = z.infer<typeof subsectionRulesSchema>;
export const DEFAULT_SUBSECTION_RULES = subsectionRulesSchema.parse({});

// Read the portal's stable name/id, not the position of a control on the page.
export const namedField = (f: FeedingField, name: string) =>
  f.key
    .split('|')
    .slice(2, 4)
    .some(part => part === name);
export const sectionField = (page: FeedingSnapshot, name: string) => {
  const fields = page.fields.filter(f => namedField(f, name));
  return fields.length === 1 ? fields[0] : undefined;
};
export function sectionIsTerminal(stage: string, rules: SubsectionRules) {
  return (
    stage === 'remarks' ||
    (rules.enabled &&
      ((stage === 'land' && rules.land === 'nonAgricultural') ||
        (stage === 'fallow' && rules.land === 'fallow')))
  );
}
export type SectionPlan =
  | {
      kind: 'prepare' | 'fill';
      values: FeedingValues;
      note: string;
      formRef?: string;
    }
  | { kind: 'complete'; note: string }
  | { error: string };
const numeric = (v?: string): v is string =>
  !!v && /^\d+(?:\.\d+)?$/.test(v) && Number.isFinite(Number(v));
const normal = (s: string) =>
  s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

/** A labelled table is required for recovery; a Next button alone is not proof. */
export function recoverTreeEntries(
  page: FeedingSnapshot,
  rules: SubsectionRules,
): number | string | undefined {
  if (page.treeRows === undefined) return undefined;
  const type = sectionField(page, 'vrikshType1');
  if (!type) return 'The tree category selector is unavailable.';
  const rows = page.treeRows.map(row => {
    const options = type.options.filter(
      o => normal(o.label) === normal(row.type),
    );
    return options.length === 1
      ? { type: options[0].value, count: row.count }
      : undefined;
  });
  if (rows.length > rules.trees.length || rows.some(row => !row))
    return 'Existing tree entries cannot be matched to this plan. Review the tree table.';
  const unmatched = [...rows];
  for (let i = 0; i < rows.length; i++) {
    const at = unmatched.findIndex(
      row =>
        row?.type === rules.trees[i].type &&
        Number(row.count) === Number(rules.trees[i].count),
    );
    if (at < 0)
      return 'Existing tree categories or counts differ from this plan. Review before continuing.';
    unmatched.splice(at, 1);
  }
  return rows.length;
}

/** Port of the combined 1432 flow, with actual official choices and areas.
 * Preparation is a separate operation: Angular can replace dependent controls.
 * No existing record is deleted to make an automation run fit the form.
 */
export function planSubsection(
  page: FeedingSnapshot,
  rules: SubsectionRules,
  plotArea?: string,
  treeIndex = 0,
  managedCropPlan = false,
): SectionPlan {
  const prepare = (field: FeedingField, value: string): SectionPlan => ({
    kind: 'prepare',
    values: { [field.ref]: value },
    note: `Selecting ${field.label}.`,
  });
  const modeId = { land: 'option1', fallow: 'option2', crop: 'option3' }[
    page.stage as 'land' | 'fallow' | 'crop'
  ];
  if (modeId) {
    const radio = sectionField(page, modeId);
    if (radio?.kind === 'radio' && radio.value !== 'true')
      return prepare(radio, 'true');
  }
  let fields = page.fields;
  let formRef: string | undefined;
  if (page.stage === 'trees') {
    const type = sectionField(page, 'vrikshType1');
    if (!type)
      return { error: 'The official tree category selector is unavailable.' };
    if (treeIndex >= rules.trees.length)
      return {
        kind: 'complete',
        note: 'Configured tree categories are complete.',
      };
    formRef = type.formRef;
    if (formRef) fields = fields.filter(f => f.formRef === formRef);
    const entry = rules.trees[treeIndex];
    if (!type.options.some(o => o.value === entry.type))
      return { error: 'A configured tree category is unavailable.' };
    if (type.value !== entry.type) return prepare(type, entry.type);
  }
  const values: FeedingValues = Object.fromEntries(
    fields.map(f => [f.ref, f.value]),
  );
  const areaFields = fields.filter(isPlotAreaField);
  const area = page.remainingArea ?? page.plotArea ?? plotArea;
  if (page.landRows?.length) {
    const expectedArea =
      (page.stage === 'land' && rules.land !== 'nonAgricultural') ||
      (page.stage === 'fallow' && rules.land === 'cultivated')
        ? '0'
        : page.plotArea ?? plotArea;
    const type = sectionField(page, 'agriculturalType');
    const expectedType = type?.options.find(
      o =>
        o.value ===
        (rules.land === 'nonAgricultural' ? rules.landType : type.value),
    )?.label;
    if (
      page.landRows.length === 1 &&
      numeric(expectedArea) &&
      Number(page.landRows[0].area) === Number(expectedArea) &&
      (page.stage === 'fallow' ||
        (!!expectedType &&
          normal(page.landRows[0].type) === normal(expectedType)))
    )
      return {
        kind: 'complete',
        note: 'The official section already matches these rules.',
      };
    return {
      error:
        'Existing land entries differ from these rules. Review the official table before continuing.',
    };
  }
  const setArea = (value: string): string | undefined => {
    if (areaFields.length !== 1)
      return 'The section area field is unavailable or ambiguous.';
    values[areaFields[0].ref] = value;
  };
  let error: string | undefined;
  if (page.stage === 'land') {
    const type = sectionField(page, 'agriculturalType');
    if (!type)
      return { error: 'The official land-type selector is unavailable.' };
    if (rules.land === 'nonAgricultural') {
      if (
        !rules.landType ||
        !type.options.some(o => o.value === rules.landType)
      )
        return {
          error:
            'Choose the non-agricultural type from the current official land options.',
        };
      if (type.value !== rules.landType) return prepare(type, rules.landType);
      if (!numeric(area))
        return { error: 'The official remaining land area is required.' };
      error = setArea(area);
    } else {
      // FastWork records no non-agricultural area for cultivated/fallow plots.
      if (areaFields.length) error = setArea('0');
    }
  } else if (page.stage === 'fallow') {
    if (rules.land === 'nonAgricultural')
      return {
        error:
          'This non-agricultural plot should finish at the land section. Review the official record.',
      };
    if (rules.land === 'fallow' && !numeric(area))
      return { error: 'The official remaining fallow area is required.' };
    error = setArea(rules.land === 'cultivated' ? '0' : area!);
  } else if (page.stage === 'trees') {
    const entry = rules.trees[treeIndex];
    const counts = fields.filter(
      f =>
        ['number', 'text'].includes(f.kind) &&
        /count|number\s*of.*trees|numberof|vrikshsankhya|संख्या/i.test(
          f.key + ' ' + f.label,
        ) &&
        !isPlotAreaField(f),
    );
    if (
      counts.length > 1 ||
      (!counts.length &&
        (entry.count !== '0' ||
          fields.some(f => ['number', 'text'].includes(f.kind))))
    )
      return { error: 'The tree count field is unavailable or ambiguous.' };
    if (counts[0]) values[counts[0].ref] = entry.count;
    // With no count input the official category-only form represents the
    // reference's zero-entry path. Never infer positive tree counts.
  } else if (page.stage === 'crop') {
    const crops = fields.filter(
      f => f.kind === 'select' && /crop|fasal|फसल/i.test(f.key + ' ' + f.label),
    );
    if (
      crops.length !== 1 ||
      !rules.crop ||
      !crops[0].options.some(o => o.value === rules.crop)
    )
      return { error: 'Choose a crop from this season’s official options.' };
    if (!managedCropPlan && page.cropRows?.length) {
      const label = crops[0].options.find(o => o.value === rules.crop)!.label;
      const total = page.plotArea ?? plotArea;
      if (
        page.cropRows.length === 1 &&
        numeric(total) &&
        normal(page.cropRows[0].crop) === normal(label) &&
        Number(page.cropRows[0].area) === Number(total) &&
        page.cropRows[0].irrigated === rules.irrigated &&
        page.remainingArea !== undefined &&
        Number(page.remainingArea) === 0
      )
        return {
          kind: 'complete',
          note: 'The configured crop is already present on the official page.',
        };
      return {
        error:
          'Existing crop rows differ from the configured crop. Review them before continuing.',
      };
    }
    if (crops[0].value !== rules.crop) return prepare(crops[0], rules.crop);
    const irrigation = fields.filter(
      f =>
        f.kind === 'checkbox' &&
        /flexSwitchCheckDefault|irrigated|सिंचित/i.test(f.key + ' ' + f.label),
    );
    if (irrigation.length > 1 || (rules.irrigated && !irrigation.length))
      return { error: 'The irrigation control is unavailable or ambiguous.' };
    if (irrigation[0] && irrigation[0].value !== String(rules.irrigated))
      return prepare(irrigation[0], String(rules.irrigated));
    const method = sectionField(page, 'agriTech');
    if (rules.irrigated) {
      if (
        !method ||
        !rules.irrigationMethod ||
        !method.options.some(o => o.value === rules.irrigationMethod)
      )
        return { error: 'Choose a current official irrigation method.' };
      values[method.ref] = rules.irrigationMethod;
    } else if (method?.options.some(o => o.value === '0'))
      values[method.ref] = '0';
    if (!numeric(area) || Number(area) <= 0)
      return { error: 'A positive official remaining crop area is required.' };
    error = setArea(area);
  } else if (page.stage === 'remarks') {
    const remarks = fields.filter(f => f.kind === 'textarea');
    if (remarks.length !== 1 || !rules.remarks.trim())
      return {
        error: 'Enter remarks and identify the official remarks field.',
      };
    values[remarks[0].ref] = rules.remarks;
  } else return { error: 'Open a supported subsection.' };
  if (error) return { error };
  const invalid = validateFeedingValues({ ...page, fields }, values);
  return invalid
    ? { error: invalid }
    : { kind: 'fill', values, formRef, note: '' };
}
