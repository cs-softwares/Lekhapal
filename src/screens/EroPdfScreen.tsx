import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Share from 'react-native-share';
import AppScreen from '../components/AppScreen';
import AppHeader from '../components/AppHeader';
import {
  PortalWorkPanel,
  PortalWorkStatus,
} from '../components/revenue/PortalWorkControls';
import EroPortal, {
  EroEvent,
  EroPortalHandle,
} from '../components/ero/EroPortal';
import {
  ERO_STORAGE,
  EroBatch,
  EroFile,
  EroSnapshot,
  EroStore,
  eroListStep,
  eroPdfBase64,
  eroPdfName,
  eroRange,
  eroScript,
  eroSnapshotSchema,
  eroStoreSchema,
  isEroUrl,
} from '../domain/eroPdf';
import {
  exportOfficialPdf,
  printOfficialPdf,
  saveOfficialPdf,
} from '../native/workFiles';
import { useAppTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { typography } from '../theme/typography';

type Operation = {
  id: string;
  kind: 'open' | 'navigate' | 'download' | 'return';
  documentId: string;
  url: string;
  rows: string;
  serial: number;
  record: string;
  batchId: string;
  receiving?: boolean;
};
const empty: EroStore = { files: [], batch: null };
export default function EroPdfScreen({
  navigation,
}: {
  navigation: { goBack: () => void };
}) {
  const { colors } = useAppTheme(),
    { language } = useLanguage();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const web = useRef<EroPortalHandle>(null),
    current = useRef<EroSnapshot | null>(null),
    store = useRef<EroStore>(empty);
  const op = useRef<Operation | null>(null),
    selected = useRef<EroSnapshot['rows'][number] | null>(null);
  const active = useRef(true),
    starting = useRef(false),
    running = useRef(false),
    saving = useRef(false),
    canBack = useRef(false),
    generation = useRef(0),
    writes = useRef(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState<EroSnapshot | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [isRunning, setRunning] = useState(false);
  const [status, setStatus] = useState(''),
    [helper, setHelper] = useState(false),
    [library, setLibrary] = useState(false),
    [data, setData] = useState<EroStore>(empty);
  const [from, setFrom] = useState('1'),
    [to, setTo] = useState('1');
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const stop = useCallback((message = '') => {
    generation.current++;
    running.current = false;
    op.current = null;
    selected.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    web.current?.injectJavaScript(eroScript({ type: 'stop' }));
    if (active.current) {
      setRunning(false);
      setBusy(saving.current);
      if (message) setStatus(message);
    }
  }, []);
  const commit = useCallback((change: (old: EroStore) => EroStore) => {
    const task = writes.current.then(async () => {
      const next = eroStoreSchema.parse(change(store.current));
      await AsyncStorage.setItem(ERO_STORAGE, JSON.stringify(next));
      store.current = next;
      if (active.current) setData(next);
    });
    writes.current = task.catch(() => undefined);
    return task;
  }, []);
  useEffect(() => {
    active.current = true;
    AsyncStorage.getItem(ERO_STORAGE)
      .then(raw => {
        const restored = eroStoreSchema.parse(raw ? JSON.parse(raw) : empty);
        store.current = restored;
        if (!active.current) return;
        setData(restored);
        setReady(true);
        if (restored.batch) {
          setFrom(String(restored.batch.from));
          setTo(String(restored.batch.to));
          if (restored.batch.next <= restored.batch.to)
            setStatus(
              'Saved ERO range is paused. Open the original list to resume.',
            );
        }
      })
      .catch(() => {
        if (active.current)
          setStatus(
            'Saved ERO progress could not be read. Reopen this screen before exporting.',
          );
      });
    const app = AppState.addEventListener('change', state => {
      if (state !== 'active') stop('ERO downloads paused.');
    });
    return () => {
      active.current = false;
      stop();
      app.remove();
    };
  }, [stop]);
  useEffect(() => {
    if (helper || library) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      stop();
      if (canBack.current) {
        web.current?.goBack();
        return true;
      }
      return false;
    });
    return () => back.remove();
  }, [helper, library, stop]);
  function dispatch(
    p: EroSnapshot,
    kind: Operation['kind'],
    ref?: string,
    row = selected.current,
  ) {
    if (op.current || saving.current) return;
    const id =
      Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    const job: Operation = {
      id,
      kind,
      documentId: p.documentId,
      url: p.url,
      rows: JSON.stringify(p.rows.map(r => [r.serial, r.key])),
      serial: row?.serial || 0,
      record: row?.key || '',
      batchId: running.current ? store.current.batch?.id || '' : '',
    };
    op.current = job;
    setBusy(true);
    timer.current = setTimeout(
      () =>
        stop(
          'The ERO page or download did not finish. Progress is saved; review the portal before resuming.',
        ),
      45000,
    );
    if (kind === 'return' && !ref) {
      web.current?.goBack();
      return;
    }
    web.current?.injectJavaScript(
      eroScript({
        id,
        type: kind === 'return' ? 'navigate' : kind,
        documentId: p.documentId,
        revision: p.revision,
        url: p.url,
        ref,
        record: job.record,
      }),
    );
  }
  function advance(p: EroSnapshot) {
    if (!running.current || p.busy || saving.current) return;
    if (p.stage === 'login' || p.stage === 'other') {
      stop(
        'Sign in and return to the original Suo Moto DSE list before resuming.',
      );
      return;
    }
    const pending = op.current;
    if (pending) {
      if (pending.kind === 'download') {
        if (p.url !== pending.url || p.documentId !== pending.documentId)
          stop('The ERO record changed before its PDF was saved.');
        return;
      }
      const opened =
        pending.kind === 'open' &&
        p.stage === 'record' &&
        (p.url !== pending.url || p.documentId !== pending.documentId);
      const returned = pending.kind === 'return' && p.stage === 'list';
      const paged =
        pending.kind === 'navigate' &&
        p.stage === 'list' &&
        JSON.stringify(p.rows.map(r => [r.serial, r.key])) !== pending.rows;
      if (!opened && !returned && !paged) return;
      clearTimer();
      op.current = null;
      setBusy(false);
    }
    const batch = store.current.batch;
    if (!batch) {
      stop();
      return;
    }
    if (batch.next > batch.to) {
      stop(
        'ERO PDF range completed. Open Saved PDFs to print, share or save a copy.',
      );
      return;
    }
    try {
      if (p.stage === 'list') {
        const step = eroListStep(p, batch);
        if (step.kind === 'open') {
          selected.current = step.row;
          dispatch(p, 'open', step.ref, step.row);
        } else dispatch(p, 'navigate', step.ref);
      } else if (p.stage === 'record' && selected.current) {
        if (!p.download)
          throw Error(
            'The official PDF download control is missing or ambiguous. Open the required Format A record.',
          );
        dispatch(p, 'download', p.download);
      } else
        throw Error('Return to the original ERO list to resume this range.');
    } catch (e) {
      stop((e as Error).message);
    }
  }
  async function receivePdf(message: any) {
    const job = op.current;
    if (
      !job ||
      job.kind !== 'download' ||
      job.receiving ||
      message.id !== job.id ||
      message.documentId !== job.documentId ||
      message.url !== job.url
    )
      return;
    job.receiving = true;
    saving.current = true;
    clearTimer();
    try {
      const base64 = eroPdfBase64(message.base64);
      const name = eroPdfName(job.serial, job.id, message.filename);
      const path = await saveOfficialPdf(name, base64);
      const file: EroFile = {
        id: job.id,
        name,
        path,
        at: new Date().toISOString(),
        serial: job.serial,
        record: job.record,
        sourceName:
          typeof message.filename === 'string'
            ? message.filename.slice(0, 240)
            : undefined,
        batchId: job.batchId,
      };
      await commit(old => ({
        files: [file, ...old.files],
        batch:
          old.batch && job.batchId === old.batch.id
            ? {
                ...old.batch,
                next: job.serial + 1,
                done: [...new Set([...old.batch.done, job.serial])],
              }
            : old.batch,
      }));
      if (!active.current) return;
      web.current?.injectJavaScript(eroScript({ type: 'stop' }));
      saving.current = false;
      if (op.current?.id !== job.id || !running.current) {
        op.current = null;
        setBusy(false);
        setStatus(
          'PDF saved. Open Saved PDFs to print, share or save to Downloads.',
        );
        return;
      }
      op.current = null;
      setBusy(false);
      const p = current.current,
        batch = store.current.batch;
      if (batch && batch.next > batch.to) {
        stop('ERO PDF range completed. Open Saved PDFs for your files.');
        return;
      }
      if (!p || p.url !== job.url || (!p.back && !canBack.current))
        throw Error(
          'PDF saved. Return to the original list and resume the remaining range.',
        );
      dispatch(p, 'return', p.back);
    } catch (e) {
      stop((e as Error).message);
    } finally {
      saving.current = false;
      if (active.current && !op.current) setBusy(false);
    }
  }
  function onEvent(event: EroEvent) {
    if (!active.current) return;
    if (event.kind === 'touch') {
      if (running.current || op.current)
        stop('ERO downloads paused while you use the official page.');
      return;
    }
    if (event.kind === 'error') {
      stop(event.data || 'The official ERO page could not load.');
      return;
    }
    if (event.kind === 'navigation') {
      canBack.current = event.canGoBack;
      if (!isEroUrl(event.url) && (running.current || op.current))
        stop('Sign in through ECINet and reopen the ERO list to resume.');
      return;
    }
    if (event.kind === 'start') {
      current.current = null;
      setPage(null);
      return;
    }
    if (event.kind !== 'message' || !isEroUrl(event.url)) return;
    let message: any;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.channel !== 'lekhpal-ero-v1') return;
    if (message.type === 'error') {
      if (!message.id || message.id === op.current?.id)
        stop(String(message.message).slice(0, 4000));
      return;
    }
    if (message.type === 'pdf' && message.url === event.url) {
      receivePdf(message).catch(() => stop('The ERO PDF could not be saved.'));
      return;
    }
    const parsed = eroSnapshotSchema.safeParse(message);
    if (
      !parsed.success ||
      !isEroUrl(parsed.data.url) ||
      parsed.data.url !== event.url
    )
      return;
    current.current = parsed.data;
    setPage(parsed.data);
    advance(parsed.data);
  }
  async function start(resume: boolean) {
    const p = current.current;
    if (
      !ready ||
      !p ||
      p.busy ||
      op.current ||
      saving.current ||
      starting.current
    )
      return;
    starting.current = true;
    try {
      if (p.stage !== 'list' || !p.rows.length)
        throw Error('Sign in and open the Suo Moto DSE list first.');
      const range = eroRange(from, to);
      const batch: EroBatch =
        resume && store.current.batch
          ? store.current.batch
          : {
              id: Date.now().toString(36),
              ...range,
              next: range.from,
              context: p.context,
              listUrl: p.url,
              done: [],
            };
      if (batch.next > batch.to)
        throw Error('This ERO range is already complete.');
      if (store.current.files.length + batch.to - batch.next + 1 > 1000)
        throw Error('The saved PDF library limit is 1,000 files.');
      eroListStep(p, batch);
      const token = ++generation.current;
      setBusy(true);
      await commit(old => ({ ...old, batch }));
      if (!active.current || token !== generation.current) return;
      if (
        current.current?.documentId !== p.documentId ||
        current.current?.revision !== p.revision
      )
        throw Error('The ERO list changed. Review it before starting.');
      running.current = true;
      setRunning(true);
      setHelper(false);
      setBusy(false);
      setStatus('Downloading the selected ERO PDF range.');
      advance(p);
    } catch (e) {
      stop((e as Error).message);
    } finally {
      starting.current = false;
    }
  }
  const button = (label: string, press: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={press}
      style={[
        styles.button,
        { borderColor: colors.primary },
        disabled && styles.disabled,
      ]}
    >
      <Text style={[typography.label, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
  const operation = (job: () => Promise<unknown>, success = '') => {
    job()
      .then(() => {
        if (success) setStatus(success);
      })
      .catch(e => setStatus(e.message));
  };
  return (
    <AppScreen scroll={false}>
      <AppHeader
        title={t('ERO PDFs', 'ईआरओ पीडीएफ')}
        leftIconName="arrow-left"
        onLeftPress={() => {
          stop();
          navigation.goBack();
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
        active={busy || isRunning}
        onStop={() => stop('ERO downloads paused.')}
        onDetails={() => setHelper(true)}
      />
      <EroPortal ref={web} style={styles.web} onEvent={onEvent} />
      <PortalWorkPanel
        visible={helper}
        title={t('ERO PDFs', 'ईआरओ पीडीएफ')}
        onClose={() => setHelper(false)}
        onHistory={() => setLibrary(true)}
        onStop={() => stop('ERO downloads paused.')}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typography.body, { color: colors.text }]}>
            {t(
              'Sign in on the official ERO portal and open Suo Moto DSE. Choose the record range. Each row downloads its first elector’s Format A. Serial numbers start at 1.',
              'आधिकारिक ईआरओ पोर्टल पर लॉगिन करके Suo Moto DSE सूची खोलें। क्रम संख्या चुनें। हर पंक्ति के पहले मतदाता का Format A डाउनलोड होगा। पहली क्रम संख्या 1 है।',
            )}
          </Text>
          {!!status && (
            <Text accessibilityRole="alert" style={{ color: colors.text }}>
              {status}
            </Text>
          )}
          <View style={styles.range}>
            {(['From serial', 'Through serial'] as const).map((label, i) => (
              <View style={styles.half} key={label}>
                <Text style={[typography.label, { color: colors.text }]}>
                  {label}
                </Text>
                <TextInput
                  accessibilityLabel={label}
                  value={i ? to : from}
                  onChangeText={i ? setTo : setFrom}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!busy && !isRunning}
                  style={[
                    styles.input,
                    { borderColor: colors.border, color: colors.text },
                  ]}
                />
              </View>
            ))}
          </View>
          {button(
            t('Download selected range', 'चुनी गई श्रेणी डाउनलोड करें'),
            () => {
              start(false);
            },
            !ready || busy || isRunning || page?.stage !== 'list' || page.busy,
          )}
          {!!data.batch &&
            data.batch.next <= data.batch.to &&
            button(
              t('Resume saved range', 'सहेजी गई श्रेणी जारी करें'),
              () => {
                start(true);
              },
              !ready ||
                busy ||
                isRunning ||
                page?.stage !== 'list' ||
                page.busy,
            )}
          {!!data.batch && (
            <Text style={{ color: colors.textMuted }}>
              {data.batch.done.length} saved · Next serial{' '}
              {data.batch.next <= data.batch.to ? data.batch.next : '—'}
            </Text>
          )}
          {button(
            t('Save current Format A PDF', 'वर्तमान Format A पीडीएफ सहेजें'),
            () => {
              const p = current.current;
              if (p?.download && store.current.files.length < 1000) {
                selected.current = null;
                dispatch(p, 'download', p.download, null);
                setHelper(false);
              }
            },
            !ready ||
              busy ||
              isRunning ||
              !page?.download ||
              page.busy ||
              data.files.length >= 1000,
          )}
          {button(
            `${t('Saved PDFs', 'सहेजे गए पीडीएफ')} (${data.files.length})`,
            () => setLibrary(true),
          )}
          <Text style={{ color: colors.textMuted }}>
            {t(
              'Progress advances after the PDF is saved. Touching the portal or leaving the app pauses the range. You can resume from the same list.',
              'पीडीएफ सहेजने के बाद अगली क्रम संख्या खुलेगी। पोर्टल को छूने या ऐप छोड़ने पर डाउनलोड रुकेंगे। उसी सूची से जारी कर सकते हैं।',
            )}
          </Text>
        </ScrollView>
      </PortalWorkPanel>
      <Modal
        visible={library}
        animationType="slide"
        onRequestClose={() => setLibrary(false)}
      >
        <AppScreen scroll={false}>
          <AppHeader
            title={t('Saved ERO PDFs', 'सहेजे गए ईआरओ पीडीएफ')}
            leftIconName="arrow-left"
            onLeftPress={() => setLibrary(false)}
          />
          <ScrollView contentContainerStyle={styles.content}>
            {!!status && (
              <Text accessibilityRole="alert" style={{ color: colors.text }}>
                {status}
              </Text>
            )}
            {!data.files.length && (
              <Text style={{ color: colors.text }}>
                {t(
                  'Downloaded ERO PDFs will appear here.',
                  'डाउनलोड किए गए ईआरओ पीडीएफ यहां मिलेंगे।',
                )}
              </Text>
            )}
            {data.files.map(file => (
              <View
                key={file.id}
                style={[styles.file, { borderColor: colors.border }]}
              >
                <Text style={[typography.label, { color: colors.text }]}>
                  {file.name}
                </Text>
                <Text style={{ color: colors.textMuted }}>
                  {new Date(file.at).toLocaleString()}
                </Text>
                {button(t('Print', 'प्रिंट'), () =>
                  operation(() => printOfficialPdf(file.path, file.name)),
                )}
                {button(t('Share PDF', 'पीडीएफ साझा करें'), () =>
                  operation(() =>
                    Share.open({
                      url: 'file://' + file.path,
                      type: 'application/pdf',
                      failOnCancel: false,
                    }),
                  ),
                )}
                {button(
                  t('Save to Downloads', 'डाउनलोड फ़ोल्डर में सहेजें'),
                  () =>
                    operation(
                      () => exportOfficialPdf(file.path),
                      'PDF copied to Downloads/Lekhpal.',
                    ),
                )}
              </View>
            ))}
          </ScrollView>
        </AppScreen>
      </Modal>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
  web: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  range: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, gap: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
    ...typography.body,
  },
  button: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 48 },
  file: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
});
