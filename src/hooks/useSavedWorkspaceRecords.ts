import {useEffect, useState} from 'react';

import {
  WorkspaceRecord,
  WorkspaceValues,
} from '../types/workspace';
import {
  createWorkspaceRecord,
  loadWorkspaceRecords,
  persistWorkspaceRecords,
} from '../utils/workspaceStorage';

type SaveWorkspaceRecordInput = {
  title: string;
  subtitle?: string;
  summaryLines: string[];
  values: WorkspaceValues;
};

export const useSavedWorkspaceRecords = (toolId: string) => {
  const [records, setRecords] = useState<WorkspaceRecord[]>([]);

  useEffect(() => {
    loadWorkspaceRecords(toolId)
      .then(setRecords)
      .catch(() => {
        setRecords([]);
      });
  }, [toolId]);

  const saveRecord = async (
    input: SaveWorkspaceRecordInput,
  ) => {
    const nextRecord = createWorkspaceRecord({
      ...input,
      toolId,
    });
    const nextRecords = [nextRecord, ...records].slice(0, 12);

    setRecords(nextRecords);
    await persistWorkspaceRecords(toolId, nextRecords);

    return nextRecord;
  };

  const deleteRecord = async (recordId: string) => {
    const nextRecords = records.filter(
      record => record.id !== recordId,
    );

    setRecords(nextRecords);
    await persistWorkspaceRecords(toolId, nextRecords);
  };

  return {
    deleteRecord,
    records,
    saveRecord,
  };
};
