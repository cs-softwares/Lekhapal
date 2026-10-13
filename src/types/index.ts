export type Point = { latitude: number; longitude: number; accuracy?: number };
export type Owner = { name: string; share: number };
export type LandRecord = {
  id: string;
  plot: string;
  khata: string;
  village: string;
  villageCode: string;
  tehsil: string;
  hectares: number;
  classification: 'Sankramaniya Bhumidhar' | 'Asankramaniya Bhumidhar';
  owners: Owner[];
  location: Point;
  flagged?: boolean;
};
export type MutationStatus = 'Pending' | 'Objections' | 'Approved' | 'Rejected';
export type Mutation = {
  id: string;
  landId: string;
  buyer: string;
  seller: string;
  buyerVerified: boolean;
  sellerVerified: boolean;
  category: 'Registry Sale' | 'Inheritance' | 'Gift Deed';
  status: MutationStatus;
  filedAt: string;
  noticeAt?: string;
  reason?: string;
  objection?: string;
  transferShare: number;
};
export type Survey = {
  id: string;
  landId: string;
  points: Point[];
  areaSqm: number;
  createdAt: string;
  source: 'GPS' | 'Manual';
};
export type PhotoProof = {
  id: string;
  createdAt: string;
  location: Point;
  simulated: true;
};
export type CropReport = {
  id: string;
  landId: string;
  season: string;
  crop: string;
  disaster: string;
  loss: number;
  hectares: number;
  payout: number;
  photo: PhotoProof;
  createdAt: string;
};
export type Certificate = {
  id: string;
  name: string;
  type: 'Income' | 'Caste' | 'Residence';
  income: number;
  family: number;
  landId?: string;
  address: string;
  status: 'Pending' | 'Recommended' | 'Re-verification' | 'Rejected';
  reason?: string;
};
export type PublicLand = {
  id: string;
  plot: string;
  village: string;
  kind: 'Pond / Talab' | 'Pasture / Charaagah' | 'Graveyard / Kabristan';
  hectares: number;
  location: Point;
};
export type Incident = {
  id: string;
  publicLandId: string;
  violator: string;
  details: string;
  location: Point;
  createdAt: string;
  status: 'Reported' | 'Notice issued' | 'Inspection scheduled' | 'Resolved';
  noticeAt?: string;
};
export type QueueItem = {
  id: string;
  label: string;
  createdAt: string;
  syncedAt?: string;
};
export type DeskState = {
  sampleDataRemoved?: boolean;
  version: 1;
  lands: LandRecord[];
  mutations: Mutation[];
  surveys: Survey[];
  crops: CropReport[];
  certificates: Certificate[];
  publicLands: PublicLand[];
  incidents: Incident[];
  queue: QueueItem[];
  online: boolean;
  lastSync?: string;
  settings: {
    officer: string;
    circle: string;
    bighaSqm: number;
    reliefRate: number;
  };
  drafts: Record<string, Record<string, string>>;
};
