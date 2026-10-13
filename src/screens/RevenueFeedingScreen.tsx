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
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import AppScreen from '../components/AppScreen';
import {
  PortalWorkPanel,
  PortalWorkStatus,
} from '../components/revenue/PortalWorkControls';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { FEEDING_USER_AGENT } from '../domain/khasraFeeding';
import {
  RevenueAction,
  RevenueField,
  RevenueJournal,
  RevenueSnapshot,
  REVENUE_MODULES,
  anshShare,
  isRevenueUrl,
  revenueCommandScript,
  revenueJournalSchema,
  revenueResultSchema,
  revenueSnapshotSchema,
  validateRevenueValues,
} from '../domain/revenueFeeding';
import PrapatraQueuePanel from '../components/revenue/PrapatraQueuePanel';
import { PropertyReceipt, propertyContext } from '../domain/prapatraQueue';
import {
  DEFAULT_REVENUE_AUTOMATION,
  RevenueAutomation,
  revenueAutomationSchema,
  revenueBatchSchema,
  revenuePreset,
  planRevenueFill,
} from '../domain/revenueAutomation';
import { buildRevenueBridge } from '../utils/revenueFeedingBridge';
import { REVENUE_PORTAL_PRESENTATION } from '../utils/revenuePortalPresentation';

type Props = NativeStackScreenProps<RootStackParamList, 'RevenueFeeding'>;
type Batch = {
  running: boolean;
  mode: 'normal' | 'advanced';
  gata: string;
  done: Set<string>;
  owners: Set<string>;
  context: string;
  selected: string;
  opened: string;
};
const emptyBatch = (): Batch => ({
  running: false,
  mode: 'normal',
  gata: '',
  done: new Set(),
  owners: new Set(),
  context: '',
  selected: '',
  opened: '',
});
export default function RevenueFeedingScreen({ route, navigation }: Props) {
  const module = route.params.module,
    config = REVENUE_MODULES[module];
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const source = useMemo(() => ({ uri: config.url }), [config.url]);
  const bridge = useMemo(
    () => REVENUE_PORTAL_PRESENTATION + buildRevenueBridge(module),
    [module],
  );
  const web = useRef<WebView>(null),
    pageRef = useRef<RevenueSnapshot | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [page, setPage] = useState<RevenueSnapshot | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<RevenueField | null>(null);
  const [expanded, setExpanded] = useState(false),
    [showHistory, setShowHistory] = useState(false);
  const [status, setStatus] = useState(''),
    [ready, setReady] = useState(false),
    [busyId, setBusyId] = useState<string | null>(null);
  const [history, setHistory] = useState<RevenueJournal[]>([]),
    historyRef = useRef<RevenueJournal[]>([]);
  const property = useRef<RevenueJournal['property']>(undefined);
  const [propertyReceipt, setPropertyReceipt] =
    useState<PropertyReceipt | null>(null);
  const [stopToken, setStopToken] = useState(0);
  const [automation, setAutomation] = useState<RevenueAutomation>(
    DEFAULT_REVENUE_AUTOMATION,
  );
  const [autoRunning, setAutoRunning] = useState(false);
  useEffect(() => {
    if (autoRunning) setExpanded(false);
  }, [autoRunning]);
  const autoRef = useRef(false),
    autoAttempts = useRef(new Set<string>()),
    autoCompleted = useRef(new Set<string>());
  const [preparedProperty, setPreparedProperty] = useState('');
  const [hasSavedBatch, setHasSavedBatch] = useState(false);
  const [fraction, setFraction] = useState('1/1');
  const journal = useRef<RevenueJournal | null>(null),
    writes = useRef(Promise.resolve()),
    mounted = useRef(true),
    serial = useRef(0),
    epoch = useRef(0);
  const operation = useRef<string | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selection = useRef({ gata: '', owner: '' }),
    reconciled = useRef('');
  const batch = useRef<Batch>(emptyBatch()),
    [batchTick, setBatchTick] = useState(0);
  const storage = `lekhpal-revenue-${module}`,
    pendingKey = `${storage}-pending`,
    historyKey = `${storage}-history`;
  const enabled = ready && !!page && !page.busy && !page.failed && !busyId;
  const stopBatch = useCallback(() => {
    batch.current.running = false;
    autoRef.current = false;
    if (mounted.current) setAutoRunning(false);
    if (mounted.current) setBatchTick(n => n + 1);
  }, []);
  const persistBatch = useCallback(() => {
    const b = batch.current;
    const saved = {
      mode: b.mode,
      context: b.context,
      gata: b.gata,
      done: [...b.done],
      owners: [...b.owners],
    };
    writes.current = writes.current
      .then(() =>
        AsyncStorage.setItem(`${storage}-batch`, JSON.stringify(saved)),
      )
      .catch(() => {
        epoch.current++;
        stopBatch();
        setStatus('Batch progress could not be saved. Automation stopped.');
      });
    if (mounted.current) setHasSavedBatch(true);
  }, [storage, stopBatch]);
  const finish = useCallback(
    (outcome: RevenueJournal['outcome'], message: string) => {
      const item = journal.current;
      if (timer.current) clearTimeout(timer.current);
      operation.current = null;
      journal.current = null;
      if (mounted.current) {
        setBusyId(null);
        setStatus(message);
      }
      if (item) {
        const row = { ...item, outcome, message };
        if (outcome === 'confirmed')
          autoCompleted.current.add(
            `${
              item.property
                ? JSON.stringify(item.property)
                : item.gata + '|' + item.owner
            }:${item.stage}`,
          );
        if (mounted.current && item.kind === 'final-save' && item.property)
          setPropertyReceipt({
            id: item.id,
            context: item.property,
            number: item.property.number,
            confirmed: outcome === 'confirmed',
          });
        const next = [row, ...historyRef.current].slice(0, 100);
        historyRef.current = next;
        if (mounted.current) setHistory(next);
        if (outcome === 'confirmed' && item.gata && item.owner) {
          batch.current.owners.add(`${item.gata}|${item.owner}`);
          persistBatch();
        }
        writes.current = writes.current
          .then(() => AsyncStorage.setItem(historyKey, JSON.stringify(next)))
          .then(() => AsyncStorage.removeItem(pendingKey))
          .catch(() => {
            stopBatch();
            if (mounted.current)
              setStatus(
                'History could not be saved. Check the official record before continuing.',
              );
          });
      }
      if (outcome !== 'confirmed') stopBatch();
    },
    [historyKey, pendingKey, stopBatch, persistBatch],
  );
  const stop = useCallback(() => {
    epoch.current++;
    if (mounted.current) setStopToken(epoch.current);
    stopBatch();
    if (journal.current)
      finish(
        'uncertain',
        'Stopped. Check the last official record before retrying.',
      );
    else {
      operation.current = null;
      setBusyId(null);
      if (timer.current) clearTimeout(timer.current);
    }
    const current = pageRef.current;
    if (current)
      web.current?.injectJavaScript(
        revenueCommandScript({
          id: `stop-${++serial.current}`,
          type: 'stop',
          documentId: current.documentId,
          revision: current.revision,
          url: current.url,
        }),
      );
  }, [finish, stopBatch]);

  const send = useCallback(
    (
      type: 'fill' | 'action',
      patch?: Record<string, string>,
      action?: RevenueAction,
    ) => {
      const current = pageRef.current;
      if (
        !ready ||
        operation.current ||
        !current ||
        current.busy ||
        current.failed ||
        !web.current
      )
        return;
      if (type === 'fill') {
        const error = validateRevenueValues(current, patch || {});
        if (error) {
          setStatus(error);
          stopBatch();
          return;
        }
      }
      const id = `revenue-${Date.now()}-${++serial.current}`,
        capturedEpoch = epoch.current;
      operation.current = id;
      setBusyId(id);
      const writing = action && action.kind !== 'navigate';
      if (writing)
        journal.current = {
          id,
          module,
          at: new Date().toISOString(),
          documentId: current.documentId,
          url: current.url,
          action: action.label,
          kind: action.kind,
          stage: current.stage,
          gata: selection.current.gata,
          owner: selection.current.owner,
          ownerKey: current.ownerProof?.key,
          baseline: current.ownerProof?.count,
          property: module === 'prapatra5' ? property.current : undefined,
          outcome: 'pending',
          message:
            'Prepared without a confirmed result. Check the official record before retrying.',
        };
      const attempt = journal.current;
      let dispatched = false;
      writes.current = writes.current
        .then(async () => {
          if (writing && attempt)
            await AsyncStorage.setItem(pendingKey, JSON.stringify(attempt));
          const now = pageRef.current;
          if (!mounted.current || operation.current !== id) return;
          if (
            capturedEpoch !== epoch.current ||
            !now ||
            now.documentId !== current.documentId ||
            now.revision !== current.revision ||
            now.url !== current.url
          ) {
            finish('failed', 'Page changed before sending. Review it again.');
            return;
          }
          if (current.stage === 'selection')
            selection.current = { ...current.selection };
          dispatched = true;
          web.current?.injectJavaScript(
            revenueCommandScript({
              id,
              type,
              values: patch,
              actionRef: action?.ref,
              documentId: current.documentId,
              revision: current.revision,
              url: current.url,
            }),
          );
          timer.current = setTimeout(() => {
            if (operation.current === id)
              finish(
                'uncertain',
                'No confirmed result. Check the official record before retrying.',
              );
          }, 30000);
        })
        .catch(() => {
          if (operation.current === id)
            finish(
              dispatched ? 'uncertain' : 'failed',
              dispatched
                ? 'Operation interrupted. Check the official record.'
                : 'Local storage failed. Nothing was sent.',
            );
        });
    },
    [ready, module, pendingKey, finish, stopBatch],
  );

  useEffect(() => {
    let active = true;
    mounted.current = true;
    Promise.all([
      AsyncStorage.getItem(historyKey),
      AsyncStorage.getItem(pendingKey),
      AsyncStorage.getItem(`${storage}-automation`),
      AsyncStorage.getItem(`${storage}-batch`),
    ])
      .then(async ([raw, pending, autoSettings, savedBatch]) => {
        const restoredAutomation = autoSettings
          ? revenueAutomationSchema.parse(JSON.parse(autoSettings))
          : DEFAULT_REVENUE_AUTOMATION;
        const restoredBatch = savedBatch
          ? revenueBatchSchema.parse(JSON.parse(savedBatch))
          : null;
        const rows = revenueJournalSchema
          .array()
          .parse(raw ? JSON.parse(raw) : []);
        if (pending) {
          const prior = revenueJournalSchema.parse(JSON.parse(pending));
          if (!rows.some(row => row.id === prior.id))
            rows.unshift({
              ...prior,
              outcome: 'uncertain',
              message:
                'Interrupted operation. Verify the official record before retrying.',
            });
          await AsyncStorage.setItem(
            historyKey,
            JSON.stringify(rows.slice(0, 100)),
          );
          await AsyncStorage.removeItem(pendingKey);
        }
        if (active) {
          setAutomation(restoredAutomation);
          setFraction(restoredAutomation.fraction);
          if (restoredBatch) {
            batch.current = {
              ...emptyBatch(),
              ...restoredBatch,
              done: new Set(restoredBatch.done),
              owners: new Set(restoredBatch.owners),
            };
            setHasSavedBatch(true);
          }
          historyRef.current = rows.slice(0, 100);
          setHistory(historyRef.current);
          setReady(true);
          if (pending)
            setStatus(
              'An earlier operation is unconfirmed. Open History and check the official record.',
            );
        }
      })
      .catch(() => {
        if (active)
          setStatus('Saved work could not be read. Helpers are paused.');
      });
    return () => {
      active = false;
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (journal.current)
        finish(
          'uncertain',
          'Screen closed before confirmation. Check the official record.',
        );
    };
  }, [historyKey, pendingKey, storage, finish]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') stop();
    });
    return () => listener.remove();
  }, [stop]);

  function onMessage(raw: string, url: string) {
    if (!isRevenueUrl(module, url) || raw.length > 500000) return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const result = revenueResultSchema.safeParse(data);
    if (result.success) {
      if (result.data.id !== operation.current) return;
      if (['filled', 'clicked'].includes(result.data.outcome)) {
        if (timer.current) clearTimeout(timer.current);
        operation.current = null;
        setBusyId(null);
        setStatus(result.data.message);
      } else
        finish(
          result.data.outcome as RevenueJournal['outcome'],
          result.data.message,
        );
      return;
    }
    const parsed = revenueSnapshotSchema.safeParse(data);
    if (
      !parsed.success ||
      parsed.data.module !== module ||
      !isRevenueUrl(module, parsed.data.url)
    )
      return;
    const next = parsed.data,
      previous = pageRef.current;
    pageRef.current = next;
    setPage(next);
    if (module === 'prapatra5' && next.stage === 'property') {
      const context = propertyContext(next),
        number = next.fields.find(f => f.key === 'entrySeqNo')?.value;
      property.current = context && number ? { ...context, number } : undefined;
    }
    setValues(old =>
      Object.fromEntries(
        next.fields
          .filter(f => !f.readOnly)
          .map(f => {
            const prior = previous?.fields.find(p => p.ref === f.ref);
            return [
              f.ref,
              previous?.documentId === next.documentId &&
              prior?.value === f.value
                ? old[f.ref] ?? f.value
                : f.value,
            ];
          }),
      ),
    );
    if (
      next.stage === 'selection' &&
      next.selection.gata &&
      next.selection.owner
    )
      selection.current = { ...next.selection };
    const attempt = journal.current;
    if (!attempt || next.busy) return;
    if (next.failed || next.stage === 'login' || next.result === 'error') {
      finish(
        'uncertain',
        'The session or request was interrupted. Check the record.',
      );
      return;
    }
    if (
      attempt.kind === 'owner-save' &&
      ['owners', 'boundaries'].includes(next.stage) &&
      attempt.ownerKey &&
      (next.ownerCounts[attempt.ownerKey] || 0) > (attempt.baseline || 0)
    ) {
      finish(
        'confirmed',
        'The saved owner appeared in the official owner table.',
      );
      return;
    }
    if (attempt.documentId === next.documentId) return;
    if (next.result === 'saved' && attempt.kind !== 'owner-save') {
      finish('confirmed', 'The official page reports successful completion.');
      return;
    }
    if (
      module !== 'prapatra5' &&
      next.stage === 'selection' &&
      attempt.gata &&
      attempt.owner
    ) {
      const gata = next.fields.find(f => f.key === 'gataNumber'),
        owners = next.fields.find(f => f.key === 'ownerName');
      if (!gata || !owners) return;
      if (
        (!next.ownersReady || next.selection.gata !== attempt.gata) &&
        reconciled.current !== `${attempt.id}:${next.documentId}` &&
        gata.options.some(o => o.value === attempt.gata)
      ) {
        reconciled.current = `${attempt.id}:${next.documentId}`;
        web.current?.injectJavaScript(
          revenueCommandScript({
            id: `${attempt.id}-reconcile-${next.documentId}`,
            type: 'fill',
            documentId: next.documentId,
            revision: next.revision,
            url: next.url,
            values: { [gata.ref]: attempt.gata },
          }),
        );
      } else if (
        next.ownersReady &&
        next.selection.gata === attempt.gata &&
        !owners.options.some(o => o.value === attempt.owner)
      )
        finish(
          'confirmed',
          'The processed owner is no longer in the refreshed pending-owner list.',
        );
    }
  }

  useEffect(() => {
    const b = batch.current;
    if (!b.running || module === 'prapatra5' || !page || !enabled) return;
    if (page.stage === 'login' || page.failed) {
      stopBatch();
      return;
    }
    if (page.stage !== 'selection') return;
    if (b.context && page.context !== b.context) {
      stopBatch();
      setStatus(
        'The official village changed. Start a new batch for this village.',
      );
      return;
    }
    if (!b.context && page.context) b.context = page.context;
    const gataField = page.fields.find(f => f.key === 'gataNumber'),
      ownerField = page.fields.find(f => f.key === 'ownerName');
    if (!gataField || !ownerField) return;
    const options = (field: RevenueField) =>
      field.options.filter(o => !['', '0', '-1'].includes(o.value));
    if (!b.gata)
      b.gata =
        b.mode === 'normal'
          ? page.selection.gata
          : options(gataField).find(o => !b.done.has(o.value))?.value || '';
    if (!b.gata || ['0', '-1'].includes(b.gata)) {
      stopBatch();
      setStatus('Choose a gata, or all available gatas have been reviewed.');
      return;
    }
    const selectKey = `${page.documentId}:${b.gata}`;
    if (page.selection.gata !== b.gata || !page.ownersReady) {
      if (b.selected !== selectKey) {
        b.selected = selectKey;
        persistBatch();
        send('fill', { [gataField.ref]: b.gata });
      }
      return;
    }
    const nextOwner = options(ownerField).find(
      o => !b.owners.has(`${b.gata}|${o.value}`),
    );
    if (!nextOwner) {
      b.done.add(b.gata);
      b.gata = '';
      b.selected = '';
      persistBatch();
      if (b.mode === 'normal') {
        stopBatch();
        setStatus('Current gata finished. Review its official report.');
      } else setBatchTick(n => n + 1);
      return;
    }
    if (page.selection.owner !== nextOwner.value) {
      send('fill', { [ownerField.ref]: nextOwner.value });
      return;
    }
    const openKey = `${page.documentId}:${b.gata}:${nextOwner.value}`,
      action = page.actions.find(a => a.kind === 'navigate');
    if (action && b.opened !== openKey) {
      b.opened = openKey;
      send('action', undefined, action);
    }
  }, [page, enabled, module, batchTick, send, stopBatch, persistBatch]);

  useEffect(() => {
    if (
      !autoRunning ||
      !autoRef.current ||
      !enabled ||
      !page ||
      operation.current
    )
      return;
    if (['login', 'other'].includes(page.stage)) {
      stopBatch();
      setStatus('Open the supported entry form before starting automation.');
      return;
    }
    if (page.stage === 'selection') return;
    const identity =
      module === 'prapatra5'
        ? property.current
          ? JSON.stringify(property.current)
          : ''
        : `${selection.current.gata}|${selection.current.owner}`;
    if (module === 'prapatra5' && page.stage === 'property') {
      if (
        !preparedProperty ||
        page.fields.find(f => f.key === 'entrySeqNo')?.value !==
          preparedProperty
      )
        return;
    }
    if (!identity || identity === '|') {
      stopBatch();
      setStatus('Current property or owner identity is unavailable.');
      return;
    }
    const key = `${identity}:${page.stage}`,
      navKey = `${page.documentId}:${key}:next`;
    const navigate = () => {
      const actions = page.actions.filter(a => a.kind === 'navigate');
      if (actions.length === 1 && !autoAttempts.current.has(navKey)) {
        autoAttempts.current.add(navKey);
        send('action', undefined, actions[0]);
      } else if (
        module !== 'prapatra5' &&
        canGoBack &&
        !autoAttempts.current.has(navKey)
      ) {
        autoAttempts.current.add(navKey);
        web.current?.goBack();
      }
    };
    if (
      autoCompleted.current.has(key) ||
      ['check', 'result'].includes(page.stage)
    ) {
      navigate();
      return;
    }
    if (page.stage === 'property') {
      navigate();
      return;
    }
    if (page.stage !== 'delete') {
      const patch = planRevenueFill(page, automation);
      if (typeof patch === 'string') {
        stopBatch();
        setStatus(patch);
        return;
      }
      if (Object.keys(patch).length) {
        const fillKey = `${page.documentId}:${key}:fill`;
        if (autoAttempts.current.has(fillKey)) return;
        autoAttempts.current.add(fillKey);
        send('fill', patch);
        return;
      }
    }
    const writesAvailable = page.actions.filter(a => a.kind !== 'navigate');
    if (writesAvailable.length === 1 && automation.autoSubmit) {
      const attemptKey = `${key}:write`;
      if (!autoAttempts.current.has(attemptKey)) {
        autoAttempts.current.add(attemptKey);
        send('action', undefined, writesAvailable[0]);
      }
    } else if (!writesAvailable.length) navigate();
  }, [
    autoRunning,
    enabled,
    page,
    automation,
    preparedProperty,
    canGoBack,
    module,
    send,
    stopBatch,
  ]);

  function saveAutomation(next: RevenueAutomation) {
    stopBatch();
    writes.current = writes.current
      .then(() =>
        AsyncStorage.setItem(`${storage}-automation`, JSON.stringify(next)),
      )
      .then(() => {
        if (mounted.current) setAutomation(next);
      })
      .catch(() => setStatus('Automation settings could not be saved.'));
  }
  function startAutomation() {
    const captured = pageRef.current,
      token = epoch.current;
    if (!captured || !enabled) return;
    Alert.alert(
      'Start configured automatic feeding?',
      automation.autoSubmit
        ? 'The saved settings will fill and submit records in this session. In removal mode this deletes the selected share entries. Review the village, gata range and presets first.'
        : 'The saved settings will fill forms and move through sections. Submissions remain manual.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            if (
              token !== epoch.current ||
              pageRef.current?.revision !== captured.revision ||
              pageRef.current?.documentId !== captured.documentId
            ) {
              setStatus('Page changed. Review again.');
              return;
            }
            autoRef.current = true;
            setAutoRunning(true);
            autoAttempts.current.clear();
            autoCompleted.current.clear();
            if (module !== 'prapatra5') {
              batch.current.running = true;
              setBatchTick(n => n + 1);
            }
          },
        },
      ],
    );
  }

  const button = (label: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        { borderColor: colors.primary },
        disabled && styles.disabled,
      ]}
    >
      <Text style={{ color: colors.primary }}>{label}</Text>
    </Pressable>
  );
  const inputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.border },
  ];
  function actionPress(action: RevenueAction) {
    const captured = pageRef.current,
      token = epoch.current;
    if (!captured || !enabled) return;
    if (action.kind === 'navigate') {
      send('action', undefined, action);
      return;
    }
    Alert.alert(
      action.kind === 'delete'
        ? t(
            'Remove this official share entry?',
            'यह आधिकारिक अंश प्रविष्टि हटाएं?',
          )
        : t('Submit this official entry?', 'यह आधिकारिक प्रविष्टि सबमिट करें?'),
      `${action.label}\n\n${t(
        'Review the selected plot, owner and values on the official page. This changes the government record.',
        'आधिकारिक पेज पर गाटा, स्वामी और मान जांचें। इससे सरकारी रिकॉर्ड बदलेगा।',
      )}`,
      [
        { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
        {
          text: t('Continue', 'आगे बढ़ें'),
          style: action.kind === 'delete' ? 'destructive' : 'default',
          onPress: () => {
            const now = pageRef.current;
            if (
              token !== epoch.current ||
              !now ||
              now.documentId !== captured.documentId ||
              now.revision !== captured.revision
            ) {
              setStatus('The page changed. Review it again.');
              return;
            }
            send('action', undefined, action);
          },
        },
      ],
    );
  }
  const hasEdits = page?.fields.some(
    f =>
      !f.readOnly && values[f.ref] !== undefined && values[f.ref] !== f.value,
  );
  return (
    <AppScreen scroll={false}>
      <AppHeader
        title={config[language]}
        leftIconName="arrow-left"
        onLeftPress={() => navigation.goBack()}
        rightIcons={[
          {
            iconName: 'tune-variant',
            accessibilityLabel: t('Work settings', 'कार्य सेटिंग्स'),
            onPress: () => setExpanded(true),
          },
        ]}
      />
      <PortalWorkStatus
        status={status}
        active={autoRunning || batch.current.running || !!busyId}
        onStop={stop}
        onDetails={() => setExpanded(true)}
      />
      <WebView
        ref={web}
        source={source}
        style={styles.web}
        userAgent={FEEDING_USER_AGENT}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        mixedContentMode="never"
        allowFileAccess={false}
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={request =>
          isRevenueUrl(module, request.url)
        }
        injectedJavaScript={bridge}
        injectedJavaScriptBeforeContentLoaded={REVENUE_PORTAL_PRESENTATION}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly
        injectedJavaScriptForMainFrameOnly
        onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
        onLoadStart={() => {
          pageRef.current = null;
          setPage(null);
          setValues({});
        }}
        onLoadEnd={() => web.current?.injectJavaScript(bridge)}
        onMessage={event =>
          onMessage(event.nativeEvent.data, event.nativeEvent.url)
        }
        onError={() => {
          stop();
          setStatus(
            'The official page could not load. Check connectivity and reload.',
          );
        }}
      />
      <PortalWorkPanel
        visible={expanded}
        title={config[language]}
        onClose={() => setExpanded(false)}
        onHistory={() => setShowHistory(true)}
        onStop={stop}
      >
        <ScrollView
          style={styles.helper}
          contentContainerStyle={styles.helperContent}
          keyboardShouldPersistTaps="handled"
        >
          {!!status && (
            <Text accessibilityRole="alert" style={{ color: colors.text }}>
              {status}
            </Text>
          )}
          {!page || ['other', 'login'].includes(page.stage) ? (
            <Text style={{ color: colors.text }}>
              {module === 'prapatra5'
                ? t(
                    'Sign in on SVAMITVA, then open Prapatra-5 property entry. The helper reads its village/year, property, boundary and owner fields.',
                    'SVAMITVA पर लॉगिन करके प्रपत्र-5 भूखण्ड प्रविष्टि खोलें। सहायक में ग्राम/वर्ष, भूखण्ड, चौहद्दी और स्वामी के फील्ड मिलेंगे।',
                  )
                : t(
                    'Sign in to the Tehsil Mutation portal and open Ansh Nirdharan (or removal). Choose a gata to load its owners.',
                    'तहसील म्यूटेशन पोर्टल पर लॉगिन करके अंश निर्धारण (या हटाने का पेज) खोलें। खातेदार लोड करने के लिए गाटा चुनें।',
                  )}
            </Text>
          ) : (
            <Text style={[styles.heading, { color: colors.text }]}>
              {t('Form settings', 'फॉर्म सेटिंग्स')}
            </Text>
          )}
          <View style={styles.box}>
            <Text style={[styles.heading, { color: colors.text }]}>
              {t('Batch automation', 'स्वचालित बैच')}
            </Text>
            {button(
              automation.autoSubmit
                ? t('Automatic submission: ON', 'स्वचालित सबमिशन: चालू')
                : t('Automatic submission: OFF', 'स्वचालित सबमिशन: बंद'),
              () =>
                saveAutomation({
                  ...automation,
                  autoSubmit: !automation.autoSubmit,
                }),
              !enabled || autoRunning,
            )}
            {module === 'ansh' && (
              <>
                <TextInput
                  accessibilityLabel="Batch share fraction"
                  value={fraction}
                  onChangeText={setFraction}
                  editable={!autoRunning}
                  style={inputStyle}
                />
                {button(
                  t('Save batch share rule', 'बैच का अंश नियम सेव करें'),
                  () => {
                    try {
                      anshShare('1', fraction);
                      saveAutomation({
                        ...automation,
                        fraction,
                        remark: page?.fields.find(f => f.key === 'remark')
                          ?.value,
                      });
                    } catch (e) {
                      setStatus((e as Error).message);
                    }
                  },
                  !enabled || autoRunning,
                )}
              </>
            )}
            {module === 'prapatra5' &&
              button(
                t('Save this section preset', 'इस खंड का प्रीसेट सेव करें'),
                () => {
                  if (page)
                    saveAutomation({
                      ...automation,
                      presets: {
                        ...automation.presets,
                        [page.stage]: revenuePreset(page),
                      },
                    });
                },
                !enabled || !page?.fields.length || autoRunning,
              )}
            {button(
              t('Start automatic feeding', 'स्वचालित फीडिंग शुरू करें'),
              startAutomation,
              !enabled ||
                autoRunning ||
                !page ||
                ['login', 'other'].includes(page.stage),
            )}
            {module !== 'prapatra5' &&
              hasSavedBatch &&
              button(
                t('Resume saved owner batch', 'सेव खातेदार बैच जारी करें'),
                () => {
                  const p = pageRef.current;
                  if (
                    !p ||
                    (batch.current.context &&
                      p.context !== batch.current.context)
                  ) {
                    setStatus(
                      'Open the original village before resuming this batch.',
                    );
                    return;
                  }
                  if (
                    historyRef.current.some(
                      h =>
                        h.outcome === 'uncertain' &&
                        h.gata === batch.current.gata &&
                        !batch.current.owners.has(`${h.gata}|${h.owner}`),
                    )
                  ) {
                    setStatus(
                      'Verify the uncertain owner in History before starting a new reviewed batch.',
                    );
                    return;
                  }
                  Alert.alert(
                    'Resume saved owner batch?',
                    'Check the official village and gata. Previously completed owners will be skipped.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Resume',
                        onPress: () => {
                          if (
                            pageRef.current?.documentId !== p.documentId ||
                            pageRef.current?.revision !== p.revision
                          )
                            return;
                          batch.current.running = true;
                          setBatchTick(n => n + 1);
                        },
                      },
                    ],
                  );
                },
                !enabled ||
                  page?.stage !== 'selection' ||
                  batch.current.running,
              )}
          </View>
          {module === 'prapatra5' && (
            <PrapatraQueuePanel
              page={page}
              enabled={enabled}
              receipt={propertyReceipt}
              stopToken={stopToken}
              automatic={autoRunning}
              onPrepared={setPreparedProperty}
              onFill={patch => send('fill', patch)}
            />
          )}
          {module !== 'prapatra5' && (
            <View style={styles.row}>
              {(['normal', 'advanced'] as const).map(mode => (
                <React.Fragment key={mode}>
                  {button(
                    mode === 'normal'
                      ? t('Normal · current gata', 'सामान्य · वर्तमान गाटा')
                      : t('Advanced · next gatas', 'उन्नत · अगले गाटे'),
                    () => {
                      batch.current = { ...emptyBatch(), running: true, mode };
                      setBatchTick(n => n + 1);
                    },
                    !enabled ||
                      page?.stage !== 'selection' ||
                      batch.current.running,
                  )}
                </React.Fragment>
              ))}
              {batch.current.running && (
                <Text style={{ color: colors.text }}>
                  {t(
                    'Processing owners; review every share before submitting.',
                    'खातेदार क्रम में खुलेंगे; सबमिट करने से पहले हर अंश जांचें।',
                  )}
                </Text>
              )}
            </View>
          )}
          {module !== 'prapatra5' &&
            page?.stage === 'selection' &&
            button(
              t('Skip selected owner', 'चुने हुए खातेदार को छोड़ें'),
              () => {
                batch.current.owners.add(
                  `${page.selection.gata}|${page.selection.owner}`,
                );
                batch.current.opened = '';
                persistBatch();
                setBatchTick(n => n + 1);
                setStatus(
                  t(
                    'Owner skipped in this batch; its official record was not changed.',
                    'इस क्रम में खातेदार छोड़ दिया; आधिकारिक रिकॉर्ड नहीं बदला।',
                  ),
                );
              },
              !enabled ||
                !page.ownersReady ||
                !page.selection.owner ||
                ['0', '-1'].includes(page.selection.owner),
            )}
          {module !== 'prapatra5' &&
            page &&
            ['share', 'delete'].includes(page.stage) &&
            button(
              t('Skip this owner', 'यह खातेदार छोड़ें'),
              () => {
                const selected = selection.current;
                batch.current.owners.add(`${selected.gata}|${selected.owner}`);
                batch.current.opened = '';
                persistBatch();
                web.current?.goBack();
              },
              !enabled ||
                !canGoBack ||
                !selection.current.gata ||
                !selection.current.owner,
            )}
          {page?.stage === 'share' && (
            <View style={styles.box}>
              <Text style={{ color: colors.text }}>
                {t('Share fraction (1/n)', 'अंश (1/n)')}
              </Text>
              <TextInput
                accessibilityLabel="Share fraction"
                value={fraction}
                onChangeText={setFraction}
                editable={enabled}
                style={inputStyle}
              />
              {button(
                t('Calculate share area', 'अंश का क्षेत्रफल निकालें'),
                () => {
                  try {
                    const area = page.fields.find(f => f.key === 'area'),
                      share = page.fields.find(f => f.key === 'share'),
                      hissa = page.fields.find(f => f.key === 'hissa');
                    if (!area || !share || !hissa)
                      throw Error('Required share fields are not available.');
                    const calculated = anshShare(area.value, fraction);
                    setValues(old => ({
                      ...old,
                      [share.ref]: calculated.share,
                      [hissa.ref]: calculated.hissa,
                    }));
                    setStatus(
                      t(
                        'Calculated. Fill the official form, review, then save.',
                        'गणना हुई। आधिकारिक फॉर्म भरें, जांचें, फिर सेव करें।',
                      ),
                    );
                  } catch (error) {
                    setStatus((error as Error).message);
                  }
                },
                !enabled,
              )}
            </View>
          )}
          {page?.fields.map(field => (
            <View key={field.ref} style={styles.field}>
              <Text style={{ color: colors.text }}>
                {field.label}
                {field.required ? ' *' : ''}
              </Text>
              {field.readOnly ? (
                <Text selectable style={{ color: colors.textMuted }}>
                  {field.kind === 'select'
                    ? field.options.find(o => o.value === field.value)?.label ||
                      field.value
                    : field.value}
                </Text>
              ) : field.kind === 'select' ? (
                button(
                  field.options.find(
                    o => o.value === (values[field.ref] ?? field.value),
                  )?.label || t('Choose', 'चुनें'),
                  () => setPicker(field),
                  !enabled || (field.key === 'ownerName' && !page.ownersReady),
                )
              ) : (
                <TextInput
                  accessibilityLabel={field.label}
                  value={values[field.ref] ?? field.value}
                  onChangeText={value =>
                    setValues(old => ({ ...old, [field.ref]: value }))
                  }
                  editable={enabled}
                  multiline={field.kind === 'textarea'}
                  keyboardType={
                    field.kind === 'number' ? 'decimal-pad' : 'default'
                  }
                  style={inputStyle}
                />
              )}
            </View>
          ))}
          {!!page?.fields.some(f => !f.readOnly) &&
            button(
              t('Fill official form', 'आधिकारिक फॉर्म भरें'),
              () =>
                send(
                  'fill',
                  Object.fromEntries(
                    (page?.fields || [])
                      .filter(
                        f =>
                          !f.readOnly &&
                          values[f.ref] !== undefined &&
                          values[f.ref] !== f.value,
                      )
                      .map(f => [f.ref, values[f.ref]]),
                  ),
                ),
              !enabled || !hasEdits,
            )}
          {hasEdits && (
            <Text style={{ color: colors.textMuted }}>
              {t(
                'Fill the official form before using its actions.',
                'कार्रवाई से पहले आधिकारिक फॉर्म में मान भरें।',
              )}
            </Text>
          )}
          {page?.actions.map(action => (
            <React.Fragment key={action.ref}>
              {button(
                action.label,
                () => actionPress(action),
                !enabled || !!hasEdits,
              )}
            </React.Fragment>
          ))}
        </ScrollView>
      </PortalWorkPanel>
      <Modal
        visible={!!picker}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.modal}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.heading, { color: colors.text }]}>
              {picker?.label}
            </Text>
            <ScrollView>
              {picker?.options.map(option => (
                <React.Fragment key={option.value}>
                  {button(
                    option.label || '—',
                    () => {
                      if (picker) send('fill', { [picker.ref]: option.value });
                      setPicker(null);
                    },
                    !enabled,
                  )}
                </React.Fragment>
              ))}
            </ScrollView>
            {button(t('Close', 'बंद करें'), () => setPicker(null))}
          </View>
        </View>
      </Modal>
      <Modal visible={showHistory} onRequestClose={() => setShowHistory(false)}>
        <AppScreen scroll={false}>
          <AppHeader
            title={t('Work history', 'कार्य इतिहास')}
            leftIconName="arrow-left"
            onLeftPress={() => setShowHistory(false)}
          />
          <ScrollView contentContainerStyle={styles.helperContent}>
            {!history.length && (
              <Text style={{ color: colors.textMuted }}>
                {t('No saved work yet.', 'अभी कोई कार्य सेव नहीं हुआ।')}
              </Text>
            )}
            {history.map(row => (
              <View key={row.id} style={styles.field}>
                <Text style={{ color: colors.text }}>
                  {row.action} · {row.outcome}
                </Text>
                <Text style={{ color: colors.textMuted }}>
                  {row.at}\n{row.message}
                </Text>
              </View>
            ))}
          </ScrollView>
        </AppScreen>
      </Modal>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  web: { flex: 1 },
  helper: { flex: 1 },
  helperContent: { padding: 16, gap: 14 },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 11,
    minHeight: 44,
    justifyContent: 'center',
    marginVertical: 3,
  },
  disabled: { opacity: 0.4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 44 },
  field: { gap: 7, paddingVertical: 6 },
  box: { gap: 8 },
  heading: { fontSize: 18, fontWeight: '700' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  sheet: { maxHeight: '75%', padding: 20, gap: 10 },
});
