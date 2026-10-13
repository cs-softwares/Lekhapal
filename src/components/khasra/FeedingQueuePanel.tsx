import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KhasraBulkTools from './KhasraBulkTools';
import { resolveImportedCrops } from '../../domain/khasraBulk';
import { reconcileCropPlan } from '../../domain/cropPlan';
import { officialContextError } from '../../domain/khasraAdvanced';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import {
  FeedingCommand,
  FeedingContext,
  FeedingReceipt,
  FeedingSnapshot,
  feedingScopeKey,
} from '../../domain/khasraFeeding';
import {
  FeedingQueue,
  QueueItem,
  activeQueueItem,
  addQueueGatas,
  emptyFeedingQueue,
  gataKey,
  gataRange,
  nextQueueItem,
  recoverFeedingQueue,
  updateQueueItem,
} from '../../domain/khasraQueue';

export type QueueCommand = Pick<
  FeedingCommand,
  'gata' | 'plotRef' | 'query' | 'actionRef'
> & { type: 'plot' | 'search' | 'page' };
type Props = {
  context: FeedingContext;
  snapshot: FeedingSnapshot | null;
  disabled: boolean;
  stopEpoch: number;
  receipt: FeedingReceipt | null;
  onCommand: (command: QueueCommand, label: string) => void;
  onActiveGata: (gata: string | undefined) => void;
  onPause: () => void;
  onRunningChange?: (running: boolean) => void;
  onActiveItem?: (item: QueueItem | undefined) => void;
  onStartBulk?: () => void;
  bulkStartError?: string | null;
  editingDisabled?: boolean;
  offline?: boolean;
  skipRequest?: { id: number; gata: string } | null;
};

export default function FeedingQueuePanel({
  context,
  snapshot,
  disabled,
  stopEpoch,
  receipt,
  onCommand,
  onActiveGata,
  onPause,
  onRunningChange,
  skipRequest,
  onActiveItem,
  onStartBulk,
  bulkStartError,
  editingDisabled = disabled,
  offline = false,
}: Props) {
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const t = useCallback(
    (en: string, hi: string) => (language === 'hi' ? hi : en),
    [language],
  );
  const scope = feedingScopeKey(context),
    storageKey = `${scope}-queue`;
  const [queue, setQueue] = useState<FeedingQueue>(() =>
    emptyFeedingQueue(scope),
  );
  const queueRef = useRef(queue);
  useEffect(() => {
    onRunningChange?.(queue.running);
    return () => onRunningChange?.(false);
  }, [queue.running, onRunningChange]);
  const [ready, setReady] = useState(false),
    [saving, setSaving] = useState(false);
  const [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [individual, setIndividual] = useState('');
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState(true);
  const latest = useRef({ snapshot, disabled, stopEpoch, scope });
  latest.current = { snapshot, disabled, stopEpoch, scope };
  const mounted = useRef(true),
    writes = useRef(Promise.resolve()),
    version = useRef(0);
  const listPages = useRef(new Set<string>()),
    listTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searched = useRef(''),
    handledReceipt = useRef(receipt?.id || '');
  const active = activeQueueItem(queue),
    next = nextQueueItem(queue);
  const skippedRequest = useRef<number | undefined>(undefined);

  const commit = useCallback(
    (value: FeedingQueue, afterSave?: () => void, onFailure?: () => void) => {
      const token = ++version.current;
      queueRef.current = value;
      setQueue(value);
      setSaving(true);
      writes.current = writes.current
        .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(value)))
        .then(() => {
          if (!mounted.current || token !== version.current) return;
          setSaving(false);
          afterSave?.();
        })
        .catch(() => {
          if (!mounted.current || token !== version.current) return;
          queueRef.current = { ...value, running: false };
          setQueue(queueRef.current);
          setSaving(false);
          setNotice(
            'Queue could not be saved. No further gata will be opened.',
          );
          onPause();
          onFailure?.();
        });
    },
    [storageKey, onPause],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (listTimer.current) clearTimeout(listTimer.current);
    };
  }, []);
  useEffect(() => {
    let current = true;
    version.current++;
    setReady(false);
    searched.current = '';
    listPages.current.clear();
    if (listTimer.current) clearTimeout(listTimer.current);
    AsyncStorage.getItem(storageKey)
      .then(raw => {
        if (!current) return;
        const saved = recoverFeedingQueue(raw, scope);
        queueRef.current = saved;
        setQueue(saved);
        setReady(true);
      })
      .catch(() => {
        if (current)
          setNotice(
            'Saved queue could not be read. Review or reset it before continuing.',
          );
      });
    return () => {
      current = false;
    };
  }, [scope, storageKey]);
  useEffect(() => {
    onActiveGata(active?.gata);
  }, [active?.gata, onActiveGata]);
  useEffect(() => {
    onActiveItem?.(active);
  }, [active, onActiveItem]);
  useEffect(() => {
    if (active?.gata) setExpanded(false);
  }, [active?.gata]);
  useEffect(() => {
    const current = queueRef.current;
    if (current.running) commit({ ...current, running: false });
  }, [stopEpoch, commit]);
  useEffect(() => {
    if (
      !skipRequest ||
      disabled ||
      saving ||
      !ready ||
      skippedRequest.current === skipRequest.id
    )
      return;
    skippedRequest.current = skipRequest.id;
    const current = queueRef.current,
      target = activeQueueItem(current);
    if (target && gataKey(target.gata) === gataKey(skipRequest.gata))
      commit(
        updateQueueItem(
          current,
          target.gata,
          'skipped',
          'Government-land skip rule.',
        ),
      );
  }, [skipRequest, disabled, saving, ready, commit]);

  useEffect(() => {
    if (!receipt || receipt.id === handledReceipt.current) return;
    handledReceipt.current = receipt.id;
    const current = queueRef.current;
    const target = activeQueueItem(current) || nextQueueItem(current);
    if (
      !receipt.gata ||
      feedingScopeKey(receipt.context) !== scope ||
      !target ||
      gataKey(target.gata) !== gataKey(receipt.gata)
    )
      return;
    if (receipt.outcome === 'failed' || receipt.outcome === 'uncertain') {
      commit({
        ...updateQueueItem(current, receipt.gata, 'uncertain', receipt.message),
        running: false,
      });
      onPause();
    } else if (
      receipt.actionKind === 'lock' &&
      receipt.outcome === 'portal-success' &&
      ['opening', 'active'].includes(target.status)
    ) {
      const confirmed = updateQueueItem(
        current,
        receipt.gata,
        'reviewed',
        'Portal reported lock success.',
      );
      confirmed.items = confirmed.items.map(item =>
        gataKey(item.gata) === gataKey(receipt.gata!)
          ? {
              ...item,
              confirmation: { id: receipt.id, at: receipt.at },
              updatedAt: receipt.at,
            }
          : item,
      );
      commit(confirmed);
    }
  }, [receipt, scope, commit, onPause]);

  useEffect(() => {
    if (
      !ready ||
      saving ||
      disabled ||
      !snapshot ||
      !queue.running ||
      snapshot.busy
    )
      return;
    const mismatch = officialContextError(
      snapshot,
      context,
      !!(active || next)?.plan,
    );
    if (mismatch) {
      setNotice(mismatch);
      commit({ ...queue, running: false });
      onPause();
      return;
    }
    if (['login', 'other'].includes(snapshot.stage) || snapshot.unsupported) {
      commit({ ...queue, running: false });
      onPause();
      return;
    }
    if (active) {
      if (
        snapshot.plotIdentity &&
        gataKey(snapshot.plotIdentity) !== gataKey(active.gata)
      ) {
        commit({
          ...updateQueueItem(
            queue,
            active.gata,
            'uncertain',
            'The official page shows a different gata.',
          ),
          running: false,
        });
        onPause();
        return;
      }
      if (active.status === 'opening' && snapshot.stage !== 'list')
        commit(updateQueueItem(queue, active.gata, 'active'));
      // Returning to the list is not evidence of a successful save. The user
      // can confirm completion, skip, or wait for a matching lock-success result.
      return;
    }
    if (!next) {
      // Let the final confirmed lock return to the list before stopping the
      // parent controller; it needs to remain running for that navigation.
      if (snapshot.stage === 'list') {
        setNotice(
          t(
            'Queue complete. Check the daily work report.',
            'कार्य सूची पूरी हुई। दैनिक कार्य रिपोर्ट देखें।',
          ),
        );
        commit({ ...queue, running: false });
        onPause();
      }
      return;
    }
    if (snapshot.stage !== 'list') return;
    const matches = (snapshot.plots || []).filter(
      plot => gataKey(plot.gata) === gataKey(next.gata),
    );
    if (matches.length > 1) {
      setNotice(
        'Multiple rows have this gata number. Review the official list.',
      );
      commit({ ...queue, running: false });
      return;
    }
    const plot = matches[0];
    if (plot && listTimer.current) {
      clearTimeout(listTimer.current);
      listTimer.current = null;
    }
    if (plot?.status === 'locked' || plot?.status === 'completed') {
      commit(
        updateQueueItem(
          queue,
          next.gata,
          'skipped',
          `Official list: ${plot.status}`,
        ),
      );
      return;
    }
    if (plot?.status === 'available') {
      setNotice('');
      const before = latest.current;
      commit(updateQueueItem(queue, next.gata, 'opening'), () => {
        const now = latest.current;
        if (
          now.disabled ||
          now.stopEpoch !== before.stopEpoch ||
          now.scope !== before.scope ||
          now.snapshot?.documentId !== snapshot.documentId ||
          now.snapshot?.revision !== snapshot.revision ||
          now.snapshot?.url !== snapshot.url
        ) {
          commit({
            ...updateQueueItem(queueRef.current, next.gata, 'queued'),
            running: false,
          });
          return;
        }
        onCommand(
          { type: 'plot', plotRef: plot.ref, gata: plot.gata },
          `Open gata ${plot.gata}`,
        );
      });
    } else if (snapshot.listSearch && searched.current !== gataKey(next.gata)) {
      searched.current = gataKey(next.gata);
      listPages.current.clear();
      setNotice(
        'Waiting for the exact gata in the filtered list. If it is absent, skip it or check the next list page.',
      );
      onCommand(
        { type: 'search', query: next.gata, gata: next.gata },
        `Search gata ${next.gata}`,
      );
    } else if (snapshot.listPagination) {
      const pager = snapshot.listPagination;
      const key = `${snapshot.documentId}:${gataKey(next.gata)}:${pager.key}:${
        snapshot.listSearch?.value || ''
      }`;
      if (listPages.current.has(key)) return;
      if (listTimer.current) clearTimeout(listTimer.current);
      if (!pager.nextRef || listPages.current.size >= 500) {
        setNotice(
          'This gata was not found before the end of the available list. Review or skip it.',
        );
        commit({ ...queue, running: false });
        onPause();
        return;
      }
      listPages.current.add(key);
      setNotice(
        `Looking for gata ${next.gata} on the next official list page.`,
      );
      onCommand(
        { type: 'page', actionRef: pager.nextRef, gata: next.gata },
        `Next list page for gata ${next.gata}`,
      );
      listTimer.current = setTimeout(() => {
        if (!mounted.current || !queueRef.current.running) return;
        setNotice('The gata list did not advance. Review the official page.');
        commit({ ...queueRef.current, running: false });
        onPause();
      }, 25000);
    }
  }, [
    queue,
    context,
    active,
    next,
    ready,
    saving,
    disabled,
    snapshot,
    commit,
    onCommand,
    onPause,
    t,
  ]);

  useEffect(() => {
    if (active?.status !== 'opening' || !queue.running) return;
    const gata = active.gata;
    const timer = setTimeout(() => {
      const current = queueRef.current;
      if (activeQueueItem(current)?.status !== 'opening') return;
      commit({
        ...updateQueueItem(
          current,
          gata,
          'uncertain',
          'The plot page did not open. Check the official page.',
        ),
        running: false,
      });
      onPause();
    }, 25000);
    return () => clearTimeout(timer);
  }, [active?.gata, active?.status, queue.running, commit, onPause]);

  const changeItems = (gatas: string[]) => {
    try {
      commit(addQueueGatas(queueRef.current, gatas));
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Invalid gata list');
    }
  };
  const finish = (status: 'reviewed' | 'skipped', expectedGata?: string) => {
    const current = queueRef.current,
      target = activeQueueItem(current) || nextQueueItem(current);
    if (
      !mounted.current ||
      !target ||
      latest.current.disabled ||
      (expectedGata && gataKey(target.gata) !== gataKey(expectedGata))
    )
      return;
    commit(
      updateQueueItem(
        current,
        target.gata,
        status,
        status === 'reviewed'
          ? 'Operator marked reviewed; verify official record.'
          : 'Skipped by operator.',
      ),
    );
    searched.current = '';
    listPages.current.clear();
    if (listTimer.current) clearTimeout(listTimer.current);
    if (snapshot?.stage !== 'list')
      setNotice(
        t(
          'Return to the official gata list to continue with the next plot.',
          'अगले गाटे के लिए आधिकारिक गाटा सूची पर लौटें।',
        ),
      );
  };
  const archiveQueue = () => {
    onPause();
    setSaving(true);
    const previous = queueRef.current;
    writes.current = writes.current
      .then(async () => {
        if (previous.items.length)
          await AsyncStorage.setItem(
            `${scope}-queue-archive-${previous.id || 'legacy'}`,
            JSON.stringify({ ...previous, running: false }),
          );
      })
      .then(() => {
        if (!mounted.current) return;
        setReady(true);
        commit(emptyFeedingQueue(scope));
      })
      .catch(() => {
        setSaving(false);
        setNotice('The queue could not be archived. Existing work was kept.');
      });
  };
  const button = (label: string, action: () => void, unavailable = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={unavailable}
      onPress={action}
      style={[
        styles.button,
        { borderColor: colors.primary },
        unavailable && styles.disabled,
      ]}
    >
      <Text style={{ color: colors.primary }}>{label}</Text>
    </Pressable>
  );
  const inputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.border },
  ];
  const editable = ready && !saving && !editingDisabled && !queue.running;
  const counts = queue.items.reduce<Record<string, number>>(
    (out, item) => ({ ...out, [item.status]: (out[item.status] || 0) + 1 }),
    {},
  );

  if (offline)
    return (
      <View style={[styles.panel, { borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('Prepare work before login', 'लॉगिन से पहले कार्य तैयार करें')}
        </Text>
        <Text style={{ color: colors.textMuted }}>
          {queue.items.length}{' '}
          {t(
            'saved plots · this village and season',
            'सेव गाटे · इस गांव और सीजन के',
          )}
        </Text>
        <KhasraBulkTools
          context={context}
          queue={queue}
          editable={editable}
          onImport={(value, done) =>
            commit(
              value,
              () => done(),
              () => done('Queue could not be saved. Check device storage.'),
            )
          }
        />
        {!!queue.items.length &&
          button(
            t('Archive and clear queue', 'सूची संग्रहित करके खाली करें'),
            () =>
              Alert.alert(
                t('Archive queue?', 'सूची संग्रहित करें?'),
                t(
                  'Existing work stays in Daily work report. No official record is changed.',
                  'कार्य दैनिक रिपोर्ट में रहेगा। सरकारी रिकॉर्ड नहीं बदलेंगे।',
                ),
                [
                  { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
                  {
                    text: t('Archive', 'संग्रहित करें'),
                    onPress: archiveQueue,
                  },
                ],
              ),
            !editable,
          )}
        {!!notice && (
          <Text accessibilityRole="alert" style={{ color: colors.text }}>
            {notice}
          </Text>
        )}
      </View>
    );

  return (
    <View style={[styles.panel, { borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('Gata work queue', 'गाटा कार्य सूची')}
      </Text>
      <KhasraBulkTools
        context={context}
        queue={queue}
        editable={editable}
        onImport={(value, done) =>
          commit(
            value,
            () => done(),
            () =>
              done(
                'Queue could not be saved. Retry after checking device storage.',
              ),
          )
        }
      />
      {button(
        expanded
          ? t('Hide queue setup', 'कार्य सूची सेटअप छिपाएं')
          : t('Show queue setup', 'कार्य सूची सेटअप दिखाएं'),
        () => setExpanded(!expanded),
      )}
      {expanded && (
        <>
          <Text style={{ color: colors.textMuted }}>
            {t(
              'Choose individual gatas or a numeric range. The official list is searched with an exact match.',
              'गाटे चुनें या संख्या की सीमा दें। आधिकारिक सूची में सटीक गाटा खोजा जाएगा।',
            )}
          </Text>
          <View style={styles.row}>
            <TextInput
              accessibilityLabel="Gata range from"
              placeholder={t('From', 'से')}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={from}
              onChangeText={setFrom}
              editable={editable}
              style={[inputStyle, styles.flex]}
            />
            <TextInput
              accessibilityLabel="Gata range to"
              placeholder={t('To', 'तक')}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={to}
              onChangeText={setTo}
              editable={editable}
              style={[inputStyle, styles.flex]}
            />
          </View>
          {button(
            t('Add range', 'सीमा जोड़ें'),
            () => {
              try {
                changeItems(gataRange(from, to));
              } catch (error) {
                setNotice((error as Error).message);
              }
            },
            !editable,
          )}
          <TextInput
            accessibilityLabel="Individual gata numbers"
            placeholder={t(
              'Gatas, e.g. 12, 12/1, 13क',
              'गाटे, जैसे 12, 12/1, 13क',
            )}
            placeholderTextColor={colors.textMuted}
            value={individual}
            onChangeText={setIndividual}
            editable={editable}
            style={inputStyle}
          />
          <View style={styles.row}>
            {button(
              t('Add gatas', 'गाटे जोड़ें'),
              () =>
                changeItems(
                  individual
                    .split(/[,\n]+/)
                    .map(s => s.trim())
                    .filter(Boolean),
                ),
              !editable || !individual.trim(),
            )}
            {button(
              t(
                'Add available gatas on this page',
                'इस पेज के उपलब्ध गाटे जोड़ें',
              ),
              () =>
                changeItems(
                  (snapshot?.plots || [])
                    .filter(p => p.status === 'available')
                    .map(p => p.gata),
                ),
              !editable ||
                !snapshot?.plots?.some(p => p.status === 'available'),
            )}
          </View>
        </>
      )}
      <Text style={{ color: colors.text }}>
        {queue.items.length} {t('total', 'कुल')} · {counts.queued || 0}{' '}
        {t('queued', 'बाकी')} · {counts.reviewed || 0} {t('reviewed', 'जांचे')}{' '}
        · {counts.skipped || 0} {t('skipped', 'छोड़े')}
      </Text>
      {(active || next) && (
        <Text style={{ color: colors.text }}>
          {active
            ? t('Current gata', 'वर्तमान गाटा')
            : t('Next gata', 'अगला गाटा')}
          : {(active || next)?.gata}
          {active?.note ? ` · ${active.note}` : ''}
        </Text>
      )}
      {!!notice && (
        <Text accessibilityRole="alert" style={{ color: colors.text }}>
          {notice}
        </Text>
      )}
      <View style={styles.row}>
        {button(
          queue.running
            ? t('Pause queue', 'कार्य सूची रोकें')
            : t('Start / resume queue', 'कार्य सूची शुरू / जारी करें'),
          () => {
            if (queue.running) {
              commit({ ...queue, running: false });
              onPause();
              return;
            }
            const bulk =
              !!onStartBulk &&
              queue.items.some(
                i =>
                  i.plan && ['queued', 'active', 'opening'].includes(i.status),
              );
            if (
              bulk &&
              (bulkStartError ||
                queue.items.some(
                  i =>
                    !i.plan &&
                    ['queued', 'active', 'opening'].includes(i.status),
                ))
            ) {
              setNotice(
                bulkStartError ||
                  'Use a queue containing only imported plots for automatic per-plot feeding.',
              );
              return;
            }
            const before = latest.current;
            Alert.alert(
              t('Start this gata queue?', 'यह गाटा कार्य सूची शुरू करें?'),
              `${context.year} · ${context.season} · ${context.village} (${
                context.villageCode
              })\n\n${
                bulk
                  ? 'Imported feeding will fill and save each plot using its own reviewed crop areas. Other sections use your configured rules/presets. Final locking uses the switch in Work settings. Login and CAPTCHA remain manual.\n\n'
                  : ''
              }${t(
                'Check that these match the official page. Each gata opens in order. Review its entries, then return to the list for the next gata.',
                'आधिकारिक पेज पर यही विवरण जांचें। गाटे क्रम से खुलेंगे। प्रविष्टियां जांचकर अगले गाटे के लिए सूची पर लौटें।',
              )}`,
              [
                { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
                {
                  text: t('Start queue', 'कार्य सूची शुरू करें'),
                  onPress: () => {
                    const now = latest.current;
                    if (
                      now.disabled ||
                      now.stopEpoch !== before.stopEpoch ||
                      now.scope !== before.scope ||
                      now.snapshot?.documentId !==
                        before.snapshot?.documentId ||
                      now.snapshot?.revision !== before.snapshot?.revision ||
                      now.snapshot?.url !== before.snapshot?.url
                    )
                      return;
                    searched.current = '';
                    listPages.current.clear();
                    if (listTimer.current) clearTimeout(listTimer.current);
                    commit({ ...queueRef.current, running: true }, () => {
                      const afterWrite = latest.current;
                      if (
                        afterWrite.stopEpoch !== before.stopEpoch ||
                        afterWrite.scope !== before.scope
                      )
                        return;
                      if (bulk) onStartBulk?.();
                    });
                  },
                },
              ],
            );
          },
          !ready ||
            saving ||
            disabled ||
            (!active && !next) ||
            active?.status === 'uncertain' ||
            !snapshot ||
            ['login', 'other'].includes(snapshot.stage),
        )}
        {button(
          t('Skip current / next gata', 'वर्तमान / अगला गाटा छोड़ें'),
          () => finish('skipped'),
          !ready || saving || disabled || (!active && !next),
        )}
        {active?.plan &&
          active.status === 'uncertain' &&
          button(
            t('Check and resume imported plot', 'आयातित गाटा जांचकर जारी करें'),
            () => {
              const page = latest.current.snapshot;
              try {
                if (
                  !page ||
                  page.stage !== 'crop' ||
                  !page.plotIdentity ||
                  gataKey(page.plotIdentity) !== gataKey(active.gata)
                )
                  throw Error(
                    'Open this Gata’s official crop page to reconcile saved rows.',
                  );
                const mismatch = officialContextError(page, context, true);
                if (mismatch) throw Error(mismatch);
                const crops = resolveImportedCrops(active.plan!, page);
                const recovered = reconcileCropPlan(page, crops, page.plotArea);
                if (typeof recovered !== 'number')
                  throw Error(
                    typeof recovered === 'string'
                      ? recovered
                      : 'The official crop table is unavailable.',
                  );
                const before = latest.current;
                Alert.alert(
                  'Resume this imported plot?',
                  `${recovered} of ${crops.length} crop rows match the official table. The next start will feed only remaining rows.`,
                  [
                    { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
                    {
                      text: t('Allow resume', 'जारी रखने दें'),
                      onPress: () => {
                        const now = latest.current;
                        if (
                          now.disabled ||
                          now.stopEpoch !== before.stopEpoch ||
                          now.snapshot !== page
                        )
                          return;
                        commit(
                          updateQueueItem(
                            queueRef.current,
                            active.gata,
                            'active',
                            'Official crop rows reconciled by operator; awaiting resume.',
                          ),
                        );
                      },
                    },
                  ],
                );
              } catch (e) {
                setNotice((e as Error).message);
              }
            },
            saving || disabled || queue.running,
          )}
        {active &&
          button(
            t('Mark gata reviewed', 'गाटा जांचा हुआ चिह्नित करें'),
            () =>
              Alert.alert(
                t('Official record checked?', 'आधिकारिक रिकॉर्ड जांच लिया?'),
                t(
                  'This updates your local work queue. Check the saved official record before marking the gata reviewed.',
                  'यह स्थानीय कार्य सूची अपडेट करेगा। गाटा जांचा हुआ चिह्नित करने से पहले आधिकारिक सेव रिकॉर्ड जांचें।',
                ),
                [
                  { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
                  {
                    text: t('Mark reviewed', 'जांचा हुआ चिह्नित करें'),
                    onPress: () => finish('reviewed', active.gata),
                  },
                ],
              ),
            saving || disabled,
          )}
        {button(
          t('Reset queue', 'कार्य सूची रीसेट करें'),
          () =>
            Alert.alert(
              t('Reset local queue?', 'स्थानीय कार्य सूची रीसेट करें?'),
              t(
                'The official records stay unchanged.',
                'आधिकारिक रिकॉर्ड वैसे ही रहेंगे।',
              ),
              [
                { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
                {
                  text: t('Reset', 'रीसेट'),
                  onPress: archiveQueue,
                },
              ],
            ),
          queue.running || saving || editingDisabled,
        )}
      </View>
      {expanded &&
        queue.items.slice(0, 12).map(item => (
          <Text key={gataKey(item.gata)} style={{ color: colors.textMuted }}>
            {item.gata} ·{' '}
            {t(
              {
                queued: 'Queued',
                opening: 'Opening',
                active: 'In progress',
                reviewed: 'Reviewed',
                skipped: 'Skipped',
                uncertain: 'Check record',
              }[item.status],
              {
                queued: 'बाकी',
                opening: 'खुल रहा है',
                active: 'कार्य जारी',
                reviewed: 'जांचा',
                skipped: 'छोड़ा',
                uncertain: 'रिकॉर्ड जांचें',
              }[item.status],
            )}
          </Text>
        ))}
      {expanded && queue.items.length > 12 && (
        <Text style={{ color: colors.textMuted }}>
          +{queue.items.length - 12} {t('more gatas', 'अन्य गाटे')}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  title: { fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 8, padding: 10 },
  flex: { flex: 1 },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});
