import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import {
  DemandRecord,
  demandRecordSchema,
  EchawadiSnapshot,
  echawadiScript,
} from '../domain/echawadi';
const KEY = 'lekhpal-MH-echawadi-transactions-v1';
const entrySchema = z.object({
  id: z.string(),
  at: z.string(),
  context: z.string(),
  account: z.string(),
  amount: z.number().nullable(),
  mode: z.enum(['demand', 'receipts']),
  state: z.enum(['pending', 'confirmed', 'uncertain', 'reviewed']),
  message: z.string(),
  demand: z.array(demandRecordSchema).max(10000).optional(),
});
type Entry = z.infer<typeof entrySchema>;
export function useEchawadiWrite(
  page: EchawadiSnapshot | null,
  inject: (script: string) => void,
  status: (message: string) => void,
) {
  const current = useRef(page);
  current.current = page;
  const injectRef = useRef(inject);
  injectRef.current = inject;
  const statusRef = useRef(status);
  statusRef.current = status;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true),
    epoch = useRef(0),
    pending = useRef<Entry | null>(null),
    rows = useRef<Entry[]>([]),
    writes = useRef(Promise.resolve());
  const [history, setHistory] = useState<Entry[]>([]),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const persist = useCallback((next: Entry[]) => {
    rows.current = next;
    if (active.current) setHistory(next);
    writes.current = writes.current.then(() =>
      AsyncStorage.setItem(KEY, JSON.stringify(next)),
    );
    return writes.current;
  }, []);
  const finish = useCallback(
    (state: 'confirmed' | 'uncertain', message: string) => {
      const p = pending.current;
      if (timer.current) clearTimeout(timer.current);
      pending.current = null;
      if (active.current) {
        setBusy(false);
        statusRef.current(message);
      }
      if (p)
        persist(
          rows.current.map(r => (r.id === p.id ? { ...r, state, message } : r)),
        ).catch(() => {
          if (active.current) {
            setReady(false);
            statusRef.current(
              'History could not be saved. Reopen and review the official record.',
            );
          }
        });
    },
    [persist],
  );
  const stop = useCallback(() => {
    epoch.current++;
    if (pending.current) {
      injectRef.current(
        "window.__lekhpalEchawadi && window.__lekhpalEchawadi.command({action:'stop'});true;",
      );
      finish(
        'uncertain',
        'Interrupted submission. Verify the official record before trying again.',
      );
    }
  }, [finish]);
  useEffect(() => {
    active.current = true;
    AsyncStorage.getItem(KEY)
      .then(async raw => {
        const restored = entrySchema
          .array()
          .max(10000)
          .parse(raw ? JSON.parse(raw) : [])
          .map(r =>
            r.state === 'pending'
              ? {
                  ...r,
                  state: 'uncertain' as const,
                  message: 'Interrupted. Verify the official record.',
                }
              : r,
          );
        if (!active.current) return;
        await persist(restored);
        if (active.current) setReady(true);
      })
      .catch(() => {
        if (active.current)
          statusRef.current(
            'Transaction history could not be read. Submissions are paused.',
          );
      });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      active.current = false;
      injectRef.current(
        "window.__lekhpalEchawadi && window.__lekhpalEchawadi.command({action:'stop'});true;",
      );
    };
  }, [persist]);
  const submit = (preapproved?: 'batch-approved', demand?: DemandRecord[]) => {
    const p = current.current;
    if (
      !ready ||
      busy ||
      pending.current ||
      !p ||
      p.busy ||
      !p.canSubmit ||
      !['demand', 'receipts'].includes(p.mode) ||
      !p.context
    ) {
      statusRef.current(
        'Open a ready official form with its village selected.',
      );
      return;
    }
    if (rows.current.some(r => ['uncertain', 'pending'].includes(r.state))) {
      statusRef.current(
        'Review the interrupted action in transaction history before submitting again.',
      );
      return;
    }
    const account = p.mode === 'receipts' ? p.payment?.account || '' : '';
    const amount = p.mode === 'receipts' ? p.payment?.amount ?? null : null;
    if (
      p.mode === 'receipts' &&
      (!account ||
        amount === null ||
        amount <= 0 ||
        !/^(cash|रोख|नकद)$/i.test(p.payment?.method || ''))
    ) {
      statusRef.current(
        'Check the loaded account, payment amount and Cash mode on the official form.',
      );
      return;
    }
    if (
      p.mode === 'demand' &&
      !p.rows.some(r => r.checked) &&
      !demand?.length
    ) {
      statusRef.current('Select and review the demand records first.');
      return;
    }
    if (
      demand &&
      (!demand.length ||
        !demandRecordSchema.array().max(10000).safeParse(demand).success ||
        JSON.stringify(demand) !== JSON.stringify(p.selectedDemand))
    ) {
      statusRef.current(
        'The selected demand records changed. Prepare the batch again.',
      );
      return;
    }
    const token = epoch.current;
    const execute = async () => {
      if (
        !active.current ||
        token !== epoch.current ||
        pending.current ||
        current.current?.documentId !== p.documentId ||
        current.current?.revision !== p.revision
      ) {
        statusRef.current('The page changed. Review it again.');
        return;
      }
      const entry: Entry = {
        id: `mh-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        at: new Date().toISOString(),
        context: p.context,
        account,
        amount,
        mode: p.mode as 'demand' | 'receipts',
        state: 'pending',
        message: 'Waiting for official confirmation.',
        demand,
      };
      pending.current = entry;
      setBusy(true);
      try {
        if (rows.current.length >= 10000)
          throw Error(
            'History is full. Export or review history before continuing.',
          );
        await persist([entry, ...rows.current]);
        if (
          !active.current ||
          token !== epoch.current ||
          current.current?.documentId !== p.documentId ||
          current.current?.revision !== p.revision
        ) {
          finish(
            'uncertain',
            'Page changed before submission. Check the record.',
          );
          return;
        }
        timer.current = setTimeout(
          () =>
            finish(
              'uncertain',
              'No confirmed response. Verify the official record.',
            ),
          30000,
        );
        injectRef.current(
          echawadiScript(p, 'submit', {
            id: entry.id,
            account,
            amount,
            context: p.context,
            demand,
            confirmDemand: !!demand,
          }),
        );
      } catch {
        pending.current = null;
        setBusy(false);
        setReady(false);
        statusRef.current(
          'History could not be saved. No submission was sent.',
        );
      }
    };
    if (preapproved === 'batch-approved') {
      execute();
      return;
    }
    Alert.alert(
      'Submit this official record?',
      `${p.context}\n${
        account
          ? `Account ${account} · Cash ₹${amount}`
          : 'Generate demand for the official selection. Review all selected pages.'
      }\nThis changes the official record.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: execute },
      ],
    );
  };
  const receive = (value: {
    type?: string;
    id?: string;
    state?: string;
    message?: string;
  }) => {
    if (value.type !== 'transaction') return false;
    if (
      pending.current &&
      value.id === pending.current.id &&
      ['confirmed', 'uncertain'].includes(value.state || '')
    )
      finish(
        value.state as 'confirmed' | 'uncertain',
        String(value.message).slice(0, 500),
      );
    return true;
  };
  const review = (id: string) =>
    Alert.alert(
      'Have you checked the official record?',
      'Mark reviewed only after checking whether this action was saved. This does not submit or reverse anything.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Checked',
          onPress: () => {
            persist(
              rows.current.map(r =>
                r.id === id && r.state === 'uncertain'
                  ? {
                      ...r,
                      state: 'reviewed',
                      message: 'Official record reviewed by user.',
                    }
                  : r,
              ),
            ).catch(() => {
              setReady(false);
              statusRef.current('Review could not be saved.');
            });
          },
        },
      ],
    );
  return { history, ready, busy, submit, receive, stop, review };
}
