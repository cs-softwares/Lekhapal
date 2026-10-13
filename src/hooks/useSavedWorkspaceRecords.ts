import { noteSuccessfulWorkSave } from '../services/interstitialAds';
import { requestPremiumAccess } from '../services/premiumAccess';
import { useEffect, useRef, useState } from 'react';
import { useSelectedState } from '../context/SelectedStateContext';

import { WorkspaceRecord, WorkspaceValues } from '../types/workspace';
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
  const { stateCode } = useSelectedState();
  const workspaceState = stateCode || 'UP';
  const [records, setRecords] = useState<WorkspaceRecord[]>([]);
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    setRecords([]);
    loadWorkspaceRecords(toolId, workspaceState)
      .then(next => {
        if (generation.current === current) setRecords(next);
      })
      .catch(() => {
        if (generation.current === current) setRecords([]);
      });
    return () => {
      generation.current = current + 1;
    };
  }, [toolId, workspaceState]);

  const saveRecord = async (input: SaveWorkspaceRecordInput) => {
    const currentGeneration = generation.current;
    const nextRecord = createWorkspaceRecord({
      ...input,
      toolId,
    });
    // The notebook can change while this workspace remains mounted.
    const currentRecords = await loadWorkspaceRecords(toolId, workspaceState);
    const nextRecords = [nextRecord, ...currentRecords].slice(0, 12);

    await persistWorkspaceRecords(toolId, nextRecords, workspaceState);
    if (generation.current === currentGeneration) setRecords(nextRecords);
    noteSuccessfulWorkSave(toolId);

    return nextRecord;
  };

  const deleteRecord = async (recordId: string) => {
    const currentGeneration = generation.current;
    const currentRecords = await loadWorkspaceRecords(toolId, workspaceState);
    const nextRecords = currentRecords.filter(record => record.id !== recordId);

    await persistWorkspaceRecords(toolId, nextRecords, workspaceState);
    if (generation.current === currentGeneration) setRecords(nextRecords);
  };

  const organizeRecord = async (
    recordId: string,
    organization: NonNullable<WorkspaceRecord['organization']>,
    title?: string,
  ) => {
    if (!requestPremiumAccess('gps_capture')) return;
    const currentGeneration = generation.current;
    const current = await loadWorkspaceRecords(toolId, workspaceState);
    const next = current.map(record =>
      record.id === recordId
        ? {
            ...record,
            organization,
            title: title?.trim() || record.title,
            updatedAt: new Date().toISOString(),
          }
        : record,
    );
    await persistWorkspaceRecords(toolId, next, workspaceState);
    if (generation.current === currentGeneration) setRecords(next);
  };

  return {
    organizeRecord,
    deleteRecord,
    records,
    saveRecord,
  };
};
