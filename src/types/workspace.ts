export type WorkspaceValues = Record<string, string>;

export type WorkspaceRecord = {
  id: string;
  toolId: string;
  title: string;
  subtitle?: string;
  summaryLines: string[];
  values: WorkspaceValues;
  createdAt: string;
  updatedAt: string;
};
