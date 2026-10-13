import { DeskState } from '../types';
export function createInitialDeskState(): DeskState {
  return {
    version: 1,
    sampleDataRemoved: true,
    lands: [],
    mutations: [],
    surveys: [],
    crops: [],
    certificates: [],
    publicLands: [],
    incidents: [],
    queue: [],
    online: true,
    settings: { officer: '', circle: '', bighaSqm: 2500, reliefRate: 17000 },
    drafts: {},
  };
}
// These IDs were shipped as fixtures, never obtained from a government service.
const sampleLandIds = new Set(
  ['142', '88', '203', '67', '119', '245'].map(id => `land-${id}`),
);
const samplePublicIds = new Set(['public-1', 'public-2', 'public-3']);
export function removeSampleData(state: DeskState): DeskState {
  if (state.sampleDataRemoved) {
    return state;
  }
  const lands = state.lands.filter(l => !sampleLandIds.has(l.id));
  const publicLands = state.publicLands.filter(l => !samplePublicIds.has(l.id));
  const sampleTerms = [
    ...sampleLandIds,
    ...samplePublicIds,
    'Kavita Prasad',
    'Imran Ali',
    'Sunita Devi',
  ];
  const refersToSample = (value: unknown) =>
    sampleTerms.some(term => JSON.stringify(value).includes(term));
  return {
    ...state,
    sampleDataRemoved: true,
    lands,
    publicLands,
    mutations: state.mutations.filter(m => !sampleLandIds.has(m.landId)),
    surveys: state.surveys.filter(s => !sampleLandIds.has(s.landId)),
    crops: state.crops.filter(c => !sampleLandIds.has(c.landId)),
    certificates: state.certificates.filter(
      c => !['APP-2026-4101', 'APP-2026-4102', 'APP-2026-4103'].includes(c.id),
    ),
    incidents: state.incidents.filter(
      i => !samplePublicIds.has(i.publicLandId),
    ),
    queue: state.queue.filter(
      q =>
        !refersToSample(q) &&
        !/Khasra (142|88|203|67|119|245|301|312|329)(?:\D|$)/.test(q.label),
    ),
    drafts: Object.fromEntries(
      Object.entries(state.drafts).filter(
        ([key, value]) => !refersToSample({ key, value }),
      ),
    ),
    settings: {
      ...state.settings,
      officer:
        state.settings.officer === 'Ananya Sharma'
          ? ''
          : state.settings.officer,
      circle:
        state.settings.circle === 'Sadar Tehsil - Circle 04'
          ? ''
          : state.settings.circle,
    },
  };
}
