import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Share from 'react-native-share';
import { generatePDF } from 'react-native-html-to-pdf';
import AppScreen from '../components/AppScreen';
import AppHeader from '../components/AppHeader';
import { PortalWorkStatus } from '../components/revenue/PortalWorkControls';
import { useAppTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { RootStackParamList } from '../types/navigation';
import { typography } from '../theme/typography';
import { isOfficialWorkUrl } from '../domain/officialWork';
import {
  ECHAWADI_PAGES,
  EchawadiMode,
  EchawadiSnapshot,
  DemandRecord,
  demandThreshold,
  echawadiMode,
  echawadiScript,
  echawadiSnapshotSchema,
  echawadiUrl,
  form8bHtml,
  receiptAccounts,
} from '../domain/echawadi';
import { useEchawadiWrite } from '../hooks/useEchawadiWrite';
import { ECHAWADI_BRIDGE } from '../utils/echawadiBridge';

type Run = {
  kind: 'demand' | 'form8b';
  through: number;
  threshold: number;
  context: string;
  documentId: string;
  page: number;
  waiting: boolean;
  selecting: boolean;
  automatic: boolean;
  demand: DemandRecord[];
};
export default function EchawadiScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Echawadi'>) {
  const { colors } = useAppTheme();
  const { language } = useLanguage();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const web = useRef<WebView>(null);
  const [mode, setMode] = useState<EchawadiMode>('demand');
  const [sourceUrl, setSourceUrl] = useState(
    'https://echawadi.mahabhumi.gov.in/',
  );
  const [page, setPage] = useState<EchawadiSnapshot | null>(null);
  const [helper, setHelper] = useState(false);
  useEffect(() => {
    const listener = Keyboard.addListener('keyboardDidShow', () => {
      if (helper) return;
      web.current?.injectJavaScript(`
        (function () {
          if (location.origin !== 'https://echawadi.mahabhumi.gov.in') return;
          requestAnimationFrame(function () {
            var field = document.activeElement;
            if (field && /^(INPUT|TEXTAREA|SELECT)$/.test(field.tagName)) {
              field.scrollIntoView({ block: 'center', inline: 'nearest' });
            }
          });
        })(); true;
      `);
    });
    return () => listener.remove();
  }, [helper]);
  const [status, setStatus] = useState('');
  const transaction = useEchawadiWrite(
    page,
    script => web.current?.injectJavaScript(script),
    setStatus,
  );
  const transactionStop = transaction.stop;
  const [minimum, setMinimum] = useState('0');
  const [through, setThrough] = useState('1');
  const [accountText, setAccountText] = useState('');
  const [accounts, setAccounts] = useState<string[]>([]);
  const [accountIndex, setAccountIndex] = useState(0);
  const [reports, setReports] = useState<EchawadiSnapshot[]>([]);
  const [running, setRunning] = useState(false);
  const exportRequest = useRef<{
    id: string;
    documentId: string;
    context: string;
    url: string;
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const receiptRun = useRef<{
    accounts: string[];
    index: number;
    context: string;
    documentId: string;
    phase: 'search' | 'loaded' | 'cash' | 'confirm';
    priorIds: Set<string>;
  } | null>(null);
  const [receiptTick, setReceiptTick] = useState(0);
  const currentPage = useRef(page);
  currentPage.current = page;
  const run = useRef<Run | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true);
  const stop = useCallback(
    (message?: string) => {
      receiptRun.current = null;
      transactionStop();
      exportRequest.current = null;
      setExporting(false);
      run.current = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setRunning(false);
      if (message) setStatus(message);
    },
    [transactionStop],
  );
  const waitForPage = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () =>
        stop(
          'The portal did not finish changing pages. Review the page before retrying.',
        ),
      25000,
    );
  }, [stop]);
  useEffect(() => {
    active.current = true;
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active')
        stop('Paused. Review the official page before continuing.');
    });
    return () => {
      active.current = false;
      run.current = null;
      receiptRun.current = null;
      if (timer.current) clearTimeout(timer.current);
      sub.remove();
    };
  }, [stop]);
  useEffect(() => {
    const task = run.current;
    if (!task || !page || page.busy) return;
    if (
      page.mode !== task.kind ||
      page.documentId !== task.documentId ||
      page.context !== task.context
    ) {
      stop(
        'The report or village changed. Start again after reviewing the selection.',
      );
      return;
    }
    if (task.waiting) {
      if (page.page === task.page) return;
      if (page.page !== task.page + 1) {
        stop('The page order changed. Review the report.');
        return;
      }
      task.page = page.page;
      task.waiting = false;
      task.selecting = false;
    }
    if (!page.rows.length) {
      stop('No report rows are available on this page.');
      return;
    }
    if (task.kind === 'demand') {
      if (page.rows.some(row => row.amount === null || !row.selectable)) {
        stop(
          'The demand amount or checkbox could not be identified. Use the official table for this page.',
        );
        return;
      }
      if (task.automatic && !task.selecting) {
        task.selecting = true;
        waitForPage();
        web.current?.injectJavaScript(
          echawadiScript(page, 'select', task.threshold),
        );
        return;
      }
      const matched = page.rows.every(
        row => row.checked === row.amount! >= task.threshold,
      );
      if (!matched) {
        if (!task.selecting) {
          task.selecting = true;
          waitForPage();
          web.current?.injectJavaScript(
            echawadiScript(page, 'select', task.threshold),
          );
        }
        return;
      }
      task.demand = [
        ...task.demand.filter(r => r.page !== page.page),
        ...page.rows
          .filter(r => r.checked)
          .map(r => ({ page: page.page, key: r.key, amount: r.amount! })),
      ];
    } else {
      setReports(previous =>
        [...previous.filter(p => p.page !== page.page), page].sort(
          (a, b) => a.page - b.page,
        ),
      );
    }
    if (page.page >= task.through || !page.next) {
      if (task.kind === 'demand' && task.automatic) {
        if (
          JSON.stringify(task.demand) !== JSON.stringify(page.selectedDemand) ||
          !task.demand.length
        ) {
          stop(
            'The complete demand selection could not be verified. Review selected pages.',
          );
          return;
        }
        if (timer.current) clearTimeout(timer.current);
        run.current = null;
        setRunning(false);
        transaction.submit('batch-approved', task.demand);
        return;
      }
      stop(
        task.kind === 'demand'
          ? 'Selection prepared. Review it and generate demand on the official page.'
          : 'Report pages collected. Export the PDF from Work settings.',
      );
      return;
    }
    task.waiting = true;
    waitForPage();
    web.current?.injectJavaScript(echawadiScript(page, 'next'));
  }, [page, running, stop, waitForPage, transaction]);
  useEffect(() => {
    const task = receiptRun.current;
    if (!task || !page || page.busy || transaction.busy) return;
    if (
      !transaction.ready ||
      page.mode !== 'receipts' ||
      page.context !== task.context ||
      page.documentId !== task.documentId
    ) {
      stop('Payment batch paused: the village, page or session changed.');
      return;
    }
    const account = task.accounts[task.index];
    if (!account) {
      stop('Cash payment batch completed with official confirmations.');
      return;
    }
    if (task.phase === 'confirm') {
      const result = transaction.history.find(
        h =>
          !task.priorIds.has(h.id) &&
          h.account === account &&
          h.context === task.context,
      );
      if (!result || result.state === 'pending') return;
      if (result.state !== 'confirmed') {
        stop(
          'Payment result needs review. No further account will be submitted.',
        );
        return;
      }
      task.index++;
      task.phase = 'search';
      setReceiptTick(n => n + 1);
      return;
    }
    if (task.phase === 'search') {
      task.phase = 'loaded';
      setAccountIndex(task.index);
      waitForPage();
      web.current?.injectJavaScript(echawadiScript(page, 'search', account));
      return;
    }
    if (page.payment?.account !== account) return;
    if (!/^(cash|रोख|नकद)$/i.test(page.payment.method)) {
      if (task.phase !== 'cash') {
        task.phase = 'cash';
        waitForPage();
        web.current?.injectJavaScript(echawadiScript(page, 'cash', account));
      }
      return;
    }
    if (!page.canSubmit || !page.payment.amount || page.payment.amount <= 0) {
      stop(
        'The current account has no identifiable positive payment amount. Review it manually.',
      );
      return;
    }
    task.phase = 'confirm';
    waitForPage();
    transaction.submit('batch-approved');
  }, [page, running, receiptTick, transaction, stop, waitForPage]);
  function startReceipts() {
    if (
      !page ||
      page.busy ||
      page.mode !== 'receipts' ||
      !page.context ||
      !accounts.length ||
      !transaction.ready ||
      transaction.busy
    ) {
      setStatus(
        'Load the account list and open Receive payment with its village selected.',
      );
      return;
    }
    if (
      transaction.history.some(
        h => h.state === 'uncertain' || h.state === 'pending',
      )
    ) {
      setStatus('Check interrupted transactions in History first.');
      return;
    }
    const captured = page;
    const normalized = receiptAccounts(accounts.join('\n')).map(a =>
      a.replace(/[०-९]/g, c => String(c.charCodeAt(0) - 2406)),
    );
    if (
      transaction.history.some(
        h =>
          h.state === 'confirmed' &&
          h.context === page.context &&
          normalized.includes(h.account),
      )
    ) {
      setStatus(
        'This list includes previously confirmed accounts. Remove those accounts or review them individually.',
      );
      return;
    }
    Alert.alert(
      'Start Cash payment batch?',
      `${page.context}\n${normalized.length} accounts: ${normalized
        .slice(0, 10)
        .join(', ')}${
        normalized.length > 10 ? '…' : ''
      }\nFor each account, submit the positive payment amount displayed by the official portal as Cash. Continue only after checking this list. The batch stops at any unconfirmed result.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            const now = currentPage.current;
            if (
              !now ||
              now.busy ||
              now.documentId !== captured.documentId ||
              now.revision !== captured.revision
            ) {
              setStatus('The page changed. Review it again.');
              return;
            }
            receiptRun.current = {
              accounts: normalized,
              index: 0,
              context: captured.context,
              documentId: captured.documentId,
              phase: 'search',
              priorIds: new Set(transaction.history.map(h => h.id)),
            };
            setRunning(true);
            setHelper(false);
            setReceiptTick(n => n + 1);
            waitForPage();
          },
        },
      ],
    );
  }
  function start(automatic = false) {
    try {
      if (
        !page ||
        page.busy ||
        page.mode !== mode ||
        mode === 'receipts' ||
        !page.page
      )
        throw Error('Open the required report on the official portal first.');
      if (
        !/^\d+$/.test(through) ||
        Number(through) < page.page ||
        Number(through) - page.page > 499
      )
        throw Error(
          'Choose an ending page between the current page and the next 499 pages.',
        );
      const threshold = mode === 'demand' ? demandThreshold(minimum) : 0;
      if (
        automatic &&
        (!transaction.ready ||
          transaction.busy ||
          page.page !== 1 ||
          !page.context)
      )
        throw Error(
          'Open demand page 1 with the correct village before starting automatic submission.',
        );
      if (mode === 'form8b') setReports([]);
      run.current = {
        kind: mode,
        through: Number(through),
        threshold,
        context: page.context,
        documentId: page.documentId,
        page: page.page,
        waiting: false,
        selecting: false,
        automatic,
        demand: [],
      };
      setStatus(
        mode === 'demand'
          ? 'Preparing demand selection…'
          : 'Collecting Form 8B pages…',
      );
      setRunning(true);
      setHelper(false);
      waitForPage();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Check the settings.');
    }
  }
  async function exportReport() {
    setExporting(true);
    try {
      const available = reports.length
        ? reports
        : page?.mode === 'form8b'
        ? [page]
        : [];
      const result = await generatePDF({
        html: form8bHtml(available),
        fileName: `Maharashtra-Form8B-${Date.now()}`,
        directory: 'Documents',
      });
      if (!result.filePath) throw Error('The PDF could not be created.');
      if (active.current)
        await Share.open({
          url: 'file://' + result.filePath,
          type: 'application/pdf',
          failOnCancel: false,
        });
    } catch (e) {
      if (active.current)
        setStatus(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      if (active.current) setExporting(false);
    }
  }
  function choose(next: EchawadiMode) {
    stop();
    setPage(null);
    setReports([]);
    setStatus('');
    setMode(next);
    setSourceUrl(echawadiUrl(next));
    setHelper(false);
  }
  function searchAccount(index: number) {
    try {
      if (!page || page.busy || page.mode !== 'receipts')
        throw Error('Open Receive payment on the official portal first.');
      const account = accounts[index];
      if (!account) throw Error('Add account numbers first.');
      web.current?.injectJavaScript(
        echawadiScript(
          page,
          'search',
          account.replace(/[०-९]/g, c => String(c.charCodeAt(0) - 2406)),
        ),
      );
      setAccountIndex(index);
      setHelper(false);
      setStatus(
        `Account ${account} · ${index + 1}/${
          accounts.length
        }. Review the account and complete payment on the official page.`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Search failed.');
    }
  }
  const button = (label: string, action: () => void, disabled = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={action}
      style={[
        styles.button,
        disabled && styles.disabled,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <Text style={[typography.label, { color: colors.primary }]}>{label}</Text>
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
  return (
    <AppScreen scroll={false}>
      <StatusBar barStyle="light-content" />
      <AppHeader
        title={t('Maharashtra e-Chawadi', 'महाराष्ट्र ई-चावड़ी')}
        leftIconName="arrow-left"
        onLeftPress={() => navigation.goBack()}
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
        active={running || transaction.busy || exporting}
        onStop={() => stop('Stopped. Review the current page.')}
        onDetails={() => setHelper(true)}
      />
      <WebView
        ref={web}
        source={{ uri: sourceUrl }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        mixedContentMode="never"
        allowFileAccess={false}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={r => isOfficialWorkUrl('echawadi', r.url)}
        injectedJavaScript={ECHAWADI_BRIDGE}
        onLoadEnd={() => web.current?.injectJavaScript(ECHAWADI_BRIDGE)}
        onLoadStart={() => {
          setPage(null);
          transactionStop();
          if (run.current || receiptRun.current || exportRequest.current)
            stop('The portal navigated. Review the page before continuing.');
        }}
        onError={() => {
          setPage(null);
          stop('The official portal could not load. Try again.');
        }}
        onMessage={e => {
          if (!isOfficialWorkUrl('echawadi', e.nativeEvent.url)) return;
          try {
            const value = JSON.parse(e.nativeEvent.data);
            if (value.channel !== 'lekhpal-echawadi-v1') return;
            if (value.type === 'document') {
              const request = exportRequest.current;
              exportRequest.current = null;
              if (timer.current) clearTimeout(timer.current);
              if (
                request &&
                value.id === request.id &&
                value.documentId === request.documentId &&
                value.url === request.url &&
                value.context === request.context &&
                typeof value.html === 'string' &&
                value.html.length <= 1500000
              ) {
                generatePDF({
                  html: value.html,
                  fileName: `Maharashtra-Form8B-Official-${Date.now()}`,
                  directory: 'Documents',
                })
                  .then(async result => {
                    if (!result.filePath) throw Error('Missing PDF');
                    if (active.current) {
                      setStatus('Official Form 8B PDF saved.');
                      await Share.open({
                        url: 'file://' + result.filePath,
                        type: 'application/pdf',
                        failOnCancel: false,
                      });
                    }
                  })
                  .catch(() => {
                    if (active.current)
                      setStatus('Official PDF could not be saved.');
                  })
                  .finally(() => {
                    if (active.current) setExporting(false);
                  });
              } else {
                setExporting(false);
                setStatus('The report changed. Export it again.');
              }
              return;
            }
            if (transaction.receive(value)) return;
            if (value.type === 'selected') {
              setPage(p => (p ? { ...p } : p));
              return;
            }
            if (value.type === 'error') {
              stop(String(value.message).slice(0, 500));
              return;
            }
            const parsed = echawadiSnapshotSchema.safeParse(value);
            if (
              parsed.success &&
              isOfficialWorkUrl('echawadi', parsed.data.url)
            ) {
              setPage(parsed.data);
              const loadedMode = echawadiMode(parsed.data.url);
              if (loadedMode && loadedMode !== mode) {
                stop();
                setReports([]);
                setMode(loadedMode);
              }
            }
          } catch {
            stop('The portal response could not be read.');
          }
        }}
      />
      <Modal
        visible={helper}
        animationType="slide"
        onRequestClose={() => setHelper(false)}
      >
        <AppScreen scroll={false}>
          <AppHeader
            title={t('Work settings', 'कार्य सेटिंग्स')}
            leftIconName="arrow-left"
            onLeftPress={() => setHelper(false)}
          />
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {button(
              t('Home / Login', 'होम / लॉगिन'),
              () => {
                stop();
                setPage(null);
                setReports([]);
                setSourceUrl('https://echawadi.mahabhumi.gov.in/');
                setHelper(false);
                web.current?.reload();
              },
              running,
            )}
            {(Object.keys(ECHAWADI_PAGES) as EchawadiMode[]).map(key =>
              button(ECHAWADI_PAGES[key][language], () => choose(key), running),
            )}
            {!!status && (
              <Text
                accessibilityRole="alert"
                style={[typography.body, { color: colors.text }]}
              >
                {status}
              </Text>
            )}
            {mode !== 'receipts' ? (
              <>
                <Text style={[typography.body, { color: colors.text }]}>
                  {t(
                    'Sign in and open the village report. Work starts at the currently displayed page.',
                    'लॉगिन करके गांव की रिपोर्ट खोलें। कार्य वर्तमान पेज से शुरू होगा।',
                  )}
                </Text>
                {mode === 'demand' && (
                  <>
                    <Text style={{ color: colors.text }}>
                      {t('Minimum demand amount (₹)', 'न्यूनतम मांग राशि (₹)')}
                    </Text>
                    <TextInput
                      accessibilityLabel="Minimum demand amount"
                      value={minimum}
                      onChangeText={setMinimum}
                      keyboardType="decimal-pad"
                      style={inputStyle}
                    />
                  </>
                )}
                <Text style={{ color: colors.text }}>
                  {t('Through page', 'अंतिम पेज')}
                </Text>
                <TextInput
                  accessibilityLabel="Through page"
                  value={through}
                  onChangeText={setThrough}
                  keyboardType="number-pad"
                  style={inputStyle}
                />
                {button(
                  mode === 'demand'
                    ? t('Prepare demand selection', 'मांग के रिकॉर्ड चुनें')
                    : t('Collect Form 8B pages', 'प्रपत्र 8बी पेज इकट्ठे करें'),
                  () => start(),
                  running,
                )}
                {mode === 'demand' &&
                  button(
                    t(
                      'Generate demand across selected pages',
                      'चुने हुए पेजों की मांग तैयार करें',
                    ),
                    () => {
                      const captured = page;
                      Alert.alert(
                        'Generate this demand batch?',
                        `Minimum ₹${minimum} · pages 1–${through}\n${
                          page?.context || ''
                        }\nSelect the matching records, submit demand and confirm the official demand dialog automatically.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Start',
                            onPress: () => {
                              if (currentPage.current !== captured) {
                                setStatus(
                                  'The page changed. Review the batch again.',
                                );
                                return;
                              }
                              start(true);
                            },
                          },
                        ],
                      );
                    },
                    running || transaction.busy,
                  )}
                {mode === 'form8b' &&
                  button(
                    t(
                      'Export collected table pages',
                      'इकट्ठे टेबल पेज निर्यात',
                    ),
                    () => {
                      exportReport();
                    },
                    running || exporting,
                  )}
                {mode === 'form8b' &&
                  button(
                    t(
                      'Export official Form 8B layout',
                      'आधिकारिक प्रपत्र 8बी PDF',
                    ),
                    () => {
                      if (!page || page.busy || page.mode !== 'form8b') {
                        setStatus('Open the official Form 8B report.');
                        return;
                      }
                      const request = {
                        id: `pdf-${Date.now()}`,
                        documentId: page.documentId,
                        context: page.context,
                        url: page.url,
                      };
                      exportRequest.current = request;
                      setExporting(true);
                      waitForPage();
                      web.current?.injectJavaScript(
                        echawadiScript(page, 'export', request.id),
                      );
                    },
                    running || exporting,
                  )}
                {mode === 'form8b' &&
                  button(
                    t(
                      'Use Form 8B accounts for payments',
                      'प्रपत्र 8बी के खाते भुगतान में लें',
                    ),
                    () => {
                      if (!page?.reportAccounts?.length) {
                        setStatus(
                          'A labelled account-number column is required in Form 8B.',
                        );
                        return;
                      }
                      setAccounts(page.reportAccounts);
                      setAccountText(page.reportAccounts.join('\n'));
                      setAccountIndex(0);
                      choose('receipts');
                    },
                    running || exporting,
                  )}
                {mode === 'form8b' && (
                  <Text style={{ color: colors.textMuted }}>
                    {reports.length} {t('pages collected', 'पेज इकट्ठे हुए')}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={[typography.body, { color: colors.text }]}>
                  {t(
                    'Add account numbers, one per line. Search and review each account; choose payment details and save on the official page.',
                    'खाता संख्याएं एक-एक पंक्ति में लिखें। प्रत्येक खाता खोजकर जांचें; भुगतान विवरण चुनकर आधिकारिक पेज पर सेव करें।',
                  )}
                </Text>
                <TextInput
                  accessibilityLabel="Receipt account numbers"
                  multiline
                  value={accountText}
                  onChangeText={setAccountText}
                  style={[inputStyle, styles.accounts]}
                />
                {button(t('Load accounts', 'खाते जोड़ें'), () => {
                  try {
                    setAccounts(receiptAccounts(accountText));
                    setAccountIndex(0);
                    setStatus('Account list ready.');
                  } catch (e) {
                    setStatus((e as Error).message);
                  }
                })}
                {accounts.length > 0 && (
                  <Text style={{ color: colors.text }}>
                    {accountIndex + 1}/{accounts.length}:{' '}
                    {accounts[accountIndex]}
                  </Text>
                )}
                {button(
                  t('Search current account', 'वर्तमान खाता खोजें'),
                  () => searchAccount(accountIndex),
                  !accounts.length || transaction.busy,
                )}
                {button(
                  t('Search next account', 'अगला खाता खोजें'),
                  () => searchAccount(accountIndex + 1),
                  accountIndex + 1 >= accounts.length || transaction.busy,
                )}
              </>
            )}
            {mode === 'receipts' &&
              button(
                t('Start Cash payment batch', 'नकद भुगतान बैच शुरू करें'),
                startReceipts,
                running || transaction.busy || !transaction.ready,
              )}
            {mode === 'receipts' &&
              button(
                t('Prepare Cash payment', 'नकद भुगतान चुनें'),
                () => {
                  if (page?.payment?.account)
                    web.current?.injectJavaScript(
                      echawadiScript(page, 'cash', page.payment.account),
                    );
                  else setStatus('Search and open an account first.');
                },
                running || transaction.busy,
              )}
            {mode !== 'form8b' &&
              button(
                t(
                  'Review and submit official record',
                  'जांचकर आधिकारिक रिकॉर्ड सेव करें',
                ),
                transaction.submit,
                running || transaction.busy || !transaction.ready,
              )}
            {transaction.history.length > 0 && (
              <Text style={[typography.label, { color: colors.text }]}>
                Transaction history
              </Text>
            )}
            {transaction.history.slice(0, 30).map(entry => (
              <React.Fragment key={entry.id}>
                <Text style={[typography.body, { color: colors.text }]}>
                  {entry.account || 'Demand'} · {entry.state} · {entry.at}
                  {'\n'}
                  {entry.context}
                  {'\n'}
                  {entry.message}
                </Text>
                {entry.state === 'uncertain' &&
                  button(
                    'Review interrupted action · ' + entry.id,
                    () => transaction.review(entry.id),
                    transaction.busy,
                  )}
              </React.Fragment>
            ))}
            {running &&
              button(t('Stop', 'रोकें'), () =>
                stop('Stopped. Review the current page.'),
              )}
            {button(t('Return to official page', 'आधिकारिक पेज पर लौटें'), () =>
              setHelper(false),
            )}
          </ScrollView>
        </AppScreen>
      </Modal>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  web: { flex: 1 },
  content: { padding: 18, gap: 14 },
  button: { padding: 15, borderWidth: 1, borderRadius: 12, minHeight: 48 },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 48,
  },
  accounts: { minHeight: 140, textAlignVertical: 'top' },
});
