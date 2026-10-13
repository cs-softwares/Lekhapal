import { CensusRules, censusFill, phase2Areas } from './census';
import { OfficialWorkSnapshot } from './officialWork';

export type Phase2Progress = {
  record: string;
  area?: string;
  calculated: boolean;
  crop?: string;
};
export const phase2Progress = (record: string): Phase2Progress => ({
  record,
  calculated: false,
});
type Action = OfficialWorkSnapshot['actions'][number];
export type Phase2Step = { key: string; progress: Phase2Progress } & (
  | { kind: 'action'; action: Action }
  | { kind: 'fill'; values: Record<string, string> }
  | { kind: 'wait' }
);
export function validatePhase2Batch(rules: CensusRules) {
  if (
    rules.phase2Crops.length !== Number(rules.phase2Count) ||
    rules.phase2Crops.some(c => !/^\d{1,8}$/.test(c.code))
  )
    throw Error(
      'Enter an official crop code for each selected crop before starting the batch.',
    );
  phase2Areas('100', rules);
}
/** Drives one observed transition at a time. Saving still uses the durable write journal. */
export function nextPhase2Step(
  page: OfficialWorkSnapshot,
  rules: CensusRules,
  progress: Phase2Progress,
): Phase2Step {
  validatePhase2Batch(rules);
  if (page.error)
    throw Error('The census portal reported an error. Review this record.');
  const action = (label: string, next = progress): Phase2Step => {
    const matches = page.actions.filter(a => a.label === label);
    if (matches.length !== 1)
      throw Error(`${label} is unavailable or ambiguous on the official page.`);
    return {
      kind: 'action',
      action: matches[0],
      progress: next,
      key: `${progress.record}:${page.documentId}:${label}:${next.crop || ''}`,
    };
  };
  const choice = (kind: 'serial' | 'crop', code: string) => {
    const choices = page.censusChoices?.filter(c => c.code === code) || [];
    if (choices.length !== 1)
      throw Error(
        `The official ${kind} list does not contain one unique match for ${code}.`,
      );
    if (choices[0].checked)
      throw Error(
        `The selected ${kind} did not return its value to the census form.`,
      );
    return action(`Choose ${kind} ${code}`);
  };
  if (page.censusPopup === 'serial') {
    if (page.identity === progress.record)
      return action('Return to census form');
    return choice('serial', progress.record);
  }
  if (page.identity !== progress.record) {
    if (page.censusPopup)
      throw Error('The census holding changed while a popup was open.');
    return action('Open serial list');
  }
  if (page.censusPopup === 'survey') {
    if (!page.censusSurveyArea || Number(page.censusSurveyArea) <= 0)
      throw Error(
        'A positive operated area could not be verified from the survey list.',
      );
    return action('Return to census form', {
      ...progress,
      area: page.censusSurveyArea,
    });
  }
  if (page.censusPopup === 'crop') {
    if (!progress.crop)
      throw Error('An unexpected crop popup opened. Review the holding.');
    if (page.censusCropCodes?.includes(progress.crop))
      return action('Return to census form', { ...progress, crop: undefined });
    return choice('crop', progress.crop);
  }
  if (!/schedule_h\.jsp/i.test(page.url))
    throw Error('Open the official Phase 2 Schedule H form.');
  if (!progress.area) {
    if (
      /fully/i.test(page.censusOperatedStatus || '') &&
      page.censusOperatedArea &&
      Number(page.censusOperatedArea) > 0
    )
      progress = { ...progress, area: page.censusOperatedArea };
    else return action('Open survey list');
  }
  if (!progress.calculated)
    return action('Calculate census area', { ...progress, calculated: true });
  const calculationDialog = page.actions.filter(
    a => a.label === 'Acknowledge census calculation',
  );
  if (calculationDialog.length)
    return action('Acknowledge census calculation', progress);
  if (!page.censusCalculated)
    return { kind: 'wait', key: 'calculation', progress };
  const cropCount = page.fields.filter(f => f.key === 'tot_crops');
  if (cropCount.length !== 1)
    throw Error('The census crop-count field is unavailable.');
  if (cropCount[0].value !== rules.phase2Count)
    return {
      kind: 'fill',
      values: { [cropCount[0].ref]: rules.phase2Count },
      key: `${progress.record}:count`,
      progress,
    };
  const desired = rules.phase2Crops.map(c => c.code),
    current = page.censusCropCodes || [];
  if (current.some(c => c && !desired.includes(c)))
    throw Error(
      'This holding already contains another crop. Review it before starting a batch.',
    );
  const missing = desired.find(c => !current.includes(c));
  if (missing)
    return action('Open crop chooser', { ...progress, crop: missing });
  if (
    current.length !== desired.length ||
    current.some((c, i) => c !== desired[i])
  )
    throw Error(
      'The official crop rows are in a different order. Review the crop selection before applying areas.',
    );
  const values = censusFill(
    { ...page, censusOperatedArea: progress.area },
    {},
    rules,
  );
  if (Object.keys(values).length)
    return {
      kind: 'fill',
      values,
      key: `${progress.record}:fill:${JSON.stringify(values)}`,
      progress,
    };
  return action('Save census entry', progress);
}
