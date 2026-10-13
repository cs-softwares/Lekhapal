import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AppPressable from '../AppPressable';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import {
  registerReportEditor,
  ReportDetails,
  ReportDraft,
  EditedReport,
} from '../../services/reportEditor';
import { buildReportHtml } from '../../utils/reportHtml';
const empty: ReportDetails = {
  owner: '',
  village: '',
  plot: '',
  client: '',
  notes: '',
};
export default function ReportComposer() {
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const hi = language === 'hi';
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState(empty);
  const [preview, setPreview] = useState(false);
  const resolve = useRef<((value: EditedReport | null) => void) | null>(null);
  const finish = (value: EditedReport | null) => {
    resolve.current?.(value);
    resolve.current = null;
    setDraft(null);
  };
  useEffect(() => {
    registerReportEditor(
      value =>
        new Promise(done => {
          resolve.current?.(null);
          resolve.current = done;
          setTitle(value.title);
          setDetails({ ...empty, ...value.details });
          setPreview(false);
          setDraft(value);
        }),
    );
    return () => {
      registerReportEditor(null);
      resolve.current?.(null);
    };
  }, []);
  if (!draft) return null;
  const labels: Record<keyof ReportDetails, string> = hi
    ? {
        owner: 'स्वामी का नाम',
        village: 'गांव',
        plot: 'भूखंड / गाटा',
        client: 'ग्राहक',
        notes: 'टिप्पणी',
      }
    : {
        owner: 'Owner name',
        village: 'Village',
        plot: 'Plot / Gata',
        client: 'Client',
        notes: 'Notes',
      };
  return (
    <Modal visible animationType="slide" onRequestClose={() => finish(null)}>
      <View style={[s.page, { backgroundColor: colors.background }]}>
        <Text style={[s.heading, { color: colors.text }]}>
          {hi ? 'रिपोर्ट और फील्ड विवरण' : 'Report & field details'}
        </Text>
        {preview ? (
          <WebView
            originWhitelist={['about:blank']}
            source={{
              html: buildReportHtml({
                title,
                details,
                summaryLines: draft.summaryLines,
                points: draft.points,
              }),
            }}
            javaScriptEnabled={false}
            onShouldStartLoadWithRequest={r => r.url === 'about:blank'}
            style={s.preview}
          />
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={{ color: colors.text }}>
              {hi ? 'शीर्षक' : 'Title'}
            </Text>
            <TextInput
              accessibilityLabel="Report title"
              value={title}
              onChangeText={setTitle}
              maxLength={160}
              style={[
                s.input,
                { color: colors.text, borderColor: colors.border },
              ]}
            />
            {(Object.keys(labels) as (keyof ReportDetails)[]).map(key => (
              <View key={key}>
                <Text style={{ color: colors.text }}>{labels[key]}</Text>
                <TextInput
                  accessibilityLabel={labels[key]}
                  value={details[key]}
                  onChangeText={value =>
                    setDetails(d => ({ ...d, [key]: value }))
                  }
                  maxLength={key === 'notes' ? 1000 : 160}
                  multiline={key === 'notes'}
                  style={[
                    s.input,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                />
              </View>
            ))}
          </ScrollView>
        )}
        <View style={s.actions}>
          <AppPressable onPress={() => finish(null)} style={s.button}>
            <Text style={{ color: colors.text }}>
              {hi ? 'रद्द करें' : 'Cancel'}
            </Text>
          </AppPressable>
          <AppPressable onPress={() => setPreview(v => !v)} style={s.button}>
            <Text style={{ color: colors.primary }}>
              {preview
                ? hi
                  ? 'संपादित करें'
                  : 'Edit'
                : hi
                ? 'पूर्वावलोकन'
                : 'Preview'}
            </Text>
          </AppPressable>
          <AppPressable
            disabled={!title.trim()}
            onPress={() => finish({ title: title.trim(), details })}
            style={[s.button, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: '#fff' }}>
              {hi ? 'जारी रखें' : 'Continue'}
            </Text>
          </AppPressable>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, padding: 20, paddingTop: 48, paddingBottom: 32 },
  heading: { fontSize: 21, fontWeight: '800', marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    marginBottom: 16,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    paddingTop: 12,
  },
  button: { padding: 12, borderRadius: 10, minHeight: 48 },
  preview: { flex: 1 },
});
