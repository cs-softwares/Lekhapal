import { DeskState, LandRecord } from '../src/types';
const plots = ['142', '88', '203', '67', '119', '245'];
const names = [
  'Ram Prasad',
  'Sushila Devi',
  'Mohammad Salim',
  'Meena Singh',
  'Harish Chandra',
  'Anita Verma',
];
export const mockLands: LandRecord[] = plots.map((plot, i) => ({
  id: `land-${plot}`,
  plot,
  khata: String(1041 + i),
  village: i % 2 ? 'Rampur' : 'Chandpur',
  villageCode: i % 2 ? '146203' : '146201',
  tehsil: 'Sadar',
  hectares: [1.25, 0.84, 2.16, 0.65, 1.72, 0.96][i],
  classification:
    i === 3 ? 'Asankramaniya Bhumidhar' : 'Sankramaniya Bhumidhar',
  owners:
    i === 0
      ? [
          { name: names[i], share: 75 },
          { name: 'Kamla Devi', share: 25 },
        ]
      : [{ name: names[i], share: 100 }],
  location: { latitude: 26.8467 + i * 0.002, longitude: 80.9462 + i * 0.001 },
}));
export function createInitialDeskState(): DeskState {
  return {
    version: 1,
    sampleDataRemoved: true,
    lands: mockLands,
    mutations: mockLands
      .slice(0, 5)
      .map((land, i) => ({
        id: `MUT-2026-${3101 + i}`,
        landId: land.id,
        buyer: [
          'Amit Prasad',
          'Rekha Devi',
          'Arif Salim',
          'Vijay Singh',
          'Pooja Chandra',
        ][i],
        seller: land.owners[0].name,
        buyerVerified: i !== 3,
        sellerVerified: true,
        category: i % 2 ? 'Inheritance' : 'Registry Sale',
        status: i === 2 ? 'Objections' : 'Pending',
        filedAt: '2026-09-01T09:00:00.000Z',
        noticeAt: i < 2 ? '2026-09-02T09:00:00.000Z' : undefined,
        objection:
          i === 2
            ? 'Co-owner disputes the recorded share. Field hearing required.'
            : undefined,
        transferShare: land.owners[0].share,
      })),
    surveys: [],
    crops: [],
    certificates: [
      {
        id: 'APP-2026-4101',
        name: 'Kavita Prasad',
        type: 'Income',
        income: 72000,
        family: 5,
        landId: 'land-142',
        address: 'Ward 4, Chandpur, Sadar',
        status: 'Pending',
      },
      {
        id: 'APP-2026-4102',
        name: 'Imran Ali',
        type: 'Residence',
        income: 96000,
        family: 4,
        address: 'Ward 2, Rampur, Sadar',
        status: 'Pending',
      },
      {
        id: 'APP-2026-4103',
        name: 'Sunita Devi',
        type: 'Caste',
        income: 84000,
        family: 6,
        landId: 'land-88',
        address: 'Ward 6, Rampur, Sadar',
        status: 'Pending',
      },
    ],
    publicLands: [
      {
        id: 'public-1',
        plot: '301',
        village: 'Chandpur',
        kind: 'Pond / Talab',
        hectares: 1.8,
        location: { latitude: 26.851, longitude: 80.95 },
      },
      {
        id: 'public-2',
        plot: '312',
        village: 'Rampur',
        kind: 'Pasture / Charaagah',
        hectares: 3.2,
        location: { latitude: 26.854, longitude: 80.951 },
      },
      {
        id: 'public-3',
        plot: '329',
        village: 'Chandpur',
        kind: 'Graveyard / Kabristan',
        hectares: 0.72,
        location: { latitude: 26.856, longitude: 80.953 },
      },
    ],
    incidents: [],
    queue: [],
    online: true,
    settings: {
      officer: 'Ananya Sharma',
      circle: 'Sadar Tehsil - Circle 04',
      bighaSqm: 2500,
      reliefRate: 17000,
    },
    drafts: {},
  };
}
