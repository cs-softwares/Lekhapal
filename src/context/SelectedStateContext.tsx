import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { consumePendingMeasurementRecordSelection } from '../utils/measurementRecordBridge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STATE_SELECTION_STORAGE_KEY } from '../data/stateDashboardCatalog';
import {
  effectiveWorkspaceState,
  isWorkspaceState,
} from '../config/releaseFeatures';
type SelectedStateStore = {
  stateCode: string | null;
  ready: boolean;
  selectState: (code: string) => Promise<void>;
};
const Context = createContext<SelectedStateStore | null>(null);
export function SelectedStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const selecting = useRef(false);
  const selectionVersion = useRef(0);
  useEffect(() => {
    let active = true;
    const version = selectionVersion.current;
    AsyncStorage.getItem(STATE_SELECTION_STORAGE_KEY)
      .then(code => {
        if (
          active &&
          version === selectionVersion.current &&
          isWorkspaceState(code)
        ) {
          consumePendingMeasurementRecordSelection();
          setStateCode(code);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const selectState = async (code: string) => {
    if (!isWorkspaceState(code)) {
      throw new Error('Choose a valid state or union territory.');
    }
    if (selecting.current)
      throw new Error('A state change is already in progress.');
    selecting.current = true;
    selectionVersion.current++;
    try {
      await AsyncStorage.setItem(STATE_SELECTION_STORAGE_KEY, code);
      consumePendingMeasurementRecordSelection();
      setStateCode(code);
    } finally {
      selecting.current = false;
    }
  };
  return (
    <Context.Provider
      value={{
        stateCode: effectiveWorkspaceState(stateCode),
        ready,
        selectState,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSelectedState() {
  const value = useContext(Context);
  if (!value) {
    throw new Error('SelectedStateProvider is required');
  }
  return value;
}
