import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RevenueSnapshot } from '../../domain/revenueFeeding';
import {
  PropertyQueue,
  PropertyReceipt,
  propertyContext,
  propertyNumbers,
  propertyQueueSchema,
  receivePropertyResult,
  samePropertyContext,
} from '../../domain/prapatraQueue';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
const KEY = 'lekhpal-prapatra5-property-queue-v1';
export default function PrapatraQueuePanel({
  page,
  enabled,
  receipt,
  onFill,
  stopToken = 0,
  automatic = false,
  onPrepared,
}: {
  page: RevenueSnapshot | null;
  enabled: boolean;
  receipt: PropertyReceipt | null;
  onFill: (patch: Record<string, string>) => void;
  stopToken?: number;
  automatic?: boolean;
  onPrepared?: (number: string) => void;
}) {
  const { language } = useLanguage(),
    { colors } = useAppTheme();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const [from, setFrom] = useState('1'),
    [to, setTo] = useState('1'),
    [custom, setCustom] = useState('');
  const [queue, setQueue] = useState<PropertyQueue | null>(null),
    queueRef = useRef<PropertyQueue | null>(null);
  const [ready, setReady] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const writes = useRef(Promise.resolve()),
    mounted = useRef(true),
    latest = useRef({ page, enabled, stopToken });
  latest.current = { page, enabled, stopToken };
  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(KEY)
      .then(async raw => {
        let restored = raw ? propertyQueueSchema.parse(JSON.parse(raw)) : null;
        if (restored) {
          restored = {
            ...restored,
            items: restored.items.map(item => ({
              ...item,
              status:
                item.status === 'prepared'
                  ? ('uncertain' as const)
                  : item.status,
            })),
          };
          await AsyncStorage.setItem(KEY, JSON.stringify(restored));
        }
        if (mounted.current) {
          queueRef.current = restored;
          setQueue(restored);
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted.current)
          setError('Saved property queue could not be read.');
      });
    return () => {
      mounted.current = false;
    };
  }, []);
  function save(next: PropertyQueue | null, after?: () => void) {
    setSaving(true);
    setError('');
    queueRef.current = next;
    writes.current = writes.current
      .then(() =>
        next
          ? AsyncStorage.setItem(KEY, JSON.stringify(next))
          : AsyncStorage.removeItem(KEY),
      )
      .then(() => {
        if (mounted.current) {
          setQueue(next);
          setSaving(false);
          after?.();
        }
      })
      .catch(() => {
        if (mounted.current) {
          setSaving(false);
          setError('Property queue could not be saved. Nothing new was sent.');
        }
      });
  }
  useEffect(() => {
    if (!receipt || !ready || !queueRef.current) return;
    const current = queueRef.current,
      next = receivePropertyResult(current, receipt);
    if (next !== current) save(next);
  }, [receipt, ready]);
  const active = queue?.items.find(item =>
    ['pending', 'prepared', 'uncertain'].includes(item.status),
  );
  const context = page && propertyContext(page),
    field = page?.fields.find(f => f.key === 'entrySeqNo' && !f.readOnly);
  const canPrepare =
    enabled &&
    ready &&
    !saving &&
    page?.stage === 'property' &&
    !!context &&
    !!field &&
    (!queue || !active || samePropertyContext(queue.context, context));
  const preparing = useRef('');
  useEffect(() => {
    if (
      !automatic ||
      !canPrepare ||
      !queue ||
      active?.status !== 'pending' ||
      !page ||
      !field
    )
      return;
    const key = `${page.documentId}:${active.number}:${stopToken}`;
    if (preparing.current === key) return;
    preparing.current = key;
    const captured = page,
      capturedStop = stopToken,
      number = active.number;
    save(
      {
        ...queue,
        items: queue.items.map(item =>
          item.number === number ? { ...item, status: 'prepared' } : item,
        ),
      },
      () => {
        const now = latest.current;
        if (
          now.enabled &&
          now.stopToken === capturedStop &&
          now.page?.documentId === captured.documentId &&
          now.page.revision === captured.revision
        ) {
          onPrepared?.(number);
          onFill({ [field.ref]: number });
        }
      },
    );
  }, [
    automatic,
    canPrepare,
    queue,
    active,
    page,
    field,
    stopToken,
    onFill,
    onPrepared,
  ]);

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
  return (
    <View style={styles.box}>
      <Text style={[styles.heading, { color: colors.text }]}>
        {t('Property queue', 'भूखण्ड क्रम')}
      </Text>
      <Text style={{ color: colors.textMuted }}>
        {t(
          'Choose village, survey year and gata on the official property page first. A property completes only after its final save is confirmed.',
          'पहले आधिकारिक पेज पर ग्राम, सर्वेक्षण वर्ष और गाटा चुनें। अंतिम सेव की पुष्टि पर ही भूखण्ड पूर्ण होगा।',
        )}
      </Text>
      {!queue || !active ? (
        <>
          {(
            [
              ['Property from', from, setFrom, 'शुरुआती भूखण्ड संख्या'],
              ['Property to', to, setTo, 'अंतिम भूखण्ड संख्या'],
              [
                'Custom property numbers',
                custom,
                setCustom,
                'अलग भूखण्ड संख्याएं (अल्पविराम से)',
              ],
            ] as const
          ).map(([label, value, change, hindi]) => (
            <View key={label} style={styles.box}>
              <Text style={{ color: colors.text }}>{t(label, hindi)}</Text>
              <TextInput
                accessibilityLabel={label}
                placeholder={t(label, hindi)}
                value={value}
                onChangeText={change}
                editable={!saving}
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
              />
            </View>
          ))}
          {button(
            t('Create property queue', 'भूखण्ड क्रम बनाएं'),
            () => {
              if (!context) return;
              try {
                save({
                  context,
                  items: propertyNumbers(from, to, custom).map(number => ({
                    number,
                    status: 'pending',
                  })),
                });
              } catch (e) {
                setError((e as Error).message);
              }
            },
            !canPrepare,
          )}
        </>
      ) : (
        <>
          <Text style={{ color: colors.text }}>
            {t('Property', 'भूखण्ड')} {active.number} · {active.status} ·{' '}
            {queue.items.filter(i => i.status === 'confirmed').length}/
            {queue.items.length} {t('confirmed', 'पुष्ट')}
          </Text>
          {active.status === 'uncertain' && (
            <Text style={{ color: colors.text }}>
              {t(
                'Check this property on the official portal before preparing it again or skipping it.',
                'दोबारा भरने या छोड़ने से पहले इस भूखण्ड को आधिकारिक पोर्टल पर जांचें।',
              )}
            </Text>
          )}
          {button(
            t('Prepare current property', 'वर्तमान भूखण्ड भरें'),
            () => {
              if (!page || !field) return;
              const captured = page,
                capturedStop = stopToken;
              save(
                {
                  ...queue,
                  items: queue.items.map(i =>
                    i.number === active.number
                      ? { ...i, status: 'prepared' }
                      : i,
                  ),
                },
                () => {
                  const now = latest.current;
                  if (
                    now.enabled &&
                    now.stopToken === capturedStop &&
                    now.page?.documentId === captured.documentId &&
                    now.page.revision === captured.revision
                  ) {
                    onPrepared?.(active.number);
                    onFill({ [field.ref]: active.number });
                  } else
                    setError(
                      'Page changed. Return to the same property page and prepare again.',
                    );
                },
              );
            },
            !canPrepare,
          )}
          {button(
            t('Skip current property', 'वर्तमान भूखण्ड छोड़ें'),
            () =>
              save({
                ...queue,
                items: queue.items.map(i =>
                  i.number === active.number ? { ...i, status: 'skipped' } : i,
                ),
              }),
            !enabled || saving,
          )}
        </>
      )}
      {!!queue &&
        button(
          t('Clear local property queue', 'स्थानीय भूखण्ड क्रम हटाएं'),
          () => save(null),
          !enabled || !ready || saving,
        )}
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: colors.text }}>
          {error}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  box: { gap: 8 },
  heading: { fontWeight: '700', fontSize: 17 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8 },
  button: { borderWidth: 1, padding: 12, borderRadius: 8 },
  disabled: { opacity: 0.4 },
});
