import { z } from 'zod';
import { cropPlanRowSchema, cropPlanAreas } from './cropPlan';
import {
  DEFAULT_SUBSECTION_RULES,
  subsectionRulesSchema,
} from './khasraSections';
import {
  FeedingPreset,
  FeedingSnapshot,
  FeedingValues,
  applyFeedingPreset,
  isPlotAreaField,
  validateFeedingValues,
} from './khasraFeeding';

export const advancedRulesSchema = z.object({
  smallAreaEnabled: z.boolean(),
  smallAreaThreshold: z.string().max(30),
  governmentLand: z.enum(['review', 'include', 'skip']),
  autoNext: z.boolean(),
  autoSubmit: z.boolean(),
  autoLock: z.boolean().default(false),
  cropPlan: z.array(cropPlanRowSchema).max(10).default([]),
  sections: subsectionRulesSchema.default(DEFAULT_SUBSECTION_RULES),
});
export type AdvancedRules = z.infer<typeof advancedRulesSchema>;
export const DEFAULT_ADVANCED_RULES: AdvancedRules = {
  smallAreaEnabled: false,
  smallAreaThreshold: '',
  governmentLand: 'review',
  autoNext: false,
  autoSubmit: false,
  autoLock: false,
  cropPlan: [],
  sections: DEFAULT_SUBSECTION_RULES,
};
export type AdvancedPlan =
  | { values: FeedingValues; note: string; kind?: 'fill'; formRef?: string }
  | { error: string };

export function validateAdvancedRules(rules: AdvancedRules): string | null {
  if (
    !subsectionRulesSchema.safeParse(rules.sections).success ||
    rules.sections.trees.some(row => !Number.isSafeInteger(Number(row.count)))
  )
    return 'Enter a valid whole-number count for each tree category.';
  if (rules.sections.enabled && rules.sections.trees.length === 0)
    return 'Configure the tree categories, including zero counts when there are no trees.';
  if (
    new Set(rules.sections.trees.map(row => row.type)).size !==
    rules.sections.trees.length
  )
    return 'Each tree category must appear only once.';
  if (
    rules.smallAreaEnabled &&
    (!/^\d+(?:\.\d+)?$/.test(rules.smallAreaThreshold.trim()) ||
      !Number.isFinite(Number(rules.smallAreaThreshold)))
  )
    return 'Enter a non-negative small-area threshold in the same unit as the official plot area.';
  if (rules.cropPlan.length) {
    try {
      cropPlanAreas(
        rules.cropPlan.some(r => r.area !== undefined) ? '9999999999' : '100',
        rules.cropPlan,
      );
    } catch (e) {
      return (e as Error).message;
    }
  }
  if (rules.cropPlan.length && rules.smallAreaEnabled)
    return 'Choose either a multi-crop plan or the small-area rule for this batch.';
  return null;
}
export function planAdvancedFill(
  page: FeedingSnapshot,
  preset: FeedingPreset | undefined,
  rules: AdvancedRules,
  plotArea?: string,
): AdvancedPlan {
  const error = validateAdvancedRules(rules);
  if (error) return { error };
  const areas = page.fields.filter(isPlotAreaField);
  const currentPage =
    areas.length === 1 &&
    page.remainingArea !== undefined &&
    /^\d+(?:\.\d+)?$/.test(page.remainingArea)
      ? {
          ...page,
          fields: page.fields.map(f =>
            f.ref === areas[0].ref && !f.value.trim()
              ? { ...f, value: page.remainingArea! }
              : f,
          ),
        }
      : page;
  const values = applyFeedingPreset(currentPage, preset);
  if (!values)
    return {
      error:
        'Review this form and save its preset first. Required plot areas must be entered on the official form.',
    };
  if (page.stage !== 'crop' || !rules.smallAreaEnabled)
    return { values, note: '' };
  const area = page.plotArea ?? plotArea;
  if (
    area === undefined ||
    !/^\d+(?:\.\d+)?$/.test(area.trim()) ||
    !Number.isFinite(Number(area))
  )
    return {
      error:
        'The official plot area is unavailable. Review this plot before applying the small-area rule.',
    };
  if (Number(area) > Number(rules.smallAreaThreshold))
    return { values, note: '' };
  const crops = page.fields.filter(
    f => f.kind === 'select' && /crop|fasal|फसल/i.test(`${f.key} ${f.label}`),
  );
  if (crops.length !== 1)
    return {
      error: 'The crop selector is ambiguous. Review the official form.',
    };
  const blanks = crops[0].options.filter(o =>
    /^रिक्त(?:\s*\([^)]*\))?$/.test(o.label.trim()),
  );
  if (blanks.length !== 1)
    return {
      error: 'A unique रिक्त crop option is unavailable for this season.',
    };
  values[crops[0].ref] = blanks[0].value;
  const irrigated = page.fields.filter(
    f =>
      f.kind === 'checkbox' &&
      /flexSwitchCheckDefault|irrigated|सिंचित/i.test(`${f.key} ${f.label}`),
  );
  if (irrigated.length > 1)
    return {
      error: 'Irrigation controls are ambiguous. Review the official form.',
    };
  if (irrigated[0]) values[irrigated[0].ref] = 'false';
  const invalid = validateFeedingValues(page, values);
  return invalid
    ? { error: invalid }
    : {
        values,
        note: `Small-area rule: ${area} ≤ ${rules.smallAreaThreshold}; रिक्त selected. Review before saving.`,
      };
}

// Match a forward action by meaning, never by button position or colour.
export function nextSectionAction(page: FeedingSnapshot) {
  const candidates = page.actions.filter(
    a =>
      a.kind === 'navigate' &&
      /^(?:next(?:\s+.*)?|continue|आगे(?:\s+.*)?|अगला(?:\s+.*)?|सर्वेक्षण\s+प्रार(?:म्भ|ंभ)(?:\s+करें)?)$/i.test(
        a.label.trim(),
      ),
  );
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function filledValuesStillMatch(
  page: FeedingSnapshot,
  values: FeedingValues,
): boolean {
  return Object.entries(values).every(([ref, value]) => {
    const f = page.fields.find(field => field.ref === ref);
    return (
      !!f &&
      (value === f.value ||
        (isPlotAreaField(f) && Number(value) === Number(f.value)))
    );
  });
}

export function officialContextError(
  page: FeedingSnapshot,
  expected: { year: string; season: string; villageCode: string },
  requireComplete = false,
) {
  const actual = page.officialContext;
  if (
    requireComplete &&
    (!actual?.year || !actual.season || !actual.villageCode)
  )
    return 'Official village code, Fasli year and season must be visible before automatic locking.';
  if (!actual) return null;
  if (actual.year && actual.year !== expected.year)
    return 'The official Fasli year differs from this feeding setup.';
  if (actual.season && actual.season !== expected.season)
    return 'The official season differs from this feeding setup.';
  if (actual.villageCode && actual.villageCode !== expected.villageCode)
    return 'The official village code differs from this feeding setup.';
  return null;
}
