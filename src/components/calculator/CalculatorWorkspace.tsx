import { isPremiumCalculator } from '../../domain/premiumCalculators';
import { isQuickCalculator } from '../../domain/quickCalculators';
import { quickCalculatorTools } from './quickCalculatorContent';
import QuickCalculatorFields from './QuickCalculatorFields';
import { requestPremiumAccess } from '../../services/premiumAccess';
import PremiumCalculatorPreview from './PremiumCalculatorPreview';
import { usePremiumFeatures } from '../../hooks/usePremiumFeatures';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../context/LanguageContext';
import { useSelectedState } from '../../context/SelectedStateContext';
import {
  calculateDesk,
  DeskCalculatorId,
  initialDeskValues,
  readOwners,
  restoreDeskValues,
  ResultLine,
} from '../../domain/lekhpalCalculator';
import { useSavedWorkspaceRecords } from '../../hooks/useSavedWorkspaceRecords';
import type { WorkspaceRecord } from '../../types/workspace';
import {
  exportSummaryAsPdf,
  shareTextSummary,
} from '../../utils/workspaceExport';
import {
  calculatorTools,
  Copy,
  errors,
  labels,
  toolNotes,
  unitLabels,
} from './calculatorContent';
import {
  CalculatorButton,
  CalculatorChoices,
  CalculatorField,
  CalculatorProgress,
  CalculatorReveal,
  useCalculatorTheme,
} from './CalculatorUI';

type Props = {
  toolId: DeskCalculatorId;
  externalRecord?: WorkspaceRecord | null;
  onOpenOfficial: () => void;
};
export default function CalculatorWorkspace(props: Props) {
  const active = usePremiumFeatures();
  if (isPremiumCalculator(props.toolId) && !active)
    return (
      <PremiumCalculatorPreview
        toolId={props.toolId}
        record={props.externalRecord}
        onOpenOfficial={props.onOpenOfficial}
      />
    );
  return <CalculatorWorksheet {...props} />;
}
function CalculatorWorksheet({
  toolId,
  externalRecord,
  onOpenOfficial,
}: Props) {
  const { language } = useLanguage();
  const premium = usePremiumFeatures();
  const { stateCode } = useSelectedState();
  const c = useCalculatorTheme();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const copy = (v: Copy) => v[language === 'hi' ? 1 : 0];
  const label = (key: string) => (labels[key] ? copy(labels[key]) : key);
  const [values, setValues] = useState(() =>
    externalRecord
      ? restoreDeskValues(toolId, externalRecord.values)
      : initialDeskValues(),
  );
  const [ready, setReady] = useState(!!externalRecord);
  const [draftError, setDraftError] = useState(false);
  const [details, setDetails] = useState(false);
  const [fees, setFees] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const { saveRecord } = useSavedWorkspaceRecords(toolId);
  const storageKey = `lekhpal-calculator-v3-${
    stateCode || 'unassigned'
  }-${toolId}`;
  useEffect(() => {
    let active = true;
    if (externalRecord) return;
    AsyncStorage.getItem(storageKey)
      .then(raw => {
        if (raw && active) {
          const draft = JSON.parse(raw);
          if (draft && typeof draft === 'object' && !Array.isArray(draft)) {
            const clean = Object.fromEntries(
              Object.entries(draft).filter(([, v]) => typeof v === 'string'),
            );
            setValues({ ...initialDeskValues(), ...clean } as Record<
              string,
              string
            >);
          }
        }
      })
      .catch(() => {
        if (active) setDraftError(true);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [storageKey, externalRecord]);
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(values)).catch(() =>
      setDraftError(true),
    );
  }, [values, storageKey, ready]);
  const update = (key: string, value: string) => {
    setValues(v => ({ ...v, [key]: value }));
    setSaved(false);
  };
  const result = useMemo(() => calculateDesk(toolId, values), [toolId, values]);
  const owners = readOwners(values);
  const title = copy(calculatorTools.find(tool => tool.id === toolId)!.title);
  const unit = unitLabels[values.unit]
    ? copy(unitLabels[values.unit])
    : t('unit', 'इकाई');
  const number = (n: number, digits = 4) =>
    n.toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', {
      maximumFractionDigits: digits,
    });
  const display = (line: ResultLine) =>
    line.text ||
    (line.suffix
      ? `${number(line.value, 8)} ${line.suffix}`
      : line.unit === 'days'
      ? `${number(line.value)} ${t(line.value === 1 ? 'day' : 'days', 'दिन')}`
      : line.unit === 'money'
      ? `₹${number(line.value, 2)}`
      : line.unit === 'rate'
      ? `₹${number(line.value, 2)} / ${unit}`
      : line.unit === 'area'
      ? `${number(line.value)} ${unit}`
      : line.unit === 'percent'
      ? `${number(line.value, 2)}%`
      : line.unit === 'quintal'
      ? `${number(line.value)} ${t('q', 'क्विंटल')}`
      : ['elapsedWeeks', 'approximateMonths'].includes(line.key)
      ? number(line.value, 4)
      : line.unit === 'number'
      ? line.value.toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', {
          maximumSignificantDigits: 12,
        })
      : number(line.value));
  const field = (
    key: string,
    opts: {
      optional?: boolean;
      text?: boolean;
      placeholder?: string;
      suffix?: string;
      wide?: boolean;
      name?: string;
    } = {},
  ) => (
    <CalculatorField
      key={key}
      label={opts.name || label(key)}
      value={values[key] || ''}
      onChange={v => update(key, v)}
      {...opts}
    />
  );
  const section = (heading: string, children: React.ReactNode) => (
    <View style={s.section}>
      <Text style={[s.heading, { color: c.ink }]}>{heading}</Text>
      {children}
    </View>
  );
  const hint = (text: string) => (
    <Text style={[s.hint, { color: c.muted }]}>{text}</Text>
  );
  const areaFields = (
    <>
      <View style={s.fields}>
        {field('area', {
          name:
            toolId === 'crop-loss'
              ? t('Affected area', 'प्रभावित रकबा')
              : label('area'),
          suffix: unit,
          optional: toolId === 'fraction-hissa-calculator',
        })}
      </View>
      <CalculatorChoices
        label={t('Area unit', 'रकबे की इकाई')}
        value={values.unit}
        items={Object.entries(unitLabels)
          .filter(([key]) => toolId !== 'crop-loss' || key !== 'bigha')
          .map(([id, text]) => ({ id, title: copy(text) }))}
        onChange={v => update('unit', v)}
      />
      {values.unit === 'bigha' &&
        hint(
          t(
            'Use the same local Bigha convention throughout. No conversion is applied.',
            'पूरी गणना में एक ही स्थानीय बीघा मान रखें। इकाई परिवर्तन नहीं किया जाता।',
          ),
        )}
    </>
  );
  const modes = [
    { id: 'fraction', title: t('Fraction', 'अंश') },
    { id: 'percent', title: '%' },
    { id: 'equal', title: t('Equal shares', 'बराबर हिस्से') },
  ];
  const operationItems = [
    { id: 'single', title: t('Simplify', 'सरल करें') },
    { id: 'add', title: t('Add +', 'जोड़ें +') },
    { id: 'subtract', title: t('Subtract −', 'घटाएं −') },
    { id: 'multiply', title: t('Split ×', 'हिस्सा ×') },
  ];
  const summary = () => {
    if (!result.ok) return [];
    const lines = [
      t('Calculation worksheet · entered values', 'गणना पत्रक · दर्ज मान'),
      ...['village', 'gata', 'reference', 'rateSource', 'notes']
        .filter(k => values[k].trim())
        .map(k => `${label(k)}: ${values[k]}`),
      `${label(result.primary.key)}: ${display(result.primary)}`,
      ...result.lines.map(l => `${label(l.key)}: ${display(l)}`),
    ];
    if (
      !isQuickCalculator(toolId) &&
      toolId !== 'recovery-balance' &&
      values.area
    )
      lines.push(`${label('area')}: ${values.area} ${unit}`);
    if (result.allocations)
      result.allocations.forEach((o, i) =>
        lines.push(
          `${o.name || t(`Owner ${i + 1}`, `खातेदार ${i + 1}`)}: ${
            o.fraction
          } · ${number(o.percent, 4)}% · ${number(o.area)} ${unit}`,
        ),
      );
    if (toolId === 'share-calculator')
      lines.push(
        `${t('Share method', 'अंश विधि')}: ${
          modes.find(m => m.id === values.shareMode)?.title
        }`,
      );
    const inputKeys: Partial<Record<DeskCalculatorId, string[]>> = {
      'share-calculator': [],
      'fraction-hissa-calculator': [
        'fractionA',
        ...(values.operation === 'single' ? [] : ['fractionB']),
      ],
      'registry-estimate': [
        'rate',
        'stamp',
        'registration',
        'assessed',
        'extra',
      ],
      'circle-rate-compare': ['rate', 'rateB'],
      'rate-finder': ['value', 'extra'],
      'crop-loss': ['normalYield', 'actualYield', 'price'],
      'recovery-balance': ['demand', 'arrears', 'paid', 'waiver'],
    };
    const quickTool = quickCalculatorTools.find(tool => tool.id === toolId);
    if (quickTool)
      quickTool.fields.forEach(f => {
        const value = values[f.key] || t('Not entered', 'दर्ज नहीं');
        const option = f.choices?.find(choice => choice.id === value);
        lines.push(`${copy(f.label)}: ${option ? copy(option.title) : value}`);
      });
    (inputKeys[toolId] || []).forEach(k =>
      lines.push(
        `${label(k)}: ${values[k] || t('Not entered', 'दर्ज नहीं')}${
          k === 'rate' || k === 'rateB' ? ` ₹/${unit}` : ''
        }`,
      ),
    );
    lines.push(
      `${t('Formula', 'सूत्र')}: ${formulaText()}`,
      copy(toolNotes[toolId]),
    );
    return lines;
  };
  function formulaText() {
    if (!result.ok) return '';
    if (isQuickCalculator(toolId)) return result.formula;
    const texts: Partial<Record<DeskCalculatorId, Copy>> = {
      'share-calculator': ['Area × recorded share', 'रकबा × दर्ज अंश'],
      'fraction-hissa-calculator': [result.formula, result.formula],
      'registry-estimate': [
        'Area × rate + entered fees',
        'रकबा × दर + दर्ज शुल्क',
      ],
      'circle-rate-compare': [
        'Area × (rate B − rate A)',
        'रकबा × (दर B − दर A)',
      ],
      'rate-finder': [
        '(Total − included charges) ÷ area',
        '(कुल रकम − शामिल शुल्क) ÷ रकबा',
      ],
      'crop-loss': [
        'Area in ha × yield shortfall × price per quintal',
        'रकबा (हे.) × उपज में कमी × प्रति क्विंटल दर',
      ],
      'recovery-balance': [
        'Demand + arrears − adjustment − collected',
        'मांग + बकाया − समायोजन − वसूली',
      ],
    };
    return copy(texts[toolId]!);
  }
  const perform = async (action: 'save' | 'share' | 'pdf') => {
    if (!result.ok || busy) return;
    if (isPremiumCalculator(toolId) && !requestPremiumAccess('gps_capture'))
      return;
    setBusy(true);
    try {
      const summaryLines = summary();
      if (action === 'save') {
        await saveRecord({
          title:
            [values.village, values.gata, values.reference]
              .filter(Boolean)
              .join(' · ') || title,
          subtitle: `${label(result.primary.key)}: ${display(result.primary)}`,
          summaryLines,
          values: { ...values, calculatorVersion: '3' },
        });
        setSaved(true);
      } else if (action === 'share')
        await shareTextSummary({ title, summaryLines });
      else
        await exportSummaryAsPdf({
          details: {
            village: values.village,
            plot: values.gata,
            notes: values.notes,
          },
          title,
          summaryLines,
          fileName: `lekhpal-${toolId}-${Date.now()}`,
        });
    } catch {
      Alert.alert(
        t('Could not finish', 'कार्य पूरा नहीं हुआ'),
        t(
          'Your inputs are still here. Please try again.',
          'आपका विवरण सुरक्षित है। कृपया फिर कोशिश करें।',
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const reset = () =>
    Alert.alert(
      t('Start a fresh calculation?', 'नई गणना शुरू करें?'),
      t(
        'This clears the current draft. Saved notes stay in your notebook.',
        'वर्तमान ड्राफ्ट साफ होगा। सेव नोट पुस्तिका में रहेंगे।',
      ),
      [
        { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
        {
          text: t('Clear inputs', 'विवरण साफ करें'),
          onPress: () => {
            setValues(initialDeskValues());
            setSaved(false);
          },
        },
      ],
    );
  if (!ready) return <ActivityIndicator color={c.accent} style={s.loading} />;
  return (
    <KeyboardAvoidingView
      style={s.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        {toolId !== 'scientific-calculator' && (
          <View style={s.intro}>
            <Text style={[s.description, { color: c.muted }]}>
              {copy(
                calculatorTools.find(tool => tool.id === toolId)!.description,
              )}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Clear inputs', 'विवरण साफ करें')}
              onPress={reset}
              style={s.iconButton}
            >
              <Icon name="restart" size={21} color={c.muted} />
            </Pressable>
          </View>
        )}
        {draftError &&
          hint(
            t(
              'Draft storage is unavailable. Save a note before leaving.',
              'ड्राफ्ट सेव नहीं हो पाया। बाहर जाने से पहले नोट सेव करें।',
            ),
          )}
        {externalRecord &&
          externalRecord.values.calculatorVersion !== '3' &&
          hint(
            t(
              toolId === 'share-calculator'
                ? 'Older note: names and percentages restored. Enter the land area and unit; the old total was a money amount.'
                : 'Older note restored. Select the area unit to complete this calculation.',
              toolId === 'share-calculator'
                ? 'पुराना नोट: नाम और प्रतिशत लोड हुए। रकबा और इकाई भरें; पुराना कुल धनराशि था।'
                : 'पुराना नोट लोड हुआ। गणना के लिए रकबे की इकाई चुनें।',
            ),
          )}
        <CalculatorReveal token={toolId}>
          {isQuickCalculator(toolId) && (
            <QuickCalculatorFields
              toolId={toolId}
              values={values}
              onChange={update}
            />
          )}
          {toolId === 'share-calculator' && (
            <>
              {areaFields}
              {section(
                t('Co-owners', 'सहखातेदार'),
                <>
                  <CalculatorChoices
                    label={t('Enter recorded shares as', 'दर्ज अंश का प्रकार')}
                    value={values.shareMode}
                    items={modes}
                    onChange={v => update('shareMode', v)}
                  />
                  {owners.map((owner, index) => (
                    <View
                      key={owner.id}
                      style={[s.owner, { borderColor: c.line }]}
                    >
                      <View style={s.ownerName}>
                        <CalculatorField
                          compact
                          text
                          label={t(
                            `Owner ${index + 1}`,
                            `खातेदार ${index + 1}`,
                          )}
                          value={owner.name}
                          placeholder={t('Name (optional)', 'नाम (वैकल्पिक)')}
                          onChange={name =>
                            update(
                              'owners',
                              JSON.stringify(
                                owners.map((o, i) =>
                                  i === index ? { ...o, name } : o,
                                ),
                              ),
                            )
                          }
                        />
                      </View>
                      <View style={s.ownerShare}>
                        {values.shareMode === 'equal' ? (
                          <>
                            <Text style={[s.hint, { color: c.muted }]}>
                              {t('Share', 'अंश')}
                            </Text>
                            <Text style={[s.equalShare, { color: c.accent }]}>
                              1/{owners.length}
                            </Text>
                          </>
                        ) : (
                          <CalculatorField
                            compact
                            label={t(`Share ${index + 1}`, `अंश ${index + 1}`)}
                            value={owner.share}
                            text={values.shareMode === 'fraction'}
                            placeholder={
                              values.shareMode === 'fraction' ? '1/2' : '50'
                            }
                            suffix={
                              values.shareMode === 'percent' ? '%' : undefined
                            }
                            onChange={share =>
                              update(
                                'owners',
                                JSON.stringify(
                                  owners.map((o, i) =>
                                    i === index ? { ...o, share } : o,
                                  ),
                                ),
                              )
                            }
                          />
                        )}
                      </View>
                      {owners.length > 1 && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t(
                            `Remove owner ${index + 1}`,
                            `खातेदार ${index + 1} हटाएं`,
                          )}
                          onPress={() =>
                            update(
                              'owners',
                              JSON.stringify(
                                owners.filter((_, i) => i !== index),
                              ),
                            )
                          }
                          style={s.remove}
                        >
                          <Icon
                            name="minus-circle-outline"
                            size={21}
                            color={c.muted}
                          />
                        </Pressable>
                      )}
                    </View>
                  ))}
                  <CalculatorButton
                    title={t('Add co-owner', 'सहखातेदार जोड़ें')}
                    icon="plus"
                    compact
                    disabled={owners.length >= 12}
                    onPress={() =>
                      update(
                        'owners',
                        JSON.stringify([
                          ...owners,
                          { id: String(Date.now()), name: '', share: '' },
                        ]),
                      )
                    }
                  />
                </>,
              )}
            </>
          )}
          {toolId === 'fraction-hissa-calculator' && (
            <>
              <CalculatorChoices
                label={t('Operation', 'गणना')}
                value={values.operation}
                items={operationItems}
                onChange={v => update('operation', v)}
              />
              <View style={s.fields}>
                {field('fractionA', { text: true, placeholder: '1/2' })}
                {values.operation !== 'single' &&
                  field('fractionB', { text: true, placeholder: '1/3' })}
              </View>
              {section(
                t(
                  'Apply to an area · optional',
                  'रकबे पर लागू करें · वैकल्पिक',
                ),
                areaFields,
              )}
            </>
          )}
          {['registry-estimate', 'circle-rate-compare', 'rate-finder'].includes(
            toolId,
          ) && (
            <>
              {areaFields}
              <View style={s.fields}>
                {toolId === 'rate-finder'
                  ? field('value')
                  : field('rate', {
                      suffix: `₹/${unit}`,
                      name:
                        toolId === 'circle-rate-compare'
                          ? t('Rate A per unit', 'प्रति इकाई दर A')
                          : label('rate'),
                    })}
                {toolId === 'circle-rate-compare' &&
                  field('rateB', { suffix: `₹/${unit}` })}
                {toolId === 'rate-finder' &&
                  field('extra', {
                    optional: true,
                    name: t(
                      'Included charges ₹ · optional',
                      'शामिल शुल्क ₹ · वैकल्पिक',
                    ),
                  })}
              </View>
              {toolId === 'registry-estimate' && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: fees }}
                    onPress={() => setFees(!fees)}
                    style={[s.disclosure, { borderColor: c.line }]}
                  >
                    <View style={s.fill}>
                      <Text style={[s.heading, { color: c.ink }]}>
                        {t('Fees & assessment', 'शुल्क और मूल्यांकन')}
                      </Text>
                      <Text style={[s.hint, { color: c.muted }]}>
                        {t(
                          'Optional · only entered fees are included',
                          'वैकल्पिक · केवल दर्ज शुल्क शामिल होंगे',
                        )}
                      </Text>
                    </View>
                    <Icon
                      name={fees ? 'chevron-up' : 'plus'}
                      size={21}
                      color={c.accent}
                    />
                  </Pressable>
                  {fees && (
                    <View style={s.fields}>
                      {field('stamp', { optional: true, placeholder: '—' })}
                      {field('registration', {
                        optional: true,
                        placeholder: '—',
                      })}
                      {field('extra', { optional: true, placeholder: '—' })}
                      {field('assessed', {
                        optional: true,
                        placeholder: t(
                          'Land value if blank',
                          'खाली होने पर भूमि मूल्य',
                        ),
                      })}
                    </View>
                  )}
                  {hint(
                    t(
                      'Rate must match the area unit. Verify local rates and fee rules.',
                      'दर रकबे की इकाई के अनुसार हो। स्थानीय दर और शुल्क नियम जांचें।',
                    ),
                  )}
                  {stateCode === 'UP' && (
                    <CalculatorButton
                      compact
                      icon="open-in-new"
                      title={t(
                        'Official rates & fee calculator',
                        'आधिकारिक दर और शुल्क गणना',
                      )}
                      onPress={onOpenOfficial}
                    />
                  )}
                </>
              )}
            </>
          )}
          {toolId === 'crop-loss' && (
            <>
              {areaFields}
              {section(
                t('Yield & crop price', 'उपज और फसल दर'),
                <View style={s.fields}>
                  {field('normalYield')}
                  {field('actualYield')}
                  {field('price', { wide: true })}
                </View>,
              )}
            </>
          )}
          {toolId === 'recovery-balance' && (
            <>
              {section(
                t('Demand register', 'मांग विवरण'),
                <View style={s.fields}>
                  {field('demand')}
                  {field('arrears', { optional: true, placeholder: '—' })}
                </View>,
              )}
              {section(
                t('Recovery & adjustment', 'वसूली और समायोजन'),
                <View style={s.fields}>
                  {field('paid', { optional: true, placeholder: '—' })}
                  {field('waiver', { optional: true, placeholder: '—' })}
                </View>,
              )}
            </>
          )}
        </CalculatorReveal>
        {toolId !== 'scientific-calculator' && (
          <>
            <View
              style={[
                s.receipt,
                { backgroundColor: c.paper, borderColor: c.line },
              ]}
            >
              <View style={s.receiptTop}>
                <View style={s.inline}>
                  <Icon
                    name="calculator-variant-outline"
                    color={c.accent}
                    size={18}
                  />
                  <Text style={[s.eyebrow, { color: c.accent }]}>
                    {t('CALCULATION', 'गणना')}
                  </Text>
                </View>
                <View
                  style={[
                    s.dot,
                    { backgroundColor: result.ok ? c.accent : c.line },
                  ]}
                />
              </View>
              {result.ok ? (
                <>
                  <CalculatorReveal token={`${toolId}-${result.primary.key}`}>
                    <Text style={[s.resultLabel, { color: c.muted }]}>
                      {label(result.primary.key)}
                    </Text>
                    <Text selectable style={[s.resultValue, { color: c.ink }]}>
                      {display(result.primary)}
                    </Text>
                  </CalculatorReveal>
                  {result.progress !== undefined && (
                    <CalculatorProgress value={result.progress} />
                  )}
                  {result.allocations?.map((o, i) => (
                    <View
                      key={i}
                      style={[s.allocation, { borderColor: c.line }]}
                    >
                      <View style={s.fill}>
                        <Text style={[s.allocationName, { color: c.ink }]}>
                          {o.name || t(`Owner ${i + 1}`, `खातेदार ${i + 1}`)}
                        </Text>
                        <Text style={[s.hint, { color: c.muted }]}>
                          {o.fraction} · {number(o.percent, 2)}%
                        </Text>
                      </View>
                      <Text
                        selectable
                        style={[s.allocationValue, { color: c.accent }]}
                      >
                        {number(o.area)} {unit}
                      </Text>
                    </View>
                  ))}
                  <View style={s.breakdown}>
                    {result.lines.map(line => (
                      <View key={line.key} style={s.resultRow}>
                        <Text style={[s.resultKey, { color: c.muted }]}>
                          {label(line.key)}
                        </Text>
                        <Text
                          selectable
                          style={[s.resultNumber, { color: c.ink }]}
                        >
                          {display(line)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text
                    style={[s.formula, { color: c.muted, borderColor: c.line }]}
                  >
                    {formulaText()}
                  </Text>
                </>
              ) : (
                <View style={s.emptyResult}>
                  <Text
                    style={[
                      s.emptyTitle,
                      {
                        color: result.error === 'incomplete' ? c.ink : c.error,
                      },
                    ]}
                  >
                    {result.error === 'incomplete'
                      ? t('Your result appears here', 'आपका परिणाम यहां दिखेगा')
                      : t('Check your inputs', 'विवरण जांचें')}
                  </Text>
                  <Text
                    style={[
                      s.hint,
                      {
                        color:
                          result.error === 'incomplete' ? c.muted : c.error,
                      },
                    ]}
                  >
                    {copy(errors[result.error])}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[s.note, { color: c.muted }]}>
              {copy(toolNotes[toolId])}
            </Text>
          </>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Record details', 'अभिलेख विवरण')}
          accessibilityState={{ expanded: details }}
          onPress={() => setDetails(!details)}
          style={[s.disclosure, { borderColor: c.line }]}
        >
          <View style={s.inline}>
            <Icon name="notebook-edit-outline" size={21} color={c.accent} />
            <Text style={[s.heading, { color: c.ink }]}>
              {t('Record details', 'अभिलेख विवरण')}
            </Text>
            <Text style={[s.hint, { color: c.muted }]}>
              {t('optional', 'वैकल्पिक')}
            </Text>
          </View>
          <Icon
            name={details ? 'chevron-up' : 'chevron-down'}
            size={21}
            color={c.muted}
          />
        </Pressable>
        {details && (
          <View style={s.fields}>
            {['village', 'gata', 'reference', 'rateSource', 'notes'].map(key =>
              field(key, {
                text: true,
                placeholder: '',
                wide: key === 'notes',
              }),
            )}
          </View>
        )}
      </ScrollView>
      <View style={[s.footer, { backgroundColor: c.bg, borderColor: c.line }]}>
        <View style={s.save}>
          <CalculatorButton
            primary
            icon={saved ? 'check' : 'bookmark-outline'}
            title={
              busy
                ? t('Working…', 'कृपया रुकें…')
                : saved
                ? t('Saved', 'सेव किया')
                : t('Save calculation', 'गणना सेव करें')
            }
            disabled={!result.ok || busy || saved}
            onPress={() => {
              perform('save');
            }}
          />
        </View>
        <CalculatorButton
          title={t('Share', 'साझा')}
          icon="share-variant-outline"
          compact
          disabled={!result.ok || busy}
          onPress={() => {
            perform('share');
          }}
        />
        <CalculatorButton
          title={premium ? 'PDF' : 'PDF · Premium'}
          icon={premium ? 'file-pdf-box' : 'lock-outline'}
          compact
          disabled={!result.ok || busy}
          onPress={() => {
            perform('pdf');
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  fill: { flex: 1 },
  loading: { padding: 40 },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 26,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
    paddingBottom: 2,
  },
  description: { flex: 1, fontSize: 13, lineHeight: 20 },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 10, marginBottom: 14 },
  heading: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  fields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  hint: { fontSize: 12, lineHeight: 19 },
  owner: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
  },
  ownerName: { flex: 1, minWidth: 0 },
  ownerShare: { width: 88 },
  equalShare: {
    fontSize: 18,
    fontWeight: '600',
    height: 50,
    textAlignVertical: 'center',
  },
  remove: {
    minWidth: 36,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclosure: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  receipt: { borderWidth: 1, borderRadius: 17, padding: 18, marginTop: 15 },
  receiptTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  dot: { height: 6, width: 6, borderRadius: 3 },
  resultLabel: { fontSize: 12, lineHeight: 18 },
  resultValue: {
    fontSize: 28,
    lineHeight: 39,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  breakdown: { gap: 10, marginTop: 18 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  resultKey: { fontSize: 12, lineHeight: 19, flex: 1 },
  resultNumber: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  formula: {
    fontSize: 11,
    lineHeight: 18,
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 13,
  },
  emptyResult: { paddingBottom: 5, gap: 7 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  note: { fontSize: 11, lineHeight: 18, marginVertical: 16 },
  allocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  allocationName: { fontSize: 13, fontWeight: '600' },
  allocationValue: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  save: { flex: 1 },
});
