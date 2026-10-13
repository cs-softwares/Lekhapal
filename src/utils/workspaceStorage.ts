import AsyncStorage from '@react-native-async-storage/async-storage';

import { WorkspaceRecord, WorkspaceValues } from '../types/workspace';

import { STATE_SELECTION_STORAGE_KEY } from '../data/stateDashboardCatalog';

import { effectiveWorkspaceState } from '../config/releaseFeatures';

const STORAGE_PREFIX = 'smart-work-records';
const MAX_RECORDS = 12;

const getStorageKey = async (toolId: string, workspaceState?: string) => {
  const state =
    workspaceState ??
    effectiveWorkspaceState(
      await AsyncStorage.getItem(STATE_SELECTION_STORAGE_KEY),
    );
  return `${STORAGE_PREFIX}-${state || 'unassigned'}-${toolId}`;
};

export const loadWorkspaceRecords = async (
  toolId: string,
  workspaceState?: string,
): Promise<WorkspaceRecord[]> => {
  const key = await getStorageKey(toolId, workspaceState);
  let rawValue = await AsyncStorage.getItem(key);
  // Earlier releases only had the UP workspace. Keep those saved calculations available there.
  if (!rawValue && key.startsWith(`${STORAGE_PREFIX}-UP-`)) {
    rawValue = await AsyncStorage.getItem(`${STORAGE_PREFIX}-${toolId}`);
  }

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    return Array.isArray(parsedValue) ? (parsedValue as WorkspaceRecord[]) : [];
  } catch {
    return [];
  }
};

export const persistWorkspaceRecords = async (
  toolId: string,
  records: WorkspaceRecord[],
  workspaceState?: string,
) => {
  await AsyncStorage.setItem(
    await getStorageKey(toolId, workspaceState),
    JSON.stringify(records.slice(0, MAX_RECORDS)),
  );
};

export const createWorkspaceRecord = ({
  summaryLines,
  subtitle,
  title,
  toolId,
  values,
}: {
  toolId: string;
  title: string;
  subtitle?: string;
  summaryLines: string[];
  values: WorkspaceValues;
}): WorkspaceRecord => {
  const timestamp = new Date().toISOString();

  return {
    createdAt: timestamp,
    id: `${toolId}-${Date.now()}`,
    subtitle,
    summaryLines,
    title,
    toolId,
    updatedAt: timestamp,
    values,
  };
};
