import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import {
  createInitialDeskState,
  removeSampleData,
} from '../data/initialDeskState';
import { DeskState } from '../types';
import { createId } from '../domain/desk';
const STORAGE_KEY = 'lekhpal-field-desk-v1';
const point = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
});
const schema = z.object({
  version: z.literal(1),
  sampleDataRemoved: z.boolean().optional(),
  lands: z.array(
    z.object({
      id: z.string(),
      plot: z.string(),
      khata: z.string(),
      village: z.string(),
      villageCode: z.string(),
      tehsil: z.string(),
      hectares: z.number().positive(),
      classification: z.enum([
        'Sankramaniya Bhumidhar',
        'Asankramaniya Bhumidhar',
      ]),
      owners: z.array(
        z.object({ name: z.string(), share: z.number().positive() }),
      ),
      location: point,
      flagged: z.boolean().optional(),
    }),
  ),
  mutations: z.array(
    z.object({
      id: z.string(),
      landId: z.string(),
      buyer: z.string(),
      seller: z.string(),
      buyerVerified: z.boolean(),
      sellerVerified: z.boolean(),
      category: z.enum(['Registry Sale', 'Inheritance', 'Gift Deed']),
      status: z.enum(['Pending', 'Objections', 'Approved', 'Rejected']),
      filedAt: z.string(),
      noticeAt: z.string().optional(),
      reason: z.string().optional(),
      objection: z.string().optional(),
      transferShare: z.number().positive(),
    }),
  ),
  surveys: z.array(
    z.object({
      id: z.string(),
      landId: z.string(),
      points: z.array(point),
      areaSqm: z.number(),
      createdAt: z.string(),
      source: z.enum(['GPS', 'Manual']),
    }),
  ),
  crops: z.array(
    z.object({
      id: z.string(),
      landId: z.string(),
      season: z.string(),
      crop: z.string(),
      disaster: z.string(),
      loss: z.number(),
      hectares: z.number(),
      payout: z.number(),
      photo: z.object({
        id: z.string(),
        createdAt: z.string(),
        location: point,
        simulated: z.literal(true),
      }),
      createdAt: z.string(),
    }),
  ),
  certificates: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['Income', 'Caste', 'Residence']),
      income: z.number(),
      family: z.number(),
      landId: z.string().optional(),
      address: z.string(),
      status: z.enum(['Pending', 'Recommended', 'Re-verification', 'Rejected']),
      reason: z.string().optional(),
    }),
  ),
  publicLands: z.array(
    z.object({
      id: z.string(),
      plot: z.string(),
      village: z.string(),
      kind: z.enum([
        'Pond / Talab',
        'Pasture / Charaagah',
        'Graveyard / Kabristan',
      ]),
      hectares: z.number(),
      location: point,
    }),
  ),
  incidents: z.array(
    z.object({
      id: z.string(),
      publicLandId: z.string(),
      violator: z.string(),
      details: z.string(),
      location: point,
      createdAt: z.string(),
      status: z.enum([
        'Reported',
        'Notice issued',
        'Inspection scheduled',
        'Resolved',
      ]),
      noticeAt: z.string().optional(),
    }),
  ),
  queue: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      createdAt: z.string(),
      syncedAt: z.string().optional(),
    }),
  ),
  online: z.boolean(),
  lastSync: z.string().optional(),
  settings: z.object({
    officer: z.string(),
    circle: z.string(),
    bighaSqm: z.number().positive(),
    reliefRate: z.number().nonnegative(),
  }),
  drafts: z.record(z.string(), z.record(z.string(), z.string())),
});
type Update = (state: DeskState) => DeskState;
type Store = {
  state: DeskState;
  commit: (label: string, update: Update) => Promise<void>;
  saveDraft: (key: string, data: Record<string, string>) => Promise<void>;
  sync: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function DeskProvider({
  children,
  stateCode,
}: {
  children: React.ReactNode;
  stateCode?: string | null;
}) {
  const storageKey = stateCode ? `${STORAGE_KEY}-${stateCode}` : STORAGE_KEY;
  const [state, setState] = useState(createInitialDeskState);
  const current = useRef(state);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const hydrate = useCallback(async () => {
    try {
      setError('');
      const raw = await AsyncStorage.getItem(storageKey);
      let next = raw ? schema.parse(JSON.parse(raw)) : createInitialDeskState();
      if (!next.sampleDataRemoved) {
        // Retain the old workspace before removing automatically seeded demo records.
        await AsyncStorage.setItem(`${storageKey}-before-sample-removal`, raw!);
        next = removeSampleData(next);
        await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      }
      current.current = next;
      setState(next);
      setReady(true);
    } catch {
      setError(
        'Local records could not be read. Your stored data has been preserved. Tap to retry.',
      );
    }
  }, [storageKey]);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  const commit = useCallback(
    (label: string, update: Update): Promise<void> => {
      const task = chain.current.then(async () => {
        const next = update(current.current);
        if (label) {
          next.queue = [
            {
              id: createId('event'),
              label,
              createdAt: new Date().toISOString(),
            },
            ...next.queue,
          ];
        }
        await AsyncStorage.setItem(storageKey, JSON.stringify(next));
        current.current = next;
        setState(next);
      });
      chain.current = task.catch(() => {});
      return task;
    },
    [storageKey],
  );
  const sync = () =>
    commit('', s => {
      if (!s.online) {
        throw new Error('Switch to Online State before syncing.');
      }
      const now = new Date().toISOString();
      return {
        ...s,
        lastSync: now,
        queue: s.queue.map(q => (q.syncedAt ? q : { ...q, syncedAt: now })),
      };
    });
  const saveDraft = useCallback(
    (key: string, data: Record<string, string>) =>
      commit('', st => ({ ...st, drafts: { ...st.drafts, [key]: data } })),
    [commit],
  );
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        {error ? (
          <Text accessibilityRole="button" onPress={() => void hydrate()}>
            {error}
          </Text>
        ) : (
          <>
            <ActivityIndicator />
            <Text>Opening your field desk…</Text>
          </>
        )}
      </View>
    );
  }
  return (
    <Context.Provider
      value={{
        state,
        commit,
        sync,
        saveDraft,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDesk() {
  const context = useContext(Context);
  if (!context) {
    throw new Error('DeskProvider is required');
  }
  return context;
}
