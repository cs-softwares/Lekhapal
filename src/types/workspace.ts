export type WorkspaceValues = Record<string, string>;

export type WorkspaceRecord = {
  id: string;
  toolId: string;
  title: string;
  subtitle?: string;
  summaryLines: string[];
  values: WorkspaceValues;
  organization?: {owner: string; village: string; plot: string; client: string; notes: string};
  createdAt: string;
  updatedAt: string;
};
