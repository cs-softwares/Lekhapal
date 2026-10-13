import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  AppState,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { farmerRegistryHelpPage } from '../utils/farmerRegistryHelp';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Share from 'react-native-share';
import { generatePDF } from 'react-native-html-to-pdf';
import { z } from 'zod';
import AppScreen from '../components/AppScreen';
import {
  PortalWorkPanel,
  PortalWorkStatus,
} from '../components/revenue/PortalWorkControls';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { FEEDING_USER_AGENT } from '../domain/khasraFeeding';
import {
  OFFICIAL_WORK,
  inspectorRange,
  OfficialWorkJournal,
  OfficialWorkSnapshot,
  isOfficialWorkUrl,
  officialWorkJournalSchema,
  officialWorkScript,
  officialWorkSnapshotSchema,
} from '../domain/officialWork';
import { officialWorkBridge } from '../utils/officialWorkBridge';
import { REVENUE_PORTAL_PRESENTATION } from '../utils/revenuePortalPresentation';
import { printOfficialPdf } from '../native/workFiles';
import CensusControls from '../components/census/CensusControls';
import CensusPortal from '../components/census/CensusPortal';
import {
  CensusRules,
  DEFAULT_CENSUS_RULES,
  censusRulesSchema,
  censusFill,
  censusPreset,
} from '../domain/census';
import {
  nextPhase2Step,
  phase2Progress,
  Phase2Progress,
  validatePhase2Batch,
} from '../domain/censusPhase2';
import { propertyNumbers } from '../domain/prapatraQueue';

const batchSchema = z.object({
  records: z.array(z.string()).max(1000),
  done: z.array(z.string()).max(1000),
  current: z.string(),
  mode: z.enum(['records', 'serial']),
  context: z.string().default(''),
  selection: z.record(z.string(), z.string()).default({}),
  censusRules: censusRulesSchema.optional(),
});
type Batch = z.infer<typeof batchSchema>;
const emptyBatch = (): Batch => ({
  records: [],
  done: [],
  current: '',
  mode: 'records',
  context: '',
  selection: {},
});
const fileSchema = z.object({
  path: z.string(),
  title: z.string(),
  at: z.string(),
});
export default function OfficialWorkScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'OfficialWork'>) {
  const Portal = route.params.module === 'census' ? CensusPortal : WebView;
  const module = route.params.module,
    config = OFFICIAL_WORK[module],
    key = `lekhpal-official-${module}${
      module === 'census' &&
      route.params.workspaceState &&
      route.params.workspaceState !== 'UP'
        ? '-' + route.params.workspaceState
        : ''
    }`;
  const { language } = useLanguage(),
    { colors } = useAppTheme();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const web = useRef<WebView>(null),
    current = useRef<OfficialWorkSnapshot | null>(null),
    writes = useRef(Promise.resolve()),
    epoch = useRef(0),
    active = useRef(true);
  const canGoBack = useRef(false);
  const operation = useRef<{
      id: string;
      write: boolean;
      documentId: string;
    } | null>(null),
    pending = useRef<OfficialWorkJournal | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState<OfficialWorkSnapshot | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [helper, setHelper] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({}),
    [preset, setPreset] = useState<Record<string, string>>({});
  const [censusRules, setCensusRules] =
    useState<CensusRules>(DEFAULT_CENSUS_RULES);
  const [censusPresets, setCensusPresets] = useState<
    Record<string, Record<string, string>>
  >({});
  const [picker, setPicker] = useState<
    OfficialWorkSnapshot['fields'][number] | null
  >(null);
  const [from, setFrom] = useState('1'),
    [to, setTo] = useState('1');
  const batch = useRef<Batch>(emptyBatch()),
    running = useRef(false),
    [runningState, setRunningState] = useState(false),
    [tick, setTick] = useState(0);
  useEffect(() => {
    if (runningState) setHelper(false);
  }, [runningState]);
  const phase2 = useRef<Phase2Progress>(phase2Progress(''));
  const phase2ActivityAt = useRef(0);
  const helperScroll = useRef<ScrollView>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const revealCensusInput = useCallback(() => {
    if (module !== 'census' || !helper) return;
    requestAnimationFrame(() => {
      const input = TextInput.State.currentlyFocusedInput();
      if (input)
        helperScroll.current
          ?.getNativeScrollRef()
          ?.measureInWindow((_x: number, top: number) => {
            helperScroll.current?.scrollResponderScrollNativeHandleToKeyboard(
              input,
              top + 24,
              true,
            );
          });
    });
  }, [module, helper]);
  useEffect(() => {
    if (module !== 'census' || !helper) return;
    const show = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardInset(event.endCoordinates.height);
      revealCensusInput();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardInset(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [module, helper, revealCensusInput]);
  const censusApplyScope = useRef('');
  const censusApplying = useRef(false),
    censusSteps = useRef(new Set<string>());
  const attempted = useRef(new Set<string>()),
    selected = useRef(''),
    histories = useRef<OfficialWorkJournal[]>([]),
    [history, setHistory] = useState<OfficialWorkJournal[]>([]);
  const [files, setFiles] = useState<z.infer<typeof fileSchema>[]>([]),
    [historyOpen, setHistoryOpen] = useState(false);
  const source = useMemo(() => ({ uri: config.url }), [config.url]),
    bridge = useMemo(
      () => REVENUE_PORTAL_PRESENTATION + officialWorkBridge(module),
      [module],
    );
  const usable = ready && !!page && !page.busy && !busy;
  const persistBatch = useCallback(() => {
    const next = JSON.stringify(batch.current);
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(`${key}-batch`, next))
      .catch(() => {
        epoch.current++;
        running.current = false;
        if (active.current) {
          setRunningState(false);
          setStatus('Batch progress could not be saved. Automation stopped.');
        }
        throw Error('Batch persistence failed.');
      });
    writes.current.catch(() => undefined);
  }, [key]);
  const finish = useCallback(
    (state: OfficialWorkJournal['state'], message: string) => {
      if (timer.current) clearTimeout(timer.current);
      operation.current = null;
      const item = pending.current;
      pending.current = null;
      if (active.current) {
        setBusy(false);
        setStatus(message);
      }
      if (item) {
        const next = [{ ...item, state, message }, ...histories.current].slice(
          0,
          100,
        );
        histories.current = next;
        if (active.current) setHistory(next);
        if (state === 'confirmed' && item.record) {
          batch.current.done = [
            ...new Set([...batch.current.done, item.record]),
          ];
          persistBatch();
        }
        writes.current = writes.current
          .then(() =>
            AsyncStorage.setItem(`${key}-history`, JSON.stringify(next)),
          )
          .then(() => AsyncStorage.removeItem(`${key}-pending`))
          .catch(() => {
            running.current = false;
            if (active.current) {
              setRunningState(false);
              setStatus(
                'History could not be saved. Check the official record.',
              );
            }
          });
      }
      if (state !== 'confirmed') {
        censusApplying.current = false;
        running.current = false;
        if (active.current) setRunningState(false);
      }
    },
    [key, persistBatch],
  );
  const stop = useCallback(() => {
    epoch.current++;
    censusApplying.current = false;
    running.current = false;
    if (active.current) setRunningState(false);
    if (pending.current)
      finish(
        'uncertain',
        'Stopped. Verify any pending official action before retrying.',
      );
    else {
      operation.current = null;
      if (timer.current) clearTimeout(timer.current);
      if (active.current) setBusy(false);
    }
    const p = current.current;
    if (p)
      web.current?.injectJavaScript(
        officialWorkScript({
          id: `stop-${Date.now()}`,
          type: 'stop',
          documentId: p.documentId,
          revision: p.revision,
          url: p.url,
        }),
      );
  }, [finish]);
  useEffect(() => {
    active.current = true;
    let live = true;
    Promise.all(
      ['history', 'pending', 'batch', 'preset', 'files', 'census'].map(suffix =>
        AsyncStorage.getItem(`${key}-${suffix}`),
      ),
    )
      .then(async ([h, p, b, pr, f, census]) => {
        const rows = officialWorkJournalSchema
          .array()
          .parse(h ? JSON.parse(h) : []);
        if (p) {
          const prior = officialWorkJournalSchema.parse(JSON.parse(p));
          if (!rows.some(r => r.id === prior.id))
            rows.unshift({
              ...prior,
              state: 'uncertain',
              message:
                'Interrupted operation; verify the official record before retrying.',
            });
          await AsyncStorage.setItem(`${key}-history`, JSON.stringify(rows));
          await AsyncStorage.removeItem(`${key}-pending`);
        }
        const restored = b ? batchSchema.parse(JSON.parse(b)) : emptyBatch();
        if (live) {
          batch.current = restored;
          histories.current = rows;
          setHistory(rows);
          setPreset(
            z.record(z.string(), z.string()).parse(pr ? JSON.parse(pr) : {}),
          );
          setFiles(fileSchema.array().parse(f ? JSON.parse(f) : []));
          if (module === 'census' && census) {
            const saved = z
              .object({
                rules: censusRulesSchema,
                presets: z.record(z.string(), z.record(z.string(), z.string())),
              })
              .parse(JSON.parse(census));
            setCensusRules(saved.rules);
            setCensusPresets(saved.presets);
          }
          setReady(true);
          if (p) setStatus('An interrupted operation needs review in History.');
        }
      })
      .catch(() => {
        if (live)
          setStatus('Saved work could not be read. Helpers are paused.');
      });
    return () => {
      live = false;
      active.current = false;
      running.current = false;
      if (pending.current)
        finish('uncertain', 'Screen closed before confirmation.');
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, finish, module]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') stop();
    });
    return () => subscription.remove();
  }, [stop]);
  const send = useCallback(
    (
      type: 'fill' | 'action' | 'open',
      patch?: Record<string, string>,
      ref?: string,
      record?: string,
      action?: OfficialWorkSnapshot['actions'][number],
    ) => {
      const p = current.current;
      if (!ready || !p || p.busy || operation.current || !web.current) return;
      const id = `work-${Date.now()}-${Math.random()}`,
        token = epoch.current,
        writing = !!action && ['save', 'approve'].includes(action.kind);
      operation.current = { id, write: writing, documentId: p.documentId };
      setBusy(true);
      if (writing)
        pending.current = {
          id,
          record: record || batch.current.current || p.identity,
          at: new Date().toISOString(),
          action: action!.label,
          state: 'pending',
          message: 'Prepared without confirmation.',
        };
      const item = pending.current;
      writes.current = writes.current
        .then(async () => {
          if (writing && item)
            await AsyncStorage.setItem(`${key}-pending`, JSON.stringify(item));
          if (!active.current || operation.current?.id !== id) return;
          if (
            token !== epoch.current ||
            current.current?.documentId !== p.documentId ||
            current.current?.revision !== p.revision
          ) {
            finish('failed', 'Page changed before sending.');
            return;
          }
          web.current?.injectJavaScript(
            officialWorkScript({
              id,
              type,
              values: patch,
              ref,
              record,
              confirmDialogs:
                module === 'census' &&
                running.current &&
                batch.current.censusRules?.mode === 'phase2',
              documentId: p.documentId,
              revision: p.revision,
              url: p.url,
            }),
          );
          timer.current = setTimeout(() => {
            if (operation.current?.id === id)
              finish(
                'uncertain',
                'No confirmed response. Review the official page.',
              );
          }, 30000);
        })
        .catch(() => {
          if (operation.current?.id === id)
            finish(
              'failed',
              'Local persistence failed. No new action was sent.',
            );
        });
    },
    [ready, key, finish, module],
  );
  function requestAction(action: OfficialWorkSnapshot['actions'][number]) {
    const p = current.current,
      token = epoch.current;
    if (!p || !usable) return;
    if (!['save', 'approve', 'select-approval'].includes(action.kind)) {
      send('action', undefined, action.ref, undefined, action);
      return;
    }
    Alert.alert(
      'Apply this official action?',
      `${action.label}\nReview the current record and selected rows.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            if (
              token === epoch.current &&
              current.current?.documentId === p.documentId &&
              current.current?.revision === p.revision
            )
              send('action', undefined, action.ref, undefined, action);
            else setStatus('Page changed. Review again.');
          },
        },
      ],
    );
  }
  async function onMessage(raw: string, url: string) {
    if (!isOfficialWorkUrl(module, url) || raw.length > 8000000) return;
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (data.channel !== 'lekhpal-official-work-v1') return;
    if (
      data.type === 'document' &&
      data.id === operation.current?.id &&
      typeof data.html === 'string' &&
      data.html.length < 7000000
    ) {
      const token = epoch.current;
      try {
        const pdf = await generatePDF({
          html: data.html,
          fileName: `${module}-${Date.now()}`,
          directory: 'Documents',
        });
        if (!pdf.filePath) throw Error('PDF generation failed.');
        const saved = [
          {
            path: pdf.filePath,
            title: String(data.title).slice(0, 150),
            at: new Date().toISOString(),
          },
          ...files,
        ].slice(0, 200);
        await AsyncStorage.setItem(`${key}-files`, JSON.stringify(saved));
        if (active.current) {
          setFiles(saved);
          setBusy(false);
          setStatus('Official PDF saved. Open History to share it.');
        }
        operation.current = null;
        if (timer.current) clearTimeout(timer.current);
        if (token === epoch.current && running.current) {
          batch.current.done.push(batch.current.current);
          persistBatch();
          web.current?.goBack();
        }
      } catch {
        finish('failed', 'Could not save the PDF.');
      }
      return;
    }
    if (data.type === 'result' && data.id === operation.current?.id) {
      if (['filled', 'navigated'].includes(data.state)) {
        if (timer.current) clearTimeout(timer.current);
        operation.current = null;
        setBusy(false);
        setStatus(String(data.message));
      } else if (['confirmed', 'failed', 'uncertain'].includes(data.state))
        finish(data.state, String(data.message));
      return;
    }
    const parsed = officialWorkSnapshotSchema.safeParse(data);
    if (!parsed.success || !isOfficialWorkUrl(module, parsed.data.url)) return;
    const next = parsed.data,
      prior = current.current;
    current.current = next;
    setPage(next);
    setValues(old =>
      Object.fromEntries(
        next.fields.map(f => [
          f.ref,
          prior?.documentId === next.documentId &&
          prior.fields.find(x => x.ref === f.ref)?.value === f.value
            ? old[f.ref] ?? f.value
            : f.value,
        ]),
      ),
    );
    if (pending.current && !next.busy) {
      if (next.error || next.stage === 'login')
        finish('uncertain', 'The official request or session was interrupted.');
      else if (
        operation.current?.documentId !== next.documentId &&
        next.success
      )
        finish('confirmed', 'The official page reports successful completion.');
    }
  }
  useEffect(() => {
    if (
      !running.current ||
      !runningState ||
      !usable ||
      !page ||
      operation.current
    )
      return;
    const b = batch.current;
    if (
      (page.stage === 'list' ||
        b.mode === 'serial' ||
        module === 'inspector') &&
      b.context !== (page.context || page.documentId)
    ) {
      stop();
      setStatus(
        'The official village or session changed. Open the original work list before resuming.',
      );
      return;
    }
    if (page.stage === 'login' || page.stage === 'other') {
      stop();
      setStatus('Open the supported work page before resuming.');
      return;
    }
    if (module === 'census' && b.censusRules?.mode === 'phase2') {
      const next = b.records.find(id => !b.done.includes(id));
      if (!next) {
        stop();
        setStatus('Census Phase 2 range completed.');
        return;
      }
      if (phase2.current.record !== next) phase2.current = phase2Progress(next);
      b.current = next;
      try {
        const step = nextPhase2Step(page, b.censusRules, phase2.current);
        phase2.current = step.progress;
        if (step.kind === 'wait') return;
        if (attempted.current.has(step.key)) return;
        attempted.current.add(step.key);
        phase2ActivityAt.current = Date.now();
        persistBatch();
        if (step.kind === 'fill') send('fill', step.values);
        else send('action', undefined, step.action.ref, next, step.action);
      } catch (e) {
        stop();
        setStatus((e as Error).message);
      }
      return;
    }
    if (page.stage === 'list') {
      const next = b.records.find(id => !b.done.includes(id));
      if (!next) {
        stop();
        setStatus('Selected batch completed.');
        return;
      }
      const rows = page.entries.filter(e => e.key === next);
      if (rows.length !== 1) {
        stop();
        setStatus(
          'The selected record is missing or ambiguous. Review the list.',
        );
        return;
      }
      const openKey = `${page.documentId}:${next}`;
      if (attempted.current.has(openKey)) return;
      b.current = next;
      persistBatch();
      attempted.current.add(openKey);
      send('open', undefined, rows[0].ref, next);
      return;
    }
    if (page.stage === 'document') {
      const action = page.actions.find(a => a.kind === 'export');
      const exportKey = `export:${b.current}`;
      if (action && !attempted.current.has(exportKey)) {
        attempted.current.add(exportKey);
        send('action', undefined, action.ref, undefined, action);
      }
      return;
    }
    if (b.mode === 'serial') {
      const next = b.records.find(id => !b.done.includes(id));
      if (!next) {
        stop();
        setStatus('Census range completed.');
        return;
      }
      b.current = next;
      const serial = page.fields.find(f => f.key === 'sr_no');
      if (!serial) {
        stop();
        setStatus('Census serial field unavailable.');
        return;
      }
      if (page.identity !== next) {
        const selectKey = `${page.documentId}:${next}:serial`;
        if (selected.current !== selectKey) {
          selected.current = selectKey;
          persistBatch();
          send('fill', { [serial.ref]: next });
        }
        return;
      }
    }
    if (module === 'registry' && page.nameMatch !== 100) {
      stop();
      setStatus(
        `Name match ${
          page.nameMatch ?? 'unavailable'
        }. Review and choose the approval manually.`,
      );
      return;
    }
    const record = b.current || page.identity || page.documentId;
    if (b.done.includes(record)) {
      const backKey = record + ':return';
      if (
        b.records.some(id => !b.done.includes(id)) &&
        canGoBack.current &&
        !attempted.current.has(backKey)
      ) {
        attempted.current.add(backKey);
        web.current?.goBack();
      } else if (!b.records.some(id => !b.done.includes(id))) {
        stop();
        setStatus('Selected batch completed.');
      }
      return;
    }
    let patch: Record<string, string> = {};
    if (module === 'census') {
      try {
        patch = censusFill(
          page,
          b.selection,
          b.censusRules || DEFAULT_CENSUS_RULES,
        );
      } catch (e) {
        stop();
        setStatus((e as Error).message);
        return;
      }
    }
    for (const [fieldKey, value] of Object.entries(
      module === 'census' ? {} : module === 'inspector' ? b.selection : preset,
    )) {
      const fields = page.fields.filter(f => f.key === fieldKey);
      if (fields.length !== 1) {
        stop();
        setStatus(`Preset field ${fieldKey} changed. Review it.`);
        return;
      }
      if (fields[0].value !== value) patch[fields[0].ref] = value;
    }
    const fillKey =
      module === 'census'
        ? `${record}:fill:${JSON.stringify(patch)}`
        : `${record}:fill`;
    if (Object.keys(patch).length) {
      if (!attempted.current.has(fillKey)) {
        attempted.current.add(fillKey);
        send('fill', patch);
      } else if (module === 'census') {
        stop();
        setStatus(
          'A census field did not retain its value. Review the official form.',
        );
      }
      return;
    }
    if (module === 'registry') {
      const select = page.actions.find(a => a.kind === 'select-approval'),
        selectKey = `${record}:approved`;
      if (select && !attempted.current.has(selectKey)) {
        attempted.current.add(selectKey);
        send('action', undefined, select.ref, record, select);
        return;
      }
    }
    const actions = page.actions.filter(a =>
        ['save', 'approve'].includes(a.kind),
      ),
      writeKey = `${record}:write`;
    if (actions.length === 1 && !attempted.current.has(writeKey)) {
      attempted.current.add(writeKey);
      send('action', undefined, actions[0].ref, record, actions[0]);
    }
  }, [
    page,
    usable,
    runningState,
    tick,
    preset,
    module,
    persistBatch,
    send,
    stop,
  ]);
  useEffect(() => {
    if (
      !runningState ||
      module !== 'census' ||
      batch.current.censusRules?.mode !== 'phase2'
    )
      return;
    const watchdog = setInterval(() => {
      if (running.current && Date.now() - phase2ActivityAt.current > 30000) {
        stop();
        setStatus(
          'The Phase 2 page did not complete its next step. Review the holding before resuming.',
        );
      }
    }, 1000);
    return () => clearInterval(watchdog);
  }, [runningState, module, stop]);
  useEffect(() => {
    if (
      module !== 'census' ||
      !censusApplying.current ||
      !usable ||
      !page ||
      operation.current
    )
      return;
    try {
      if (
        censusApplyScope.current !==
        JSON.stringify([page.documentId, page.url, page.context, page.identity])
      )
        throw Error(
          'The census record changed. Review it before applying settings.',
        );
      const patch = censusFill(
        page,
        censusPresets[censusRules.mode] || {},
        censusRules,
      );
      const step = JSON.stringify(patch);
      if (!Object.keys(patch).length) {
        censusApplying.current = false;
        setRunningState(false);
        setStatus(
          'Workflow fields filled. Review the official record before saving.',
        );
        return;
      }
      if (censusSteps.current.has(step))
        throw Error(
          'A census field did not retain its value. Review the form.',
        );
      censusSteps.current.add(step);
      send('fill', patch);
    } catch (e) {
      stop();
      setStatus((e as Error).message);
    }
  }, [module, usable, page, censusPresets, censusRules, send, stop, tick]);
  const button = (label: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { borderColor: colors.primary },
        disabled && styles.disabled,
      ]}
    >
      <Text style={{ color: colors.primary }}>{label}</Text>
    </Pressable>
  );
  const input = [
    styles.input,
    { color: colors.text, borderColor: colors.border },
  ];
  const dirty = page?.fields.some(
    f => values[f.ref] !== undefined && values[f.ref] !== f.value,
  );
  function start(resume: boolean) {
    const p = current.current,
      token = epoch.current;
    if (!p || !usable) return;
    let records: string[];
    try {
      if (
        !resume &&
        (!/^[1-9]\d{0,3}$/.test(from) ||
          !/^[1-9]\d{0,3}$/.test(to) ||
          Number(to) < Number(from) ||
          Number(to) - Number(from) >= 1000)
      )
        throw Error('Choose a valid range of up to 1000 entries.');
      records = resume
        ? batch.current.records
        : module === 'census'
        ? propertyNumbers(from, to, '')
        : p.stage === 'list'
        ? p.entries.slice(Number(from) - 1, Number(to)).map(e => e.key)
        : [p.identity || p.documentId];
      if (!records.length) throw Error('Select a valid range.');
      if (resume && module === 'census' && !batch.current.censusRules)
        throw Error(
          'This older census batch has no saved workflow rules. Review completed records and start a new range.',
        );
      if (resume && batch.current.context !== (p.context || p.documentId))
        throw Error(
          'Open the original village and work list. If its identity cannot be read, start a new reviewed range.',
        );
      if (
        resume &&
        histories.current.some(
          h =>
            h.state === 'uncertain' &&
            records.includes(h.record) &&
            !batch.current.done.includes(h.record),
        )
      )
        throw Error(
          'A previous submission is uncertain. Verify that record on the portal, then start a new range excluding any completed records.',
        );
      if (module === 'census' && censusRules.mode === 'operational')
        throw Error(
          'Use the current-form controls for this workflow; review the official record before saving.',
        );
      if (module === 'census' && censusRules.mode === 'phase2') {
        validatePhase2Batch(resume ? batch.current.censusRules! : censusRules);
        if (!p.context || !/schedule_h\.jsp/i.test(p.url) || p.censusPopup)
          throw Error(
            'Open Schedule H in the correct village before starting Phase 2.',
          );
      }
      if (module === 'census' && !resume && censusRules.mode !== 'phase2')
        censusFill(p, censusPresets[censusRules.mode] || {}, censusRules);
      if (module === 'inspector' && !resume)
        inspectorRange(p, Number(from), Number(to));
    } catch (e) {
      setStatus((e as Error).message);
      return;
    }
    Alert.alert(
      'Start this official-work batch?',
      module === 'svamitva-pdf'
        ? 'The selected records will be exported to local PDFs.'
        : 'The selected records will use the saved preset and be submitted/approved automatically. Check the range and official values.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            if (
              token !== epoch.current ||
              current.current?.documentId !== p.documentId ||
              current.current?.revision !== p.revision
            ) {
              setStatus('Page changed. Review again.');
              return;
            }
            if (!resume)
              batch.current = {
                records,
                done: [],
                current: p.stage === 'entry' ? records[0] : '',
                mode: module === 'census' ? 'serial' : 'records',
                context: p.context || p.documentId,
                censusRules: module === 'census' ? censusRules : undefined,
                selection:
                  module === 'census'
                    ? censusPresets[censusRules.mode] ||
                      (censusRules.mode === 'standard' ? preset : {})
                    : module === 'inspector'
                    ? inspectorRange(p, Number(from), Number(to))
                    : {},
              };
            attempted.current.clear();
            phase2.current = phase2Progress('');
            phase2ActivityAt.current = Date.now();
            selected.current = '';
            persistBatch();
            running.current = true;
            setRunningState(true);
            setTick(n => n + 1);
          },
        },
      ],
    );
  }
  return (
    <AppScreen scroll={false}>
      <AppHeader
        title={config[language]}
        leftIconName="arrow-left"
        onLeftPress={() => {
          if (page?.censusPopup) {
            stop();
            web.current?.goBack();
          } else navigation.goBack();
        }}
        rightIcons={[
          {
            iconName: 'tune-variant',
            accessibilityLabel: t('Work settings', 'कार्य सेटिंग्स'),
            onPress: () => setHelper(true),
          },
        ]}
      />
      <PortalWorkStatus
        status={status}
        active={runningState || busy}
        onStop={stop}
        onDetails={() => setHelper(true)}
      />
      <Portal
        ref={web}
        {...(module === 'census' ? { onPopupBack: stop } : {})}
        source={source}
        style={styles.web}
        userAgent={FEEDING_USER_AGENT}
        javaScriptEnabled
        setSupportMultipleWindows={false}
        domStorageEnabled
        mixedContentMode="never"
        allowFileAccess={false}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={r => {
          if (module === 'registry' && r.isTopFrame !== false) {
            const help = farmerRegistryHelpPage(r.url, language);
            if (help) {
              navigation.navigate('WebViewPortal', help);
              return false;
            }
          }
          return isOfficialWorkUrl(module, r.url);
        }}
        injectedJavaScript={bridge}
        injectedJavaScriptBeforeContentLoaded={REVENUE_PORTAL_PRESENTATION}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly
        injectedJavaScriptForMainFrameOnly
        onNavigationStateChange={state => {
          canGoBack.current = state.canGoBack;
        }}
        onLoadStart={() => {
          current.current = null;
          setPage(null);
          setValues({});
        }}
        onLoadEnd={() => web.current?.injectJavaScript(bridge)}
        onMessage={e => {
          onMessage(e.nativeEvent.data, e.nativeEvent.url).catch(() => {
            stop();
            setStatus('The portal response could not be processed.');
          });
        }}
        onError={() => {
          stop();
          setStatus('The official page could not load.');
        }}
      />
      <PortalWorkPanel
        visible={helper}
        title={config[language]}
        onClose={() => setHelper(false)}
        onHistory={() => setHistoryOpen(true)}
        onStop={stop}
      >
        <ScrollView
          ref={helperScroll}
          onFocus={() => {
            if (keyboardInset) revealCensusInput();
          }}
          style={styles.helper}
          contentContainerStyle={[
            styles.content,
            module === 'census' &&
              keyboardInset > 0 && { paddingBottom: keyboardInset + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {!!status && (
            <Text accessibilityRole="alert" style={{ color: colors.text }}>
              {status}
            </Text>
          )}
          <Text style={{ color: colors.text }}>
            {t(
              'Sign in on the official portal, open this work and review the records. Helpers appear for supported pages.',
              'आधिकारिक पोर्टल पर लॉगिन करके संबंधित कार्य खोलें और रिकॉर्ड जांचें। संबंधित पेज पर सहायक उपलब्ध होंगे।',
            )}
          </Text>
          {module === 'census' && (
            <CensusControls
              page={page}
              rules={censusRules}
              disabled={!ready || busy || runningState}
              onError={setStatus}
              onPreview={patch => setValues(old => ({ ...old, ...patch }))}
              onChange={rules => {
                setCensusRules(rules);
                writes.current = writes.current.then(() =>
                  AsyncStorage.setItem(
                    `${key}-census`,
                    JSON.stringify({ rules, presets: censusPresets }),
                  ),
                );
                writes.current.catch(() => {
                  stop();
                  setStatus('Census settings could not be saved.');
                });
              }}
            />
          )}
          {module === 'registry' && page?.nameMatch !== undefined && (
            <Text style={{ color: colors.text }}>
              Name match: {page.nameMatch}%
            </Text>
          )}
          {!(module === 'census' && censusRules.mode === 'operational') && (
            <>
              <View style={styles.row}>
                <View style={styles.grow}>
                  <Text style={{ color: colors.text }}>From</Text>
                  <TextInput
                    accessibilityLabel="Batch from"
                    value={from}
                    onChangeText={setFrom}
                    keyboardType="number-pad"
                    style={input}
                  />
                </View>
                <View style={styles.grow}>
                  <Text style={{ color: colors.text }}>To</Text>
                  <TextInput
                    accessibilityLabel="Batch to"
                    value={to}
                    onChangeText={setTo}
                    keyboardType="number-pad"
                    style={input}
                  />
                </View>
              </View>
              {button(
                t('Start selected batch', 'चुना हुआ बैच शुरू करें'),
                () => start(false),
                !usable ||
                  runningState ||
                  !page ||
                  ['login', 'other'].includes(page.stage),
              )}
              {!!batch.current.records.length &&
                button(
                  t('Resume saved batch', 'सेव बैच जारी करें'),
                  () => start(true),
                  !usable || runningState,
                )}
              {!!page?.entries.length && (
                <Text style={{ color: colors.text }}>
                  {page.entries.length} available records ·{' '}
                  {batch.current.done.length} completed
                </Text>
              )}
            </>
          )}
          {module === 'census' &&
            button(
              'Apply census workflow to current record',
              () => {
                try {
                  if (!page) return;
                  censusFill(
                    page,
                    censusPresets[censusRules.mode] || {},
                    censusRules,
                  );
                  censusSteps.current.clear();
                  censusApplyScope.current = JSON.stringify([
                    page.documentId,
                    page.url,
                    page.context,
                    page.identity,
                  ]);
                  censusApplying.current = true;
                  setRunningState(true);
                  setTick(n => n + 1);
                } catch (e) {
                  setStatus((e as Error).message);
                }
              },
              !usable || runningState,
            )}
          {page?.fields.map(f => (
            <View key={f.ref} style={styles.field}>
              <Text style={{ color: colors.text }}>{f.label}</Text>
              {f.kind === 'select' ? (
                button(
                  f.options.find(o => o.value === (values[f.ref] ?? f.value))
                    ?.label || 'Choose',
                  () => setPicker(f),
                  !usable || runningState,
                )
              ) : ['checkbox', 'radio'].includes(f.kind) ? (
                button(
                  `${values[f.ref] === 'true' ? '✓ ' : ''}${f.label}`,
                  () =>
                    setValues(old => ({
                      ...old,
                      [f.ref]: old[f.ref] === 'true' ? 'false' : 'true',
                    })),
                  !usable || runningState,
                )
              ) : (
                <TextInput
                  accessibilityLabel={f.label}
                  value={values[f.ref] ?? f.value}
                  onChangeText={value =>
                    setValues(old => ({ ...old, [f.ref]: value }))
                  }
                  editable={usable && !runningState}
                  style={input}
                />
              )}
            </View>
          ))}
          {!!page?.fields.length && (
            <>
              {button(
                t('Fill changed fields', 'बदले हुए फील्ड भरें'),
                () =>
                  send(
                    'fill',
                    Object.fromEntries(
                      page.fields
                        .filter(f => values[f.ref] !== f.value)
                        .map(f => [f.ref, values[f.ref]]),
                    ),
                  ),
                !usable || !dirty || runningState,
              )}
              {button(
                t('Save current form preset', 'वर्तमान फॉर्म प्रीसेट सेव करें'),
                () => {
                  const next =
                    module === 'census'
                      ? censusPreset(page)
                      : Object.fromEntries(
                          page.fields
                            .filter(
                              f =>
                                ![
                                  'sr_no',
                                  'hl_name_local',
                                  'f_h_name_local',
                                  'khata_no',
                                ].includes(f.key) && !/^area\d/.test(f.key),
                            )
                            .map(f => [f.key, f.value]),
                        );
                  if (module === 'census') {
                    const presets = {
                      ...censusPresets,
                      [censusRules.mode]: next,
                    };
                    AsyncStorage.setItem(
                      `${key}-census`,
                      JSON.stringify({ rules: censusRules, presets }),
                    )
                      .then(() => {
                        setCensusPresets(presets);
                        setStatus('Census workflow preset saved.');
                      })
                      .catch(() =>
                        setStatus('Census preset could not be saved.'),
                      );
                    return;
                  }
                  AsyncStorage.setItem(`${key}-preset`, JSON.stringify(next))
                    .then(() => setPreset(next))
                    .catch(() => setStatus('Preset could not be saved.'));
                },
                !usable || !!dirty || runningState,
              )}
            </>
          )}
          {page?.actions.map(a => (
            <React.Fragment key={a.ref}>
              {button(
                a.label,
                () => requestAction(a),
                !usable || !!dirty || runningState,
              )}
            </React.Fragment>
          ))}
        </ScrollView>
      </PortalWorkPanel>
      <Modal
        visible={!!picker}
        transparent
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.modal}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <ScrollView>
              {picker?.options.map(o => (
                <React.Fragment key={o.value}>
                  {button(
                    o.label,
                    () => {
                      if (picker) send('fill', { [picker.ref]: o.value });
                      setPicker(null);
                    },
                    !usable,
                  )}
                </React.Fragment>
              ))}
            </ScrollView>
            {button('Close', () => setPicker(null))}
          </View>
        </View>
      </Modal>
      <Modal visible={historyOpen} onRequestClose={() => setHistoryOpen(false)}>
        <AppScreen scroll={false}>
          <AppHeader
            title={t('History & files', 'इतिहास और फाइलें')}
            leftIconName="arrow-left"
            onLeftPress={() => setHistoryOpen(false)}
          />
          <ScrollView contentContainerStyle={styles.content}>
            {!files.length && !history.length && (
              <Text style={{ color: colors.textMuted }}>
                {t('No saved work yet.', 'अभी कोई कार्य सेव नहीं हुआ।')}
              </Text>
            )}
            {files.map(f => (
              <React.Fragment key={f.path}>
                {button('Print · ' + f.title, () => {
                  printOfficialPdf(f.path, f.title).catch(error =>
                    setStatus(error.message),
                  );
                })}
                {button(`${f.title} · ${f.at}`, () => {
                  Share.open({
                    url: f.path.startsWith('file://')
                      ? f.path
                      : `file://${f.path}`,
                    type: 'application/pdf',
                    title: f.title,
                    saveToFiles: true,
                    failOnCancel: false,
                  }).catch(() => setStatus('Could not open this saved file.'));
                })}
              </React.Fragment>
            ))}
            {history.map(h => (
              <View key={h.id} style={styles.field}>
                <Text style={{ color: colors.text }}>
                  {h.action} · {h.state}
                </Text>
                <Text style={{ color: colors.text }}>{h.message}</Text>
              </View>
            ))}
          </ScrollView>
        </AppScreen>
      </Modal>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  grow: { flex: 1 },
  web: { flex: 1 },
  helper: { flex: 1 },
  content: { padding: 16, gap: 10 },
  button: { borderWidth: 1, borderRadius: 8, padding: 12 },
  disabled: { opacity: 0.4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10 },
  field: { gap: 6, paddingVertical: 5 },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  sheet: { maxHeight: '75%', padding: 20, gap: 10 },
});
