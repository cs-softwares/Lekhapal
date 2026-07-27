import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  WorkspaceRecord,
  WorkspaceValues,
} from '../types/workspace';

const STORAGE_PREFIX = 'smart-work-records';
const MAX_RECORDS = 12;

const getStorageKey = (toolId: string) =>
  `${STORAGE_PREFIX}-${toolId}`;

export const loadWorkspaceRecords = async (
  toolId: string,
): Promise<WorkspaceRecord[]> => {
  const rawValue = await AsyncStorage.getItem(
    getStorageKey(toolId),
  );

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    return Array.isArray(parsedValue)
      ? (parsedValue as WorkspaceRecord[])
      : [];
  } catch {
    return [];
  }
};

export const persistWorkspaceRecords = async (
  toolId: string,
  records: WorkspaceRecord[],
) => {
  await AsyncStorage.setItem(
    getStorageKey(toolId),
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
