import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { z } from 'zod';
import AppScreen from '../components/AppScreen';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import {
  MapOption,
  mapLocations,
  villageMapInfo,
  mapPngBase64,
} from '../services/bhunakshaExport';
import { mapImageUrl, mapKml, plotReportUrl } from '../domain/bhunakshaExport';
import { openPortalBrowser } from '../native/portalBrowser';
import { saveMapFile } from '../native/workFiles';
const recordSchema = z.object({
  path: z.string(),
  title: z.string(),
  type: z.enum(['kml', 'kmz', 'png']),
  at: z.string(),
  codes: z.string(),
});
const KEY = 'lekhpal-bhunaksha-exports-v1';
export default function MapExportScreen({ navigation }: { navigation: any }) {
  const { language } = useLanguage(),
    { colors } = useAppTheme();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const [district, setDistrict] = useState<MapOption | null>(null),
    [tehsil, setTehsil] = useState<MapOption | null>(null),
    [village, setVillage] = useState<MapOption | null>(null),
    [options, setOptions] = useState<MapOption[]>([]),
    [level, setLevel] = useState(0),
    [query, setQuery] = useState(''),
    [plot, setPlot] = useState(''),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [records, setRecords] = useState<z.infer<typeof recordSchema>[]>([]);
  const request = useRef<AbortController | null>(null),
    generation = useRef(0),
    mounted = useRef(true);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (mounted.current)
          setRecords(recordSchema.array().parse(raw ? JSON.parse(raw) : []));
      })
      .catch(() => setStatus('Saved exports could not be read.'));
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
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
  async function choose(next: number) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const token = ++generation.current;
    setBusy(true);
    setStatus('');
    try {
      const codes =
        next === 1
          ? ''
          : next === 2
          ? district!.code
          : `${district!.code},${tehsil!.code}`;
      const rows = await mapLocations(next, codes, controller.signal);
      if (mounted.current && token === generation.current) {
        setOptions(rows);
        setLevel(next);
        setQuery('');
      }
    } catch (e) {
      if (mounted.current && !controller.signal.aborted)
        setStatus((e as Error).message);
    } finally {
      if (mounted.current && token === generation.current) setBusy(false);
    }
  }
  async function exportMap(type: 'kml' | 'kmz' | 'png') {
    if (!district || !tehsil || !village || busy) return;
    const codes = [district.code, tehsil.code, village.code],
      title = `${village.value} · ${tehsil.value} · ${district.value}`;
    const controller = new AbortController();
    request.current = controller;
    const token = ++generation.current;
    setBusy(true);
    setStatus(
      t(
        'Preparing official village map…',
        'आधिकारिक ग्राम नक्शा तैयार हो रहा है…',
      ),
    );
    try {
      const info = await villageMapInfo(codes.join(','), controller.signal),
        code = codes.join('');
      const png =
        type !== 'kml'
          ? await mapPngBase64(
              mapImageUrl(info, code, type === 'kmz'),
              controller.signal,
            )
          : undefined;
      if (controller.signal.aborted || token !== generation.current) return;
      const path = await saveMapFile(
        `bhunaksha-${code}-${Date.now()}.${type}`,
        type === 'png' ? '' : mapKml(info, code, title, type === 'kmz'),
        png,
      );
      const next = [
        {
          path,
          title,
          type,
          at: new Date().toISOString(),
          codes: codes.join(','),
        },
        ...records,
      ].slice(0, 200);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      if (mounted.current && token === generation.current) {
        setRecords(next);
        setStatus(
          t(
            'Map saved. Open it below to share or save to Files.',
            'नक्शा सेव हुआ। नीचे से खोलें या साझा करें।',
          ),
        );
      }
    } catch (e) {
      if (mounted.current && !controller.signal.aborted)
        setStatus((e as Error).message);
    } finally {
      if (mounted.current && token === generation.current) setBusy(false);
    }
  }
  return (
    <AppScreen>
      <AppHeader
        title={t('Bhunaksha map export', 'भू-नक्शा निर्यात')}
        leftIconName="arrow-left"
        onLeftPress={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <Text style={{ color: colors.text }}>
          {t(
            'Export the official village cadastral map as a georeferenced KML or an offline KMZ with the map image included.',
            'आधिकारिक ग्राम भू-नक्शे को KML या नक्शा चित्र सहित ऑफलाइन KMZ में सेव करें।',
          )}
        </Text>
        {button(
          district?.value || t('Choose district', 'जनपद चुनें'),
          () => choose(1),
          busy,
        )}
        {button(
          tehsil?.value || t('Choose tehsil', 'तहसील चुनें'),
          () => choose(2),
          busy || !district,
        )}
        {button(
          village?.value || t('Choose village', 'ग्राम चुनें'),
          () => choose(3),
          busy || !tehsil,
        )}
        <TextInput
          accessibilityLabel="Plot number"
          value={plot}
          onChangeText={setPlot}
          placeholder={t('Plot number', 'गाटा संख्या')}
          style={[
            styles.button,
            { color: colors.text, borderColor: colors.border },
          ]}
        />
        {button(
          t('Open parcel map / report', 'गाटा नक्शा / रिपोर्ट खोलें'),
          () => {
            try {
              const url = plotReportUrl(
                district!.code,
                tehsil!.code,
                village!.code,
                plot,
              );
              openPortalBrowser(url).catch(() =>
                setStatus('The official plot report could not be opened.'),
              );
            } catch (e) {
              setStatus((e as Error).message);
            }
          },
          busy || !village,
        )}
        {button(
          t('Export KML · online map', 'KML निर्यात · ऑनलाइन नक्शा'),
          () => exportMap('kml'),
          busy || !village,
        )}
        {button(
          t('Export KMZ · offline map', 'KMZ निर्यात · ऑफलाइन नक्शा'),
          () => exportMap('kmz'),
          busy || !village,
        )}
        {button(
          t('Export 4K map image', '4K नक्शा चित्र निर्यात'),
          () => exportMap('png'),
          busy || !village,
        )}
        {busy &&
          button(t('Cancel download', 'डाउनलोड रोकें'), () => {
            request.current?.abort();
            generation.current++;
            setBusy(false);
            setStatus('Cancelled.');
          })}
        {!!status && (
          <Text accessibilityRole="alert" style={{ color: colors.text }}>
            {status}
          </Text>
        )}
        <Text style={[styles.heading, { color: colors.text }]}>
          {t('Saved maps', 'सेव नक्शे')}
        </Text>
        {records.map(r => (
          <React.Fragment key={r.path}>
            {button(`${r.title} · ${r.type.toUpperCase()}`, () => {
              Share.open({
                title: r.title,
                url: `file://${r.path}`,
                type:
                  r.type === 'png'
                    ? 'image/png'
                    : r.type === 'kmz'
                    ? 'application/vnd.google-earth.kmz'
                    : 'application/vnd.google-earth.kml+xml',
                filename: r.path.split('/').pop(),
                saveToFiles: true,
                failOnCancel: false,
              }).catch(() =>
                Alert.alert(
                  'Map unavailable',
                  'The saved map could not be opened.',
                ),
              );
            })}
          </React.Fragment>
        ))}
      </View>
      <Modal visible={level > 0} onRequestClose={() => setLevel(0)}>
        <View style={styles.content}>
          <TextInput
            accessibilityLabel="Search map locations"
            placeholder={t('Search name or code', 'नाम या कोड खोजें')}
            value={query}
            onChangeText={setQuery}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
          />
          <ScrollView>
            {options
              .filter(o =>
                `${o.value} ${o.englishName || ''} ${o.code}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map(o => (
                <React.Fragment key={o.code}>
                  {button(`${o.value} (${o.code})`, () => {
                    generation.current++;
                    if (level === 1) {
                      setDistrict(o);
                      setTehsil(null);
                      setVillage(null);
                    }
                    if (level === 2) {
                      setTehsil(o);
                      setVillage(null);
                    }
                    if (level === 3) setVillage(o);
                    setLevel(0);
                  })}
                </React.Fragment>
              ))}
          </ScrollView>
          {button(t('Close', 'बंद करें'), () => setLevel(0))}
        </View>
      </Modal>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, flexGrow: 1 },
  button: { borderWidth: 1, borderRadius: 10, padding: 14 },
  disabled: { opacity: 0.4 },
  heading: { fontSize: 19, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12 },
});
