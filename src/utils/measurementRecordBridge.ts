import {WorkspaceRecord} from '../types/workspace';

type PendingMeasurementRecordSelection = {
  moduleId: string;
  record: WorkspaceRecord;
};

let pendingMeasurementRecordSelection:
  | PendingMeasurementRecordSelection
  | null = null;

export const setPendingMeasurementRecordSelection = (
  selection: PendingMeasurementRecordSelection,
) => {
  pendingMeasurementRecordSelection = selection;
};

export const consumePendingMeasurementRecordSelection = () => {
  const nextSelection = pendingMeasurementRecordSelection;
  pendingMeasurementRecordSelection = null;
  return nextSelection;
};
