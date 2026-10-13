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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';
import AppScreen from '../components/AppScreen';
import {
  PortalWorkPanel,
  PortalWorkStatus,
} from '../components/revenue/PortalWorkControls';
import FeedingQueuePanel, {
  QueueCommand,
} from '../components/khasra/FeedingQueuePanel';
import { resolveImportedCrops } from '../domain/khasraBulk';
import { applyCropPlan, reconcileCropPlan } from '../domain/cropPlan';
import { QueueItem, gataKey } from '../domain/khasraQueue';
import {
  planSubsection,
  recoverTreeEntries,
  sectionIsTerminal,
} from '../domain/khasraSections';
import AdvancedFeedingSettings from '../components/khasra/AdvancedFeedingSettings';
import {
  AdvancedRules,
  DEFAULT_ADVANCED_RULES,
  advancedRulesSchema,
  validateAdvancedRules,
  planAdvancedFill,
  nextSectionAction,
  filledValuesStillMatch,
  officialContextError,
} from '../domain/khasraAdvanced';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { openPortalBrowser } from '../native/portalBrowser';
import { KHASRA_FEEDING_BRIDGE } from '../utils/khasraFeedingBridge';
import {
  FEEDING_URL,
  FEEDING_USER_AGENT,
  FeedingAction,
  FeedingContext,
  FeedingCommand,
  FeedingField,
  FeedingMode,
  FeedingPreset,
  FeedingReceipt,
  FeedingSnapshot,
  FeedingValues,
  buildFeedingCommand,
  createFeedingPreset,
  feedingResultSchema,
  feedingPresetsSchema,
  feedingReceiptSchema,
  feedingScopeKey,
  feedingSnapshotSchema,
  isFeedingUrl,
  isFeedingNavigationUrl,
  validateFeedingContext,
  validateFeedingValues,
} from '../domain/khasraFeeding';

type Props = NativeStackScreenProps<RootStackParamList, 'KhasraFeeding'>;
const SOURCE = { uri: FEEDING_URL };
const EMPTY_CONTEXT: FeedingContext = {
  year: '',
  season: 'kharif',
  village: '',
  villageCode: '',
};
const stageNames: Record<string, [string, string]> = {
  login: ['Government login', 'सरकारी लॉगिन'],
  other: ['Open the survey entry', 'सर्वेक्षण प्रविष्टि खोलें'],
  list: ['Gata list', 'गाटा सूची'],
  owner: ['Plot details', 'गाटा विवरण'],
  land: ['Land type', 'भूमि का प्रकार'],
  fallow: ['Fallow land', 'परती भूमि'],
  trees: ['Trees', 'पेड़'],
  crop: ['Crop and irrigation', 'फसल और सिंचाई'],
  remarks: ['Remarks', 'टिप्पणी'],
};

export default function KhasraFeedingScreen({ navigation }: Props) {
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const languageRef = useRef(language);
  languageRef.current = language;
  const t = useCallback(
    (en: string, hi: string) => (languageRef.current === 'hi' ? hi : en),
    [],
  );
  const web = useRef<WebView>(null);
  const [context, setContext] = useState<FeedingContext>(EMPTY_CONTEXT);
  const [opened, setOpened] = useState(false);
  const [externalLogin, setExternalLogin] = useState(false);
  const [mode, setMode] = useState<FeedingMode>('normal');
  const [expanded, setExpanded] = useState(false);
  const [snapshot, setSnapshot] = useState<FeedingSnapshot | null>(null);
  const snapshotRef = useRef<FeedingSnapshot | null>(null);
  const [values, setValues] = useState<FeedingValues>({});
  const [picker, setPicker] = useState<FeedingField | null>(null);
  const [presets, setPresets] = useState<Record<string, FeedingPreset>>({});
  const [baseRules, setRules] = useState<AdvancedRules>(DEFAULT_ADVANCED_RULES);
  const rulesWrites = useRef(Promise.resolve());
  const [rulesSaving, setRulesSaving] = useState(false);
  const facts = useRef<{
    gata: string;
    area?: string;
    government?: boolean;
  } | null>(null);
  const workflow = useRef<{
    key: string;
    fillId?: string;
    saveId?: string;
    moved?: boolean;
    values?: FeedingValues;
    prepareId?: string;
    preparations?: Set<string>;
    formRef?: string;
  }>({ key: '' });
  const nextReceipt = useRef('');
  const lockReceipt = useRef('');
  const cropProgress = useRef({ gata: '', index: 0, receipt: '' });
  const treeProgress = useRef({
    gata: '',
    documentId: '',
    index: 0,
    receipt: '',
    submittedIndex: -1,
  });
  const [cropTick, setCropTick] = useState(0);
  const portalContext = useRef<{
    documentId: string;
    value: FeedingSnapshot['officialContext'];
  }>({ documentId: '', value: {} });
  const submittedStages = useRef(new Set<string>());
  const [skipRequest, setSkipRequest] = useState<{
    id: number;
    gata: string;
  } | null>(null);
  const [receipts, setReceipts] = useState<FeedingReceipt[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [queueRunning, setQueueRunning] = useState(false);
  const runningRef = useRef(false);
  useEffect(() => {
    if (running || queueRunning) setExpanded(false);
  }, [running, queueRunning]);
  const [status, setStatus] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [activeGata, setActiveGata] = useState<string | undefined>();
  const [activeItem, setActiveItem] = useState<QueueItem | undefined>();
  const [bulkRun, setBulkRun] = useState(false);
  const importVerified = useRef('');
  const imported = useMemo(() => {
    if (!activeItem?.plan) return null;
    try {
      const crops =
        snapshot?.stage === 'crop'
          ? resolveImportedCrops(activeItem.plan, snapshot)
          : activeItem.plan.map(p => ({ ...p, percent: '' }));
      return { crops, error: '' };
    } catch (e) {
      return {
        crops: activeItem.plan.map(p => ({ ...p, percent: '' })),
        error: (e as Error).message,
      };
    }
  }, [activeItem?.plan, snapshot]);
  const rules = useMemo(
    () => ({
      ...baseRules,
      ...(bulkRun ? { autoSubmit: true, autoNext: true } : {}),
      ...(imported
        ? { cropPlan: imported.crops, smallAreaEnabled: false }
        : {}),
    }),
    [baseRules, bulkRun, imported],
  );
  const bulkStartError =
    baseRules.sections.enabled && baseRules.sections.land !== 'cultivated'
      ? 'Imported crop plans require cultivated-land rules. Review the other subsection settings before starting.'
      : validateAdvancedRules({
          ...baseRules,
          cropPlan: [],
          smallAreaEnabled: false,
        });
  const startBulk = useCallback(() => {
    workflow.current = { key: '' };
    submittedStages.current.clear();
    importVerified.current = '';
    setBulkRun(true);
    setMode('advanced');
    runningRef.current = true;
    setRunning(true);
  }, []);
  const [lastReceipt, setLastReceipt] = useState<FeedingReceipt | null>(null);
  const [stopEpoch, setStopEpoch] = useState(0);
  const pending = useRef<{
    id: string;
    action: string;
    stage: FeedingSnapshot['stage'];
    context: FeedingContext;
    gata?: string;
    actionKind?: FeedingAction['kind'];
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(0);
  const stopSequence = useRef(0);
  const appliedPage = useRef('');
  const saveQueue = useRef(Promise.resolve());
  const receiptsRef = useRef<FeedingReceipt[]>([]);
  const mounted = useRef(true);
  const recording = useRef(false);
  const scope = feedingScopeKey(context);
  const enabled =
    ready &&
    !!snapshot &&
    !snapshot.busy &&
    !snapshot.unsupported &&
    !pendingId;

  const stop = useCallback((message = '') => {
    stopSequence.current++;
    setStopEpoch(stopSequence.current);
    runningRef.current = false;
    setRunning(false);
    appliedPage.current = '';
    workflow.current = { key: '' };
    nextReceipt.current =
      pending.current?.id || receiptsRef.current[0]?.id || '';
    if (snapshotRef.current)
      web.current?.injectJavaScript(
        buildFeedingCommand({
          id: `stop-${Date.now()}-${++sequence.current}`,
          type: 'stop',
          documentId: snapshotRef.current.documentId,
          revision: snapshotRef.current.revision,
          url: snapshotRef.current.url,
        }),
      );
    if (message) setStatus(message);
  }, []);
  const record = useCallback(
    (outcome: FeedingReceipt['outcome'], message: string) => {
      const item = pending.current;
      if (!item) return;
      if (timer.current) clearTimeout(timer.current);
      pending.current = null;
      recording.current = true;
      const receipt: FeedingReceipt = {
        ...item,
        outcome,
        message,
        at: new Date().toISOString(),
      };
      const next = [receipt, ...receiptsRef.current].slice(0, 100);
      receiptsRef.current = next;
      setReceipts(next);
      const key = `${feedingScopeKey(item.context)}-history`;
      saveQueue.current = saveQueue.current
        .then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
        .then(() =>
          AsyncStorage.removeItem(`${feedingScopeKey(item.context)}-pending`),
        )
        .then(() => {
          recording.current = false;
          if (mounted.current) {
            setLastReceipt(receipt);
            setPendingId(null);
          }
        })
        .catch(() => {
          recording.current = false;
          if (mounted.current) {
            setPendingId(null);
            setLastReceipt({
              ...receipt,
              outcome: 'uncertain',
              message:
                'The result could not be saved on this device. Review the official record.',
            });
            stop(
              'History could not be saved on this device. Feeding stopped; review the official record before resuming.',
            );
          }
        });
      if (outcome === 'failed' || outcome === 'uncertain') stop(message);
      else setStatus(message);
    },
    [stop],
  );
  const send = useCallback(
    (
      type: Exclude<FeedingCommand['type'], 'stop'>,
      patch?: FeedingValues,
      action?: FeedingAction,
      extra?: Pick<FeedingCommand, 'plotRef' | 'gata' | 'query' | 'actionRef'>,
    ) => {
      const page = snapshotRef.current;
      if (
        !page ||
        !ready ||
        pending.current ||
        recording.current ||
        !web.current ||
        page.busy ||
        page.unsupported
      )
        return;
      const id = `${Date.now()}-${++sequence.current}`;
      pending.current = {
        id,
        context: { ...context },
        stage: page.stage,
        action: action?.label || t('Fill fields', 'फील्ड भरें'),
        gata: extra?.gata || page.plotIdentity || activeGata,
        actionKind: action?.kind,
      };
      setPendingId(id);
      const attempt: FeedingReceipt = {
        ...pending.current,
        at: new Date().toISOString(),
        outcome: 'uncertain',
        message:
          'An operation was prepared without a confirmed result. Check the official record before retrying.',
      };
      const stoppedAt = stopSequence.current;
      let dispatched = false;
      // Persist before touching the portal. A process crash must not make an
      // unconfirmed write look like a fresh operation on the next launch.
      saveQueue.current = saveQueue.current
        .then(() =>
          AsyncStorage.setItem(
            `${feedingScopeKey(context)}-pending`,
            JSON.stringify(attempt),
          ),
        )
        .then(() => {
          if (!mounted.current || pending.current?.id !== id) return;
          const current = snapshotRef.current;
          if (
            stoppedAt !== stopSequence.current ||
            !current ||
            current.documentId !== page.documentId ||
            current.revision !== page.revision ||
            current.url !== page.url ||
            !web.current
          ) {
            record(
              'failed',
              t(
                'Stopped or page changed before sending. Review the form again.',
                'भेजने से पहले रुक गया या पेज बदल गया। फॉर्म दोबारा जांचें।',
              ),
            );
            return;
          }
          dispatched = true;
          web.current.injectJavaScript(
            buildFeedingCommand({
              id,
              type,
              documentId: page.documentId,
              revision: page.revision,
              url: page.url,
              values: patch,
              actionRef: extra?.actionRef || action?.ref,
              plotRef: extra?.plotRef,
              gata: extra?.gata,
              query: extra?.query,
            }),
          );
          timer.current = setTimeout(() => {
            if (pending.current?.id === id)
              record(
                'uncertain',
                t(
                  'No confirmation received. Check the portal before retrying.',
                  'पुष्टि नहीं मिली। दोबारा प्रयास से पहले पोर्टल पर जांचें।',
                ),
              );
          }, 25000);
        })
        .catch(() => {
          if (mounted.current && pending.current?.id === id)
            record(
              dispatched ? 'uncertain' : 'failed',
              dispatched
                ? t(
                    'Action interrupted. Check the official record.',
                    'कार्रवाई रुक गई। आधिकारिक रिकॉर्ड जांचें।',
                  )
                : t(
                    'Could not save the operation on this device. Nothing was sent.',
                    'इस फोन पर कार्रवाई सेव नहीं हुई। कुछ भेजा नहीं गया।',
                  ),
            );
        });
      return id;
    },
    [context, ready, record, t, activeGata],
  );
  const sendQueueCommand = useCallback(
    (command: QueueCommand, label: string) =>
      send(
        command.type,
        undefined,
        {
          ref: command.actionRef || command.plotRef || '',
          label,
          kind: 'navigate',
        },
        command,
      ),
    [send],
  );
  const pauseQueue = useCallback(
    () =>
      stop(
        t(
          'Gata queue paused. Check the current official record before continuing.',
          'गाटा कार्य सूची रुकी। जारी रखने से पहले वर्तमान आधिकारिक रिकॉर्ड जांचें।',
        ),
      ),
    [stop, t],
  );
  function fill(patch = values) {
    if (!snapshot) return;
    const error = validateFeedingValues(snapshot, patch);
    if (error) {
      setStatus(error);
      return;
    }
    send('fill', patch);
  }
  function actionPress(action: FeedingAction) {
    const page = snapshotRef.current;
    if (!page || !enabled) return;
    if (action.kind === 'navigate') {
      send('action', undefined, action);
      return;
    }
    const captured = `${page.documentId}:${page.revision}`;
    Alert.alert(
      action.kind === 'lock'
        ? t('Lock this gata?', 'यह गाटा लॉक करें?')
        : t('Submit on the government portal?', 'सरकारी पोर्टल पर सबमिट करें?'),
      `${context.year} · ${context.season} · ${context.village}\n\n${t(
        'Review the plot and all values on the official page before continuing.',
        'आगे बढ़ने से पहले आधिकारिक पेज पर गाटा और सभी मान जांचें।',
      )}\n\n${action.label}`,
      [
        { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
        {
          text: t('Continue', 'आगे बढ़ें'),
          onPress: () => {
            const current = snapshotRef.current;
            if (
              !current ||
              `${current.documentId}:${current.revision}` !== captured
            ) {
              setStatus(
                t(
                  'The page changed. Review it again.',
                  'पेज बदल गया। दोबारा जांचें।',
                ),
              );
              return;
            }
            send('action', undefined, action);
          },
        },
      ],
    );
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      runningRef.current = false;
      if (timer.current) clearTimeout(timer.current);
      const item = pending.current;
      if (item) {
        pending.current = null;
        const receipt: FeedingReceipt = {
          ...item,
          at: new Date().toISOString(),
          outcome: 'uncertain',
          message:
            'Screen closed before confirmation. Check the official record before retrying.',
        };
        const next = [receipt, ...receiptsRef.current].slice(0, 100);
        saveQueue.current = saveQueue.current
          .then(() =>
            AsyncStorage.setItem(
              `${feedingScopeKey(item.context)}-history`,
              JSON.stringify(next),
            ),
          )
          .then(() =>
            AsyncStorage.removeItem(`${feedingScopeKey(item.context)}-pending`),
          )
          .catch(() => {});
      }
    };
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active')
        stop(
          t(
            'Paused while the app is in the background.',
            'ऐप बैकग्राउंड में होने पर रोक दिया गया।',
          ),
        );
    });
    return () => sub.remove();
  });
  useEffect(() => {
    if (!opened) return;
    let active = true;
    setReady(false);
    Promise.all([
      AsyncStorage.getItem(`${scope}-presets`),
      AsyncStorage.getItem(`${scope}-history`),
      AsyncStorage.getItem(`${scope}-pending`),
      AsyncStorage.getItem(`${scope}-rules`),
    ])
      .then(async ([a, b, p, r]) => {
        if (!active) return;
        try {
          const saved = feedingPresetsSchema.parse(a ? JSON.parse(a) : {});
          let history = feedingReceiptSchema
            .array()
            .parse(b ? JSON.parse(b) : []);
          if (p) {
            const interrupted = feedingReceiptSchema.parse(JSON.parse(p));
            if (!history.some(item => item.id === interrupted.id))
              history = [interrupted, ...history].slice(0, 100);
            await AsyncStorage.setItem(
              `${scope}-history`,
              JSON.stringify(history),
            );
            await AsyncStorage.removeItem(`${scope}-pending`);
            if (!active) return;
            setStatus(
              t(
                'An earlier operation has no confirmed result. Check History and the official record before continuing.',
                'पिछली कार्रवाई का परिणाम पुष्ट नहीं है। जारी रखने से पहले इतिहास और आधिकारिक रिकॉर्ड जांचें।',
              ),
            );
          }
          setPresets(saved);
          setRules(
            r
              ? advancedRulesSchema.parse(JSON.parse(r))
              : DEFAULT_ADVANCED_RULES,
          );
          receiptsRef.current = history.slice(0, 100);
          setReceipts(receiptsRef.current);
          setReady(true);
        } catch {
          setStatus(
            t(
              'Saved feeding data could not be read.',
              'सेव किया हुआ फीडिंग डेटा नहीं पढ़ा जा सका।',
            ),
          );
        }
      })
      .catch(() => {
        if (active)
          setStatus(
            t(
              'Local storage is unavailable.',
              'स्थानीय स्टोरेज उपलब्ध नहीं है।',
            ),
          );
      });
    return () => {
      active = false;
    };
  }, [opened, scope, t]);

  // One operation per form phase. Every write still uses the durable command
  // journal; only explicitly enabled auto-submit bypasses per-entry prompts.
  useEffect(() => {
    if (
      !runningRef.current ||
      mode !== 'advanced' ||
      !snapshot ||
      snapshot.busy ||
      pending.current ||
      recording.current ||
      !ready ||
      rulesSaving
    )
      return;
    if (['login', 'other'].includes(snapshot.stage)) {
      stop(
        t(
          'Sign in and open the survey form to continue.',
          'जारी रखने के लिए लॉगिन कर सर्वेक्षण फॉर्म खोलें।',
        ),
      );
      return;
    }
    const mismatch = officialContextError(snapshot, context, !!imported);
    if (mismatch) {
      stop(mismatch);
      return;
    }
    const gata = snapshot.plotIdentity || activeGata;
    if (snapshot.stage === 'list') return;
    if (bulkRun && !activeItem?.plan) return;
    if (imported) {
      if (
        !snapshot.plotIdentity ||
        gataKey(snapshot.plotIdentity) !== gataKey(activeItem!.gata)
      ) {
        stop(
          'The official Gata does not match the imported plan. Review the current plot.',
        );
        return;
      }
      if (activeItem?.status === 'uncertain') {
        stop('Review this interrupted plot before resuming.');
        return;
      }
      if (imported.error) {
        stop(imported.error);
        return;
      }
      if (
        baseRules.sections.enabled &&
        baseRules.sections.land !== 'cultivated'
      ) {
        stop(
          'Imported crops cannot run with fallow or non-agricultural land rules.',
        );
        return;
      }
    }
    if (gata && cropProgress.current.gata !== gataKey(gata))
      cropProgress.current = { gata: gataKey(gata), index: 0, receipt: '' };
    if (
      gata &&
      (treeProgress.current.gata !== gataKey(gata) ||
        treeProgress.current.documentId !== snapshot.documentId)
    )
      treeProgress.current = {
        gata: gataKey(gata),
        documentId: snapshot.documentId,
        index: 0,
        receipt: '',
        submittedIndex: -1,
      };
    if (rules.sections.enabled && snapshot.stage === 'trees') {
      const recovered = recoverTreeEntries(snapshot, rules.sections);
      if (typeof recovered === 'string') {
        stop(recovered);
        return;
      }
      if (typeof recovered === 'number') {
        if (recovered < treeProgress.current.index) return;
        treeProgress.current.index = recovered;
      }
    }
    if (snapshot.stage === 'crop' && rules.cropPlan.length) {
      const area =
        snapshot.plotArea ??
        (gata && facts.current && gataKey(facts.current.gata) === gataKey(gata)
          ? facts.current.area
          : undefined);
      const recovered = reconcileCropPlan(snapshot, rules.cropPlan, area);
      if (typeof recovered === 'string') {
        stop(recovered);
        return;
      }
      if (typeof recovered === 'number') {
        // A success notice can arrive before the table refresh. Never rewind.
        if (recovered < cropProgress.current.index) return;
        cropProgress.current.index = recovered;
        if (imported && recovered === rules.cropPlan.length && gata)
          importVerified.current = gataKey(gata);
        if (
          recovered === rules.cropPlan.length &&
          !cropProgress.current.receipt &&
          !(
            lastReceipt?.stage === 'crop' &&
            lastReceipt.outcome === 'portal-success' &&
            lastReceipt.gata &&
            gata &&
            gataKey(lastReceipt.gata) === gataKey(gata) &&
            feedingScopeKey(lastReceipt.context) === scope
          )
        ) {
          stop(
            'All crops in this plan are already present on the official page. Review them and continue to the next section.',
          );
          return;
        }
      }
    }
    if (
      snapshot.stage === 'crop' &&
      rules.cropPlan.length &&
      cropProgress.current.index >= rules.cropPlan.length
    )
      return;
    const pageKey = `${snapshot.documentId}:${snapshot.url}:${
      snapshot.stage === 'crop'
        ? cropProgress.current.index
        : snapshot.stage === 'trees'
        ? treeProgress.current.index
        : ''
    }:${gata || ''}:${snapshot.fields.map(f => f.ref).join(',')}`;
    if (workflow.current.key !== pageKey) workflow.current = { key: pageKey };
    const step = workflow.current;
    const plot =
      gata && facts.current && gataKey(facts.current.gata) === gataKey(gata)
        ? facts.current
        : null;
    if (snapshot.stage === 'land' && snapshot.governmentLandSignal) {
      if (
        rules.sections.enabled &&
        rules.governmentLand === 'include' &&
        rules.sections.land !== 'nonAgricultural'
      ) {
        stop(
          'Choose the verified non-agricultural land type before including this government-land plot.',
        );
        return;
      }
      if (rules.governmentLand === 'review') {
        stop(
          t(
            'Government-land option pattern detected. Verify the plot and choose its rule.',
            'सरकारी भूमि के विकल्प मिले। गाटा जांचकर नियम चुनें।',
          ),
        );
        return;
      }
      if (rules.governmentLand === 'skip') {
        const back = snapshot.actions.filter(
          a =>
            a.kind === 'navigate' && /गाटा\s*सूची|gata\s*list/i.test(a.label),
        );
        if (
          !gata ||
          !activeGata ||
          gataKey(gata) !== gataKey(activeGata) ||
          back.length !== 1
        ) {
          stop(
            t(
              'Skip this government-land plot from the queue and return to the gata list.',
              'कार्य सूची से यह सरकारी गाटा छोड़कर गाटा सूची पर लौटें।',
            ),
          );
          return;
        }
        if (!step.moved) {
          step.moved = true;
          setSkipRequest({ id: ++sequence.current, gata });
          send('action', undefined, back[0]);
        }
        return;
      }
    }
    if (snapshot.stage === 'owner' && rules.autoNext && gata) {
      const next = nextSectionAction(snapshot);
      if (next && !step.moved) {
        step.moved = true;
        send('action', undefined, next);
      }
      return;
    }
    if (!snapshot.fields.length) return;
    if (step.prepareId) {
      if (
        lastReceipt?.id !== step.prepareId ||
        lastReceipt.outcome !== 'filled'
      )
        return;
      step.prepareId = undefined;
    }
    if (!step.fillId) {
      const presetKey =
        snapshot.stage === 'land' &&
        snapshot.governmentLandSignal &&
        rules.governmentLand === 'include'
          ? 'government:land'
          : snapshot.stage;
      let sectionRules = rules.sections;
      if (sectionRules.enabled && snapshot.stage === 'crop') {
        const row = rules.cropPlan[cropProgress.current.index];
        if (row)
          sectionRules = {
            ...sectionRules,
            crop: row.crop,
            irrigated: row.irrigated,
          };
        if (rules.smallAreaEnabled) {
          const area = snapshot.plotArea ?? plot?.area;
          if (area === undefined || !/^\d+(?:\.\d+)?$/.test(area)) {
            stop('The official plot area is required for the small-area rule.');
            return;
          }
          if (Number(area) <= Number(rules.smallAreaThreshold)) {
            const blanks = snapshot.fields
              .filter(
                f =>
                  f.kind === 'select' &&
                  /crop|fasal|फसल/i.test(f.key + ' ' + f.label),
              )
              .flatMap(f =>
                f.options.filter(o =>
                  /^रिक्त(?:\s*\([^)]*\))?$/.test(o.label.trim()),
                ),
              );
            if (blanks.length !== 1) {
              stop(
                'A unique रिक्त crop option is unavailable for this season.',
              );
              return;
            }
            sectionRules = {
              ...sectionRules,
              crop: blanks[0].value,
              irrigated: false,
            };
          }
        }
      }
      const plan = sectionRules.enabled
        ? planSubsection(
            snapshot,
            sectionRules,
            plot?.area,
            treeProgress.current.index,
            rules.cropPlan.length > 0,
          )
        : imported && snapshot.stage === 'crop'
        ? {
            values: Object.fromEntries(
              snapshot.fields.map(f => [f.ref, f.value]),
            ),
            note: '',
          }
        : planAdvancedFill(snapshot, presets[presetKey], rules, plot?.area);
      if ('error' in plan) {
        stop(plan.error);
        return;
      }
      if ('kind' in plan && plan.kind === 'complete') {
        const next = nextSectionAction(snapshot);
        if (
          !sectionIsTerminal(snapshot.stage, sectionRules) &&
          rules.autoNext &&
          next &&
          !step.moved
        ) {
          step.moved = true;
          send('action', undefined, next);
        } else if (
          sectionIsTerminal(snapshot.stage, sectionRules) &&
          lastReceipt?.outcome !== 'portal-success'
        ) {
          stop(
            'The official section is already complete. Review it before locking this gata.',
          );
        }
        return;
      }
      if ('kind' in plan && plan.kind === 'prepare') {
        const signature = JSON.stringify(plan.values);
        step.preparations ??= new Set();
        if (step.preparations.has(signature)) {
          stop(
            'The official control did not accept the selected option. Review this section.',
          );
          return;
        }
        step.preparations.add(signature);
        step.prepareId = send('fill', plan.values);
        return;
      }
      // FastWork deletes old rows here. Preserve them and require a labelled
      // table for recovery instead of automatically overwriting existing work.
      if (
        sectionRules.enabled &&
        ['land', 'fallow', 'trees'].includes(snapshot.stage) &&
        nextSectionAction(snapshot) &&
        !treeProgress.current.receipt &&
        (snapshot.stage === 'trees'
          ? snapshot.treeRows === undefined
          : snapshot.landRows === undefined) &&
        !(
          lastReceipt?.stage === snapshot.stage &&
          lastReceipt.gata === gata &&
          lastReceipt.outcome === 'portal-success'
        )
      ) {
        stop(
          'This section may already contain entries. Review its official rows before continuing.',
        );
        return;
      }
      if (snapshot.stage === 'crop' && rules.cropPlan.length) {
        const cropped = applyCropPlan(
          snapshot,
          plan.values,
          rules.cropPlan,
          cropProgress.current.index,
          snapshot.plotArea ?? plot?.area,
        );
        if (typeof cropped === 'string') {
          stop(cropped);
          return;
        }
        const invalid = validateFeedingValues(snapshot, cropped);
        if (invalid) {
          stop(invalid);
          return;
        }
        plan.values = cropped;
      }
      step.values = plan.values;
      if (snapshot.stage === 'trees')
        treeProgress.current.submittedIndex = treeProgress.current.index;
      step.formRef = 'formRef' in plan ? plan.formRef : undefined;
      setValues(plan.values);
      step.fillId = send('fill', plan.values);
      if (plan.note) setStatus(plan.note);
      return;
    }
    if (
      rules.autoSubmit &&
      !step.saveId &&
      lastReceipt?.id === step.fillId &&
      lastReceipt.outcome === 'filled'
    ) {
      if (
        !gata ||
        !step.values ||
        !filledValuesStillMatch(snapshot, step.values)
      ) {
        stop(
          t(
            'Review the current gata and changed form values before submitting.',
            'सबमिट से पहले वर्तमान गाटा और बदले हुए मान जांचें।',
          ),
        );
        return;
      }
      const saves = snapshot.actions.filter(
        a => a.kind === 'save' && (!step.formRef || a.formRef === step.formRef),
      );
      if (saves.length !== 1) {
        stop(
          t(
            'Select the correct save action on the official form.',
            'आधिकारिक फॉर्म पर सही सेव कार्रवाई चुनें।',
          ),
        );
        return;
      }
      if (
        snapshot.stage === 'land' &&
        snapshot.governmentLandSignal === undefined
      ) {
        stop(
          t(
            'Land options are not recognized. Review and save this section manually.',
            'भूमि के विकल्प पहचाने नहीं गए। यह खंड जांचकर मैनुअल सेव करें।',
          ),
        );
        return;
      }
      const sectionKey = `${snapshot.documentId}:${gataKey(gata)}:${
        snapshot.stage
      }:${
        snapshot.stage === 'crop'
          ? cropProgress.current.index
          : snapshot.stage === 'trees'
          ? treeProgress.current.index
          : ''
      }`;
      if (submittedStages.current.has(sectionKey)) return;
      submittedStages.current.add(sectionKey);
      if (snapshot.stage === 'trees')
        treeProgress.current.submittedIndex = treeProgress.current.index;
      step.saveId = send('action', undefined, saves[0]);
      if (!step.saveId) submittedStages.current.delete(sectionKey);
    }
  }, [
    snapshot,
    context,
    cropTick,
    imported,
    activeItem,
    bulkRun,
    baseRules,
    mode,
    running,
    ready,
    rulesSaving,
    scope,
    rules,
    presets,
    pendingId,
    activeGata,
    lastReceipt,
    send,
    stop,
    t,
  ]);

  useEffect(() => {
    if (
      !running ||
      !rules.sections.enabled ||
      !lastReceipt ||
      lastReceipt.stage !== 'trees' ||
      lastReceipt.actionKind !== 'save' ||
      lastReceipt.outcome !== 'portal-success' ||
      treeProgress.current.receipt === lastReceipt.id ||
      treeProgress.current.submittedIndex < 0 ||
      feedingScopeKey(lastReceipt.context) !== scope ||
      !lastReceipt.gata ||
      gataKey(lastReceipt.gata) !== treeProgress.current.gata
    )
      return;
    treeProgress.current.receipt = lastReceipt.id;
    treeProgress.current.index = Math.max(
      treeProgress.current.index,
      treeProgress.current.submittedIndex + 1,
    );
    setCropTick(n => n + 1);
  }, [running, rules.sections.enabled, lastReceipt, scope]);

  useEffect(() => {
    if (
      !running ||
      !rules.cropPlan.length ||
      !lastReceipt ||
      lastReceipt.stage !== 'crop' ||
      lastReceipt.actionKind !== 'save' ||
      lastReceipt.outcome !== 'portal-success' ||
      cropProgress.current.receipt === lastReceipt.id ||
      feedingScopeKey(lastReceipt.context) !== scope ||
      !lastReceipt.gata ||
      gataKey(lastReceipt.gata) !== cropProgress.current.gata
    )
      return;
    cropProgress.current.receipt = lastReceipt.id;
    if (snapshot?.cropRows === undefined) cropProgress.current.index++;
    setCropTick(n => n + 1);
  }, [running, rules.cropPlan.length, lastReceipt, scope, snapshot?.cropRows]);

  useEffect(() => {
    if (
      (bulkRun && !running) ||
      (lastReceipt?.stage === 'crop' &&
        rules.cropPlan.length > cropProgress.current.index) ||
      (rules.sections.enabled &&
        lastReceipt?.stage === 'trees' &&
        treeProgress.current.index < rules.sections.trees.length) ||
      (rules.autoLock && lastReceipt?.stage === 'remarks') ||
      (rules.sections.enabled &&
        lastReceipt &&
        sectionIsTerminal(lastReceipt.stage, rules.sections)) ||
      !rules.autoNext ||
      mode === 'manual' ||
      !snapshot ||
      !enabled ||
      !lastReceipt ||
      lastReceipt.id === nextReceipt.current
    )
      return;
    if (
      lastReceipt.outcome !== 'portal-success' ||
      lastReceipt.actionKind !== 'save' ||
      lastReceipt.stage !== snapshot.stage ||
      feedingScopeKey(lastReceipt.context) !== scope
    )
      return;
    const gata = snapshot.plotIdentity || activeGata;
    if (
      !gata ||
      !lastReceipt.gata ||
      gataKey(gata) !== gataKey(lastReceipt.gata)
    )
      return;
    const next = nextSectionAction(snapshot);
    if (!next) return;
    nextReceipt.current = lastReceipt.id;
    send('action', undefined, next);
  }, [
    rules.autoNext,
    rules.autoLock,
    bulkRun,
    running,
    rules.cropPlan.length,
    rules.sections,
    cropTick,
    mode,
    snapshot,
    enabled,
    lastReceipt,
    activeGata,
    scope,
    send,
  ]);

  useEffect(() => {
    if (
      !running ||
      !rules.autoLock ||
      !enabled ||
      !snapshot ||
      !lastReceipt ||
      lockReceipt.current === lastReceipt.id
    )
      return;
    if (
      lastReceipt.outcome !== 'portal-success' ||
      feedingScopeKey(lastReceipt.context) !== scope
    )
      return;
    const gata = snapshot.plotIdentity || activeGata || lastReceipt.gata;
    if (
      !gata ||
      !lastReceipt.gata ||
      gataKey(gata) !== gataKey(lastReceipt.gata)
    )
      return;
    const mismatch = officialContextError(snapshot, context, true);
    if (mismatch) {
      stop(mismatch);
      return;
    }
    if (
      lastReceipt.actionKind === 'save' &&
      lastReceipt.stage === snapshot.stage &&
      sectionIsTerminal(snapshot.stage, rules.sections)
    ) {
      if (activeItem?.plan && importVerified.current !== gataKey(gata)) {
        stop(
          'Verify all imported crop rows on the official crop page before final locking.',
        );
        return;
      }
      const locks = snapshot.actions.filter(a => a.kind === 'lock');
      if (locks.length !== 1) {
        stop(
          'The final lock action is unavailable or ambiguous. Review this gata.',
        );
        return;
      }
      lockReceipt.current = lastReceipt.id;
      send('action', undefined, locks[0]);
    } else if (lastReceipt.actionKind === 'lock' && snapshot.stage !== 'list') {
      const back = snapshot.actions.filter(
        a =>
          a.kind === 'navigate' &&
          /गाटा\s*सूची|gata\s*list|^(?:back|वापस)$/i.test(a.label),
      );
      if (back.length === 1) {
        lockReceipt.current = lastReceipt.id;
        send('action', undefined, back[0]);
      } else
        stop('Gata locked. Open the gata list to continue the saved queue.');
    }
  }, [
    running,
    rules.autoLock,
    activeItem,
    rules.sections,
    enabled,
    snapshot,
    lastReceipt,
    scope,
    activeGata,
    context,
    send,
    stop,
  ]);

  const button = (
    label: string,
    onPress: () => void,
    disabled = false,
    selected = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          borderColor: colors.primary,
          backgroundColor: selected ? colors.primary : colors.surface,
        },
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          { color: colors.primary },
          selected && styles.selectedText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
  const inputStyle = [
    styles.input,
    {
      color: colors.text,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
  ];
  const updateValue = (field: FeedingField, value: string) => {
    setValues(old => {
      const next = { ...old, [field.ref]: value };
      if (field.kind === 'radio' && value === 'true') {
        // Radio key includes the source group name as its third segment.
        const group = field.key.split('|')[2];
        snapshot?.fields
          .filter(
            f =>
              f.kind === 'radio' &&
              group &&
              f.key.split('|')[2] === group &&
              f.ref !== field.ref,
          )
          .forEach(f => {
            next[f.ref] = 'false';
          });
      }
      return next;
    });
  };
  function onMessage(raw: string, url: string) {
    if (!isFeedingUrl(url) || raw.length > 500000) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (
      (parsed as { type?: string; channel?: string })?.type ===
        'document-start' &&
      (parsed as { channel?: string }).channel === 'lekhpal-feeding-v1'
    ) {
      stop();
      snapshotRef.current = null;
      setSnapshot(null);
      setValues({});
      if (pending.current)
        record(
          'uncertain',
          t(
            'Page reloaded. Check the last submission on the portal.',
            'पेज दोबारा खुला। पिछला सबमिशन पोर्टल पर जांचें।',
          ),
        );
      return;
    }
    const result = feedingResultSchema.safeParse(parsed);
    if (result.success) {
      if (result.data.id !== pending.current?.id) return;
      if (result.data.outcome === 'clicked') {
        if (timer.current) clearTimeout(timer.current);
        const key = `${feedingScopeKey(pending.current!.context)}-pending`;
        pending.current = null;
        setPendingId(null);
        saveQueue.current = saveQueue.current
          .then(() => AsyncStorage.removeItem(key))
          .catch(() => {
            if (mounted.current)
              setStatus(
                t(
                  'Local history could not be updated.',
                  'स्थानीय इतिहास अपडेट नहीं हुआ।',
                ),
              );
          });
      } else record(result.data.outcome, result.data.message);
      return;
    }
    const page = feedingSnapshotSchema.safeParse(parsed);
    if (!page.success || !isFeedingUrl(page.data.url)) return;
    const previous = snapshotRef.current;
    if (
      portalContext.current.documentId !== page.data.documentId ||
      ['login', 'other'].includes(page.data.stage)
    )
      portalContext.current = { documentId: page.data.documentId, value: {} };
    portalContext.current.value = {
      ...portalContext.current.value,
      ...page.data.officialContext,
    };
    page.data.officialContext = portalContext.current.value;
    const mismatch = officialContextError(page.data, context);
    if (mismatch) stop(mismatch);
    if (
      previous &&
      (previous.url !== page.data.url ||
        previous.plotIdentity !== page.data.plotIdentity)
    )
      nextReceipt.current = receiptsRef.current[0]?.id || '';
    snapshotRef.current = page.data;
    if (['list', 'login', 'other'].includes(page.data.stage))
      facts.current = null;
    else {
      const gata = page.data.plotIdentity || activeGata;
      if (gata) {
        if (!facts.current || gataKey(facts.current.gata) !== gataKey(gata))
          facts.current = { gata };
        if (page.data.plotArea !== undefined)
          facts.current.area = page.data.plotArea;
        if (page.data.governmentLandSignal !== undefined)
          facts.current.government = page.data.governmentLandSignal;
      }
    }
    if (
      activeGata &&
      page.data.plotIdentity &&
      gataKey(activeGata) !== gataKey(page.data.plotIdentity)
    )
      stop(
        t(
          'The official page shows a different gata. Review before continuing.',
          'आधिकारिक पेज पर दूसरा गाटा है। जारी रखने से पहले जांचें।',
        ),
      );
    setSnapshot(page.data);
    setValues(old =>
      Object.fromEntries(
        page.data.fields.map(f => {
          const prior = previous?.fields.find(item => item.ref === f.ref);
          const samePage =
            previous?.documentId === page.data.documentId &&
            previous?.url === page.data.url;
          return [
            f.ref,
            samePage && prior?.value === f.value
              ? old[f.ref] ?? f.value
              : f.value,
          ];
        }),
      ),
    );
    if (page.data.unsupported)
      stop(
        t(
          'This portal rejected the embedded browser. The existing Khasra Login remains available.',
          'पोर्टल ने इस ब्राउज़र को स्वीकार नहीं किया। मौजूदा खसरा लॉगिन उपलब्ध है।',
        ),
      );
  }
  function leave() {
    const close = () => {
      stop();
      navigation.goBack();
    };
    if (pending.current)
      Alert.alert(
        t('Submission pending', 'सबमिशन लंबित'),
        t(
          'Check the result on the portal before leaving. Closing cannot undo a submitted entry.',
          'बंद करने से पहले पोर्टल पर परिणाम जांचें। बंद करने से सबमिट की गई प्रविष्टि वापस नहीं होगी।',
        ),
        [
          { text: t('Stay', 'रुकें'), style: 'cancel' },
          { text: t('Leave', 'बाहर जाएं'), onPress: close },
        ],
      );
    else close();
  }

  return (
    <AppScreen scroll={false}>
      <AppHeader
        title={t('Khasra Feeding', 'खसरा फीडिंग')}
        leftIconName="arrow-left"
        onLeftPress={leave}
        subtitle={
          opened
            ? `${context.year} · ${t(
                { kharif: 'Kharif', rabi: 'Rabi', zaid: 'Zaid' }[
                  context.season
                ],
                { kharif: 'खरीफ', rabi: 'रबी', zaid: 'जायद' }[context.season],
              )} · ${context.village}`
            : undefined
        }
        rightIcons={
          opened
            ? [
                {
                  iconName: 'tune-variant',
                  accessibilityLabel: t('Work settings', 'कार्य सेटिंग्स'),
                  onPress: () => setExpanded(true),
                },
              ]
            : undefined
        }
      />
      {!opened ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {t('UP seasonal survey entry', 'UP मौसमी सर्वेक्षण प्रविष्टि')}
          </Text>
          <Text style={{ color: colors.textMuted }}>
            {t(
              'Choose the same year, season and village as your official survey. Sign in yourself inside the feeding browser.',
              'आधिकारिक सर्वेक्षण वाला वर्ष, सीजन और गांव चुनें। फीडिंग ब्राउज़र में स्वयं लॉगिन करें।',
            )}
          </Text>
          <TextInput
            accessibilityLabel="Fasli year"
            placeholder={t('Fasli year', 'फसली वर्ष')}
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={context.year}
            onChangeText={year => setContext(c => ({ ...c, year }))}
            maxLength={4}
            style={inputStyle}
          />
          <TextInput
            accessibilityLabel="Feeding village"
            placeholder={t('Village', 'गांव')}
            placeholderTextColor={colors.textMuted}
            value={context.village}
            onChangeText={village => setContext(c => ({ ...c, village }))}
            style={inputStyle}
          />
          <View style={styles.row}>
            {(['kharif', 'rabi', 'zaid'] as const).map((season, i) => (
              <React.Fragment key={season}>
                {button(
                  t(['Kharif', 'Rabi', 'Zaid'][i], ['खरीफ', 'रबी', 'जायद'][i]),
                  () => setContext(c => ({ ...c, season })),
                  false,
                  context.season === season,
                )}
              </React.Fragment>
            ))}
          </View>
          <TextInput
            accessibilityLabel="Feeding village code"
            placeholder={t('Village code (6 digits)', 'गांव का कोड (6 अंक)')}
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            value={context.villageCode}
            onChangeText={villageCode =>
              setContext(c => ({ ...c, villageCode }))
            }
            style={inputStyle}
          />
          {!validateFeedingContext(context) && (
            <FeedingQueuePanel
              offline
              key={scope}
              context={context}
              snapshot={null}
              disabled
              editingDisabled={false}
              stopEpoch={stopEpoch}
              receipt={null}
              onCommand={() => {}}
              onActiveGata={setActiveGata}
              onActiveItem={setActiveItem}
              onPause={pauseQueue}
            />
          )}
          {button(t('Open feeding browser', 'फीडिंग ब्राउज़र खोलें'), () => {
            const error = validateFeedingContext(context);
            if (error) setStatus(error);
            else {
              setStatus('');
              setOpened(true);
            }
          })}
          <Text style={{ color: colors.textMuted }}>
            {t(
              'Uses the official form. Local presets are scoped to this year, season and village. Login details are not saved by this helper.',
              'आधिकारिक फॉर्म का उपयोग होगा। प्रीसेट इस वर्ष, सीजन और गांव के लिए सेव होंगे। यह सहायक लॉगिन विवरण सेव नहीं करता।',
            )}
          </Text>
          {!!status && (
            <Text accessibilityRole="alert" style={{ color: colors.text }}>
              {status}
            </Text>
          )}
        </ScrollView>
      ) : (
        <>
          <PortalWorkStatus
            status={status}
            active={running || queueRunning || !!pendingId}
            onStop={() =>
              stop(
                t(
                  'Stopped. Check any pending action on the official page.',
                  'रोक दिया गया। लंबित कार्रवाई आधिकारिक पेज पर जांचें।',
                ),
              )
            }
            onDetails={() => setExpanded(true)}
          />
          <WebView
            ref={web}
            source={SOURCE}
            style={styles.web}
            userAgent={FEEDING_USER_AGENT}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled={false}
            thirdPartyCookiesEnabled={false}
            mixedContentMode="never"
            allowFileAccess={false}
            setSupportMultipleWindows={false}
            injectedJavaScript={KHASRA_FEEDING_BRIDGE}
            injectedJavaScriptForMainFrameOnly
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={request =>
              isFeedingNavigationUrl(request.url)
            }
            onNavigationStateChange={state =>
              setExternalLogin(
                isFeedingNavigationUrl(state.url) && !isFeedingUrl(state.url),
              )
            }
            // Android emits onLoadStart for SPA history/hash changes too.
            // Only a real document start invalidates the browser session.
            injectedJavaScriptBeforeContentLoaded={`if (window.top === window.self && window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'document-start',channel:'lekhpal-feeding-v1'})); true;`}
            injectedJavaScriptBeforeContentLoadedForMainFrameOnly
            onLoadEnd={() =>
              web.current?.injectJavaScript(KHASRA_FEEDING_BRIDGE)
            }
            onMessage={event =>
              onMessage(event.nativeEvent.data, event.nativeEvent.url)
            }
            onError={() => {
              stop();
              if (pending.current)
                record(
                  'uncertain',
                  t(
                    'Connection lost. Check the record before retrying.',
                    'कनेक्शन टूट गया। दोबारा प्रयास से पहले रिकॉर्ड जांचें।',
                  ),
                );
              setStatus(
                t(
                  'Portal could not load. Try again when connected.',
                  'पोर्टल लोड नहीं हुआ। कनेक्शन आने पर दोबारा प्रयास करें।',
                ),
              );
            }}
          />
          <PortalWorkPanel
            visible={expanded}
            title={t('Khasra Feeding', 'खसरा फीडिंग')}
            onClose={() => setExpanded(false)}
            onHistory={() => setHistoryOpen(true)}
            onStop={() => stop()}
          >
            <ScrollView
              style={styles.panel}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.row}>
                {(['manual', 'normal', 'advanced'] as const).map((item, i) => (
                  <React.Fragment key={item}>
                    {button(
                      t(
                        ['Manual', 'Normal', 'Presets'][i],
                        ['मैनुअल', 'सामान्य', 'प्रीसेट'][i],
                      ),
                      () => {
                        stop();
                        setMode(item);
                      },
                      false,
                      mode === item,
                    )}
                  </React.Fragment>
                ))}
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {snapshot
                  ? t(...stageNames[snapshot.stage])
                  : externalLogin
                  ? t('Government login', 'सरकारी लॉगिन')
                  : t('Loading portal…', 'पोर्टल खुल रहा है…')}
              </Text>
              {!!status && (
                <Text accessibilityRole="alert" style={{ color: colors.text }}>
                  {status}
                </Text>
              )}
              {snapshot?.unsupported &&
                button(
                  t('Open existing Khasra Login', 'मौजूदा खसरा लॉगिन खोलें'),
                  () => {
                    stop();
                    openPortalBrowser(FEEDING_URL).catch(() =>
                      setStatus(
                        t('Browser unavailable.', 'ब्राउज़र उपलब्ध नहीं है।'),
                      ),
                    );
                  },
                )}
              {snapshot?.stage === 'login' && (
                <Text style={{ color: colors.textMuted }}>
                  {t(
                    'Sign in on the official page, then open Khasra survey entry. This browser has its own login session.',
                    'आधिकारिक पेज पर लॉगिन करके खसरा सर्वेक्षण प्रविष्टि खोलें। इस ब्राउज़र का अलग लॉगिन सत्र है।',
                  )}
                </Text>
              )}
              {externalLogin && (
                <Text style={{ color: colors.textMuted }}>
                  {t(
                    'Complete the official RCCMS login, then open eKhasra survey entry. The feeding helper is available on supported eKhasra forms.',
                    'आधिकारिक RCCMS लॉगिन पूरा करके eKhasra सर्वेक्षण प्रविष्टि खोलें। फीडिंग सहायक समर्थित eKhasra फॉर्म पर उपलब्ध होगा।',
                  )}
                </Text>
              )}
              {mode !== 'manual' && (
                <>
                  <FeedingQueuePanel
                    onRunningChange={setQueueRunning}
                    onActiveItem={setActiveItem}
                    onStartBulk={startBulk}
                    bulkStartError={bulkStartError}
                    editingDisabled={running || !!pendingId}
                    context={context}
                    snapshot={snapshot}
                    disabled={!enabled}
                    stopEpoch={stopEpoch}
                    receipt={lastReceipt}
                    onCommand={sendQueueCommand}
                    onActiveGata={setActiveGata}
                    onPause={pauseQueue}
                    skipRequest={skipRequest}
                  />
                  <AdvancedFeedingSettings
                    snapshot={snapshot}
                    cropOptions={
                      snapshot?.fields.find(
                        f =>
                          f.kind === 'select' &&
                          /crop|fasal|फसल/i.test(f.key + ' ' + f.label),
                      )?.options || []
                    }
                    rules={baseRules}
                    disabled={!enabled || running}
                    onChange={next => {
                      stop();
                      setBulkRun(false);
                      setRules(next);
                      setRulesSaving(true);
                      const write = rulesWrites.current.then(() =>
                        AsyncStorage.setItem(
                          `${scope}-rules`,
                          JSON.stringify(next),
                        ),
                      );
                      rulesWrites.current = write.catch(() => {});
                      const tail = rulesWrites.current;
                      write
                        .then(() => {
                          if (mounted.current && rulesWrites.current === tail)
                            setRulesSaving(false);
                        })
                        .catch(() => {
                          if (mounted.current && rulesWrites.current === tail) {
                            setRulesSaving(false);
                            setRules(DEFAULT_ADVANCED_RULES);
                            setStatus(
                              t(
                                'Rules could not be saved. Automatic rules are disabled.',
                                'नियम सेव नहीं हुए। स्वचालित नियम बंद हैं।',
                              ),
                            );
                          }
                        });
                    }}
                  />
                  {snapshot?.fields.map(field => (
                    <View key={field.ref} style={styles.field}>
                      <Text style={{ color: colors.text }}>
                        {field.label}
                        {field.required ? ' *' : ''}
                      </Text>
                      {field.kind === 'select' ? (
                        button(
                          field.options.find(
                            o => o.value === (values[field.ref] ?? field.value),
                          )?.label || t('Choose', 'चुनें'),
                          () => setPicker(field),
                          !enabled,
                        )
                      ) : ['checkbox', 'radio'].includes(field.kind) ? (
                        button(
                          (values[field.ref] ?? field.value) === 'true'
                            ? t('Yes / selected', 'हां / चयनित')
                            : t('No / unselected', 'नहीं / अचयनित'),
                          () =>
                            updateValue(
                              field,
                              field.kind !== 'radio' &&
                                (values[field.ref] ?? field.value) === 'true'
                                ? 'false'
                                : 'true',
                            ),
                          !enabled,
                        )
                      ) : (
                        <TextInput
                          accessibilityLabel={field.label}
                          value={values[field.ref] ?? field.value}
                          onChangeText={value => updateValue(field, value)}
                          keyboardType={
                            field.kind === 'number' ? 'decimal-pad' : 'default'
                          }
                          multiline={field.kind === 'textarea'}
                          editable={enabled}
                          style={inputStyle}
                        />
                      )}
                    </View>
                  ))}
                  {!!snapshot?.fields.length && (
                    <View style={styles.row}>
                      {button(
                        t('Fill official form', 'आधिकारिक फॉर्म भरें'),
                        () => fill(),
                        !enabled,
                      )}
                      {button(
                        t('Save preset', 'प्रीसेट सेव करें'),
                        () => {
                          if (!snapshot) return;
                          const error = validateFeedingValues(snapshot, values);
                          if (error) {
                            setStatus(error);
                            return;
                          }
                          const next = {
                            ...presets,
                            [snapshot.stage === 'land' &&
                            snapshot.governmentLandSignal &&
                            rules.governmentLand === 'include'
                              ? 'government:land'
                              : snapshot.stage]: createFeedingPreset(
                              snapshot,
                              values,
                            ),
                          };
                          AsyncStorage.setItem(
                            `${scope}-presets`,
                            JSON.stringify(next),
                          )
                            .then(() => {
                              setPresets(next);
                              setStatus(
                                t(
                                  'Preset saved for this village and season.',
                                  'इस गांव और सीजन का प्रीसेट सेव हुआ।',
                                ),
                              );
                            })
                            .catch(() =>
                              setStatus(
                                t(
                                  'Preset could not be saved.',
                                  'प्रीसेट सेव नहीं हुआ।',
                                ),
                              ),
                            );
                        },
                        !enabled || !ready,
                      )}
                    </View>
                  )}
                  {mode === 'advanced' && (
                    <>
                      <Text style={{ color: colors.textMuted }}>
                        {t(
                          'Start applies the saved rules and reviewed presets. Area stays specific to the current plot. Submission and final locking run only when their switches are enabled above.',
                          'शुरू करने पर सेव नियम और जांचे हुए प्रीसेट लगेंगे। क्षेत्रफल वर्तमान गाटे का रहेगा। ऊपर संबंधित विकल्प चालू करने पर ही अपने आप सबमिट और अंतिम लॉक होगा।',
                        )}
                      </Text>
                      {button(
                        running
                          ? t('Stop presets', 'प्रीसेट रोकें')
                          : t('Start presets', 'प्रीसेट शुरू करें'),
                        () => {
                          if (running) stop();
                          else {
                            const error = validateAdvancedRules(rules);
                            if (error) {
                              setStatus(error);
                              return;
                            }
                            const page = snapshotRef.current;
                            const stoppedAt = stopSequence.current;
                            const start = () => {
                              if (
                                !page ||
                                stoppedAt !== stopSequence.current ||
                                snapshotRef.current?.documentId !==
                                  page.documentId ||
                                snapshotRef.current?.revision !== page.revision
                              ) {
                                setStatus(
                                  t(
                                    'The page changed. Review it again.',
                                    'पेज बदल गया। दोबारा जांचें।',
                                  ),
                                );
                                return;
                              }
                              appliedPage.current = '';
                              workflow.current = { key: '' };
                              treeProgress.current = {
                                gata: '',
                                documentId: '',
                                index: 0,
                                receipt: '',
                                submittedIndex: -1,
                              };
                              submittedStages.current.clear();
                              runningRef.current = true;
                              setRunning(true);
                            };
                            if (
                              rules.autoLock ||
                              rules.autoSubmit ||
                              rules.smallAreaEnabled ||
                              rules.governmentLand !== 'review'
                            )
                              Alert.alert(
                                t(
                                  'Start configured feeding?',
                                  'चुने हुए नियमों से फीडिंग शुरू करें?',
                                ),
                                `${context.year} · ${context.season} · ${
                                  context.village
                                } (${context.villageCode})\n${t(
                                  'Review all saved presets and plot facts. Enabled rules apply to subsequent gatas in this session.',
                                  'सभी सेव प्रीसेट और गाटों के विवरण जांचें। चालू नियम इस सत्र के अगले गाटों पर भी लागू होंगे।',
                                )}\n${
                                  rules.autoSubmit || rules.autoLock
                                    ? t(
                                        rules.autoLock
                                          ? `Final gata locking is ON. Automatic submission is ${
                                              rules.autoSubmit ? 'ON' : 'OFF'
                                            }.`
                                          : 'Automatic government form submission is ON.',
                                        rules.autoLock
                                          ? `अंतिम गाटा लॉक चालू है। स्वचालित सबमिशन ${
                                              rules.autoSubmit ? 'चालू' : 'बंद'
                                            } है।`
                                          : 'सरकारी फॉर्म का स्वचालित सबमिशन चालू है।',
                                      )
                                    : ''
                                }\n${
                                  rules.smallAreaEnabled
                                    ? `रिक्त ≤ ${rules.smallAreaThreshold}`
                                    : ''
                                }`,
                                [
                                  {
                                    text: t('Cancel', 'रद्द करें'),
                                    style: 'cancel',
                                  },
                                  {
                                    text: t('Start', 'शुरू करें'),
                                    onPress: start,
                                  },
                                ],
                              );
                            else start();
                          }
                        },
                        !enabled || !ready || rulesSaving,
                      )}
                    </>
                  )}
                  {snapshot?.actions.map(action => (
                    <React.Fragment key={action.ref}>
                      {button(
                        action.label,
                        () => actionPress(action),
                        !enabled,
                      )}
                    </React.Fragment>
                  ))}
                  {snapshot &&
                    !snapshot.fields.length &&
                    !['login', 'other'].includes(snapshot.stage) && (
                      <Text style={{ color: colors.textMuted }}>
                        {t(
                          'Choose the plot or continue on the official page. The helper appears when editable survey fields are available.',
                          'आधिकारिक पेज पर गाटा चुनें या आगे बढ़ें। संपादन योग्य सर्वेक्षण फील्ड मिलने पर सहायक दिखेगा।',
                        )}
                      </Text>
                    )}
                </>
              )}
            </ScrollView>
          </PortalWorkPanel>
        </>
      )}
      <Modal
        visible={!!picker}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {picker?.label}
            </Text>
            <ScrollView>
              {picker?.options.map((option, i) => (
                <React.Fragment key={`${option.value}-${i}`}>
                  {button(option.label || t('None', 'कोई नहीं'), () => {
                    if (picker) updateValue(picker, option.value);
                    setPicker(null);
                  })}
                </React.Fragment>
              ))}
            </ScrollView>
            {button(t('Close', 'बंद करें'), () => setPicker(null))}
          </View>
        </View>
      </Modal>
      <Modal
        visible={historyOpen}
        animationType="slide"
        onRequestClose={() => setHistoryOpen(false)}
      >
        <AppScreen>
          <AppHeader
            title={t('Feeding history', 'फीडिंग इतिहास')}
            leftIconName="arrow-left"
            onLeftPress={() => setHistoryOpen(false)}
          />
          <View style={styles.content}>
            <Text style={{ color: colors.textMuted }}>
              {t(
                'Portal success means a new website success message was observed. Verify the saved record on the official site.',
                'पोर्टल सफलता का अर्थ वेबसाइट का नया सफलता संदेश मिलना है। सेव रिकॉर्ड आधिकारिक साइट पर जांचें।',
              )}
            </Text>
            {!receipts.length && (
              <Text style={{ color: colors.text }}>
                {t(
                  'No feeding actions yet.',
                  'अभी कोई फीडिंग कार्रवाई नहीं हुई।',
                )}
              </Text>
            )}
            {receipts.map(r => (
              <View
                key={r.id}
                style={[styles.receipt, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text }}>
                  {r.action} ·{' '}
                  {r.outcome === 'filled'
                    ? t('Fields filled', 'फील्ड भरे गए')
                    : r.outcome === 'portal-success'
                    ? t('Portal reported success', 'पोर्टल ने सफलता बताई')
                    : r.outcome === 'failed'
                    ? t('Failed', 'असफल')
                    : t('Check official record', 'आधिकारिक रिकॉर्ड जांचें')}
                </Text>
                <Text style={{ color: colors.textMuted }}>
                  {r.context.year} · {r.context.season} · {r.context.village}
                  {r.gata ? ` · ${t('Gata', 'गाटा')} ${r.gata}` : ''}
                  {'\n'}
                  {r.message}
                  {'\n'}
                  {r.at}
                </Text>
              </View>
            ))}
          </View>
        </AppScreen>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 46 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    marginVertical: 3,
  },
  web: { flex: 1, minHeight: 180 },
  panel: { flex: 1 },
  field: { gap: 5 },
  disabled: { opacity: 0.45 },
  buttonText: { fontWeight: '600' },
  selectedText: { color: '#FFFFFF' },
  backdrop: { flex: 1, backgroundColor: '#0007', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '75%',
    padding: 20,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  receipt: { borderBottomWidth: 1, paddingVertical: 12, gap: 6 },
});
