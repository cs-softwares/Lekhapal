import React, { useEffect, useState } from 'react';
import {
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
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { FeedingContext } from '../../domain/khasraFeeding';
import {
  FeedingQueue,
  QueueItem,
  feedingQueueSchema,
} from '../../domain/khasraQueue';
import {
  filterReport,
  importKhasraBulk,
  khasraReportCsv,
  khasraReportHtml,
  khasraReportParts,
  localDay,
  parseKhasraBulk,
  reportStatus,
} from '../../domain/khasraBulk';
import {
  exportDocumentPdf,
  generateDocumentPdf,
  saveKhasraCsv,
} from '../../native/workFiles';

type Props = {
  context: FeedingContext;
  queue: FeedingQueue;
  editable: boolean;
  onImport: (queue: FeedingQueue, done: (error?: string) => void) => void;
};
export default function KhasraBulkTools({
  context,
  queue,
  editable,
  onImport,
}: Props) {
  const { colors } = useAppTheme();
  const { language } = useLanguage();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const [mode, setMode] = useState<'import' | 'report' | null>(null);
  const [raw, setRaw] = useState('');
  const [review, setReview] = useState<ReturnType<
    typeof parseKhasraBulk
  > | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [day, setDay] = useState(localDay(new Date().toISOString()));
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  useEffect(() => {
    let current = true;
    if (!mode) return;
    setNotice('');
    setFiles([]);
    setHistoryReady(false);
    setDraftReady(false);
    const read = async () => {
      if (mode === 'import') {
        const draft = await AsyncStorage.getItem(`${queue.scope}-bulk-draft`);
        if (current) {
          setRaw(draft || '');
          setReview(null);
          setDraftReady(true);
        }
      } else {
        const keys = (await AsyncStorage.getAllKeys()).filter(k =>
          k.startsWith(`${queue.scope}-queue-archive-`),
        );
        const batches = await Promise.all(
          keys.map(k => AsyncStorage.getItem(k)),
        );
        const items = batches.flatMap(value => {
          const saved = feedingQueueSchema.parse(JSON.parse(value || 'null'));
          if (saved.scope !== queue.scope)
            throw Error('Report context mismatch.');
          return saved.id === queue.id ? [] : saved.items;
        });
        if (current) {
          setHistory(items);
          setHistoryReady(true);
        }
      }
    };
    read().catch(() => {
      if (current)
        setNotice(
          'Saved data could not be read. Close and retry; no data was replaced.',
        );
    });
    return () => {
      current = false;
    };
  }, [mode, queue.scope, queue.id]);
  const filtered = filterReport(
    [...history, ...queue.items],
    day,
    query,
    status,
  );
  const action = (label: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={[
        styles.button,
        { borderColor: colors.primary, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <Text style={{ color: colors.primary, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
  const inputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.border },
  ];
  async function work(fn: () => Promise<void>) {
    setBusy(true);
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <View style={styles.row}>
        {action(
          t('Import plot data', 'गाटा डेटा आयात'),
          () => setMode('import'),
          !editable,
        )}
        {action(t('Daily work report', 'दैनिक कार्य रिपोर्ट'), () =>
          setMode('report'),
        )}
      </View>
      <Modal
        visible={!!mode}
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setMode(null);
        }}
      >
        <View style={[styles.page, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <Text style={[styles.title, { color: '#FFFFFF' }]}>
              {mode === 'import'
                ? t('Per-plot crop plan', 'गाटा अनुसार फसल योजना')
                : t('Daily work report', 'दैनिक कार्य रिपोर्ट')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Close', 'बंद करें')}
              disabled={busy}
              onPress={() => setMode(null)}
              style={styles.close}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                {t('Close', 'बंद करें')}
              </Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <Text style={{ color: colors.text }}>
              {context.village} ({context.villageCode}) · {context.year} ·{' '}
              {context.season} · UP
            </Text>
            {mode === 'import' ? (
              <>
                <Text style={{ color: colors.textMuted }}>
                  {t(
                    'Paste four columns from Excel, or separate with | or comma: Gata, Crop, Area_ha, Irrigation. Use the official crop name and Yes / No. One row per crop; repeat Gata for multiple crops. Areas are hectares (up to 4 decimals).',
                    'Excel की चार कॉलम पेस्ट करें या | से अलग करें: गाटा, फसल, क्षेत्रफल, सिंचाई। आधिकारिक फसल नाम और सिंचित / असिंचित लिखें। हर फसल की अलग पंक्ति; एक गाटे की कई फसलों के लिए गाटा दोहराएं। क्षेत्रफल हेक्टेयर में (4 दशमलव तक)।',
                  )}
                </Text>
                <Text style={{ color: colors.textMuted }}>
                  Gata | Crop | Area_ha | Irrigation
                </Text>
                <TextInput
                  accessibilityLabel="Bulk plot data"
                  multiline
                  textAlignVertical="top"
                  value={raw}
                  onChangeText={v => {
                    setRaw(v);
                    setReview(null);
                    setNotice('');
                  }}
                  editable={!busy && draftReady}
                  maxLength={600001}
                  style={[inputStyle, styles.paste]}
                  placeholder="12/1 | धान | 0.2500 | Yes"
                  placeholderTextColor={colors.textMuted}
                />
                <View style={styles.row}>
                  {action(
                    t('Save draft', 'ड्राफ्ट सेव करें'),
                    () =>
                      work(async () => {
                        await AsyncStorage.setItem(
                          `${queue.scope}-bulk-draft`,
                          raw,
                        );
                        setNotice(
                          t(
                            'Draft saved on this device.',
                            'ड्राफ्ट इस फोन में सेव हुआ।',
                          ),
                        );
                      }),
                    busy || !draftReady,
                  )}
                  {action(
                    t('Validate and review', 'जांचें और समीक्षा करें'),
                    () => {
                      setReview(parseKhasraBulk(raw));
                      setNotice('');
                    },
                    busy,
                  )}
                </View>
                {review && (
                  <>
                    <Text style={{ color: colors.text }}>
                      {review.rows} {t('crop rows', 'फसल पंक्तियां')} ·{' '}
                      {review.plots.length} {t('plots', 'गाटे')} ·{' '}
                      {review.errors.length} {t('errors', 'त्रुटियां')}
                    </Text>
                    {review.errors.slice(0, 100).map((error, i) => (
                      <Text
                        key={i}
                        accessibilityRole="alert"
                        style={{ color: colors.text }}
                      >
                        Row {error.row}: {error.message}
                      </Text>
                    ))}
                    {review.errors.length > 100 && (
                      <Text style={{ color: colors.text }}>
                        Correct these errors and validate again to see the
                        remaining rows.
                      </Text>
                    )}
                    <Text style={{ color: colors.textMuted }}>
                      {t(
                        'Edit the pasted rows above and validate again to correct or remove a row. Official crop choices, full available crop area and village/season are checked on each portal form before feeding. Import does not submit records.',
                        'सुधार या हटाने के लिए ऊपर पंक्ति बदलकर दोबारा जांचें। फीडिंग से पहले आधिकारिक फसल विकल्प, उपलब्ध क्षेत्रफल और गांव/सीजन जांचे जाएंगे। आयात करने से सरकारी रिकॉर्ड सबमिट नहीं होंगे।',
                      )}
                    </Text>
                    {review.plots.slice(0, 50).map(plot => (
                      <View
                        key={plot.gata}
                        style={[styles.card, { borderColor: colors.border }]}
                      >
                        <Text style={{ color: colors.text, fontWeight: '700' }}>
                          Gata {plot.gata}
                        </Text>
                        {plot.plan.map(p => (
                          <Text
                            key={p.sourceRow}
                            style={{ color: colors.text }}
                          >
                            {p.crop} · {p.area} ha ·{' '}
                            {p.irrigated
                              ? t('Irrigated', 'सिंचित')
                              : t('Unirrigated', 'असिंचित')}
                          </Text>
                        ))}
                      </View>
                    ))}
                    {review.plots.length > 50 && (
                      <Text style={{ color: colors.text }}>
                        Preview shows the first 50 plots. All{' '}
                        {review.plots.length} plots are validated; export the
                        queue report to review every plot before starting.
                      </Text>
                    )}
                    {action(
                      t(
                        'Add reviewed plots to queue',
                        'जांचे गाटे सूची में जोड़ें',
                      ),
                      () => {
                        try {
                          const next = importKhasraBulk(queue, review);
                          setBusy(true);
                          onImport(next, error => {
                            setBusy(false);
                            if (error) setNotice(error);
                            else setMode(null);
                          });
                          // Queue owns the durable write; an error is surfaced there.
                        } catch (e) {
                          setNotice((e as Error).message);
                        }
                      },
                      busy ||
                        !editable ||
                        !!review.errors.length ||
                        !review.plots.length,
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <Text style={{ color: colors.textMuted }}>
                  {t(
                    'This village and season, including archived queues. Dates use this device’s calendar. Confirmed = portal lock success. Manual review is not counted as confirmed. Reports describe local activity, not government certification.',
                    'इस गांव और सीजन की पुरानी सूचियां भी शामिल हैं। तारीख फोन के कैलेंडर अनुसार है। पुष्टि = पोर्टल पर लॉक सफल। केवल मैन्युअल समीक्षा को पुष्टि नहीं गिना जाता। यह स्थानीय कार्य रिपोर्ट है, सरकारी प्रमाण नहीं।',
                  )}
                </Text>
                <TextInput
                  accessibilityLabel="Report date"
                  placeholder="YYYY-MM-DD (blank = all dates)"
                  placeholderTextColor={colors.textMuted}
                  value={day}
                  onChangeText={setDay}
                  style={inputStyle}
                  editable={!busy}
                />
                <View style={styles.row}>
                  {action(
                    t('Today', 'आज'),
                    () => setDay(localDay(new Date().toISOString())),
                    busy,
                  )}
                  {action(
                    t('All dates', 'सभी तारीखें'),
                    () => setDay(''),
                    busy,
                  )}
                </View>
                <TextInput
                  accessibilityLabel="Search report"
                  placeholder={t(
                    'Search Gata, crop or reason',
                    'गाटा, फसल या कारण खोजें',
                  )}
                  placeholderTextColor={colors.textMuted}
                  value={query}
                  onChangeText={setQuery}
                  style={inputStyle}
                  editable={!busy}
                />
                <View style={styles.row}>
                  {['', 'Confirmed', 'Skipped', 'Needs review', 'Pending'].map(
                    s => (
                      <React.Fragment key={s}>
                        {action(
                          `${status === s ? '✓ ' : ''}${
                            s || t('All statuses', 'सभी स्थितियां')
                          }`,
                          () => setStatus(s),
                          busy,
                        )}
                      </React.Fragment>
                    ),
                  )}
                </View>
                <Text style={{ color: colors.text }}>
                  {filtered.length} {t('plots match', 'गाटे मिले')} ·{' '}
                  {filtered.filter(i => reportStatus(i) === 'Confirmed').length}{' '}
                  confirmed ·{' '}
                  {
                    filtered.filter(i => reportStatus(i) === 'Needs review')
                      .length
                  }{' '}
                  need review
                </Text>
                <View style={styles.row}>
                  {action(
                    t('Export CSV to Downloads', 'CSV डाउनलोड में सेव'),
                    () =>
                      work(async () => {
                        await saveKhasraCsv(
                          `Lekhpal-Khasra-${Date.now()}.csv`,
                          khasraReportCsv(context, filtered),
                        );
                        setNotice('CSV saved in Downloads/Lekhpal.');
                      }),
                    busy || !historyReady || !filtered.length,
                  )}
                  {action(
                    t('Generate PDF report', 'PDF रिपोर्ट बनाएं'),
                    () =>
                      work(async () => {
                        const created: string[] = [];
                        setFiles([]);
                        const parts = khasraReportParts(context, filtered, day);
                        for (let i = 0; i < parts.length; i++) {
                          const path = await generateDocumentPdf(
                            `Lekhpal-Khasra-${Date.now()}-${i + 1}`,
                            khasraReportHtml(context, parts[i], day, i + 1),
                          );
                          created.push(path);
                          setFiles([...created]);
                        }
                        setNotice(
                          `${created.length} PDF file(s) ready. Each contains up to 30 plots.`,
                        );
                      }),
                    busy || !historyReady || !filtered.length,
                  )}
                </View>
                {files.length > 0 && (
                  <View style={styles.row}>
                    {action(
                      t('Share PDFs', 'PDF साझा करें'),
                      () =>
                        work(async () => {
                          await Share.open({
                            urls: files.map(p => `file://${p}`),
                            type: 'application/pdf',
                            failOnCancel: false,
                          });
                        }),
                      busy,
                    )}
                    {action(
                      t('Save PDFs to Downloads', 'PDF डाउनलोड में सेव'),
                      () =>
                        work(async () => {
                          for (const file of files)
                            await exportDocumentPdf(file);
                          setNotice('PDF reports saved in Downloads/Lekhpal.');
                        }),
                      busy,
                    )}
                  </View>
                )}
                {filtered.slice(0, 100).map((item, i) => (
                  <View
                    key={i}
                    style={[styles.card, { borderColor: colors.border }]}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {item.gata} · {reportStatus(item)}
                    </Text>
                    <Text style={{ color: colors.textMuted }}>
                      {item.note || 'Awaiting work'}
                      {'\n'}
                      {item.updatedAt || item.createdAt || 'Date unavailable'}
                    </Text>
                  </View>
                ))}
                {filtered.length > 100 && (
                  <Text style={{ color: colors.text }}>
                    Showing 100; exports include all {filtered.length} matching
                    plots.
                  </Text>
                )}
              </>
            )}
            {!!notice && (
              <Text accessibilityRole="alert" style={{ color: colors.text }}>
                {notice}
              </Text>
            )}
            {busy && (
              <Text style={{ color: colors.text }}>
                {t('Saving…', 'सेव हो रहा है…')}
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 28 },
  header: { padding: 16, gap: 10, flexDirection: 'row', alignItems: 'center' },
  close: {
    padding: 12,
    minHeight: 46,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 8,
  },
  title: { flex: 1, fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 46 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
    fontSize: 16,
  },
  paste: { minHeight: 180 },
  card: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 6 },
});
