import React, { useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import {
  CENSUS_MODES,
  CensusRules,
  censusAreaConversion,
} from '../../domain/census';
import { OfficialWorkSnapshot } from '../../domain/officialWork';
import { useAppTheme } from '../../context/ThemeContext';
import { CENSUS_CROPS } from '../../data/censusCrops';
import { typography } from '../../theme/typography';
const labels = {
  standard: 'Individual / Joint',
  institutional: 'Institutional',
  continuation: 'Continue existing entries',
  'block-d': 'Block D / Non-operated land',
  operational: 'Operational holders',
  phase2: 'Phase 2 / Schedule H',
};
export default function CensusControls({
  page,
  rules,
  onChange,
  onPreview,
  onError,
  disabled,
}: {
  page: OfficialWorkSnapshot | null;
  rules: CensusRules;
  onChange: (rules: CensusRules) => void;
  onPreview: (values: Record<string, string>) => void;
  onError: (message: string) => void;
  disabled: boolean;
}) {
  const { colors } = useAppTheme();
  const [divisor, setDivisor] = useState('1');
  const [picker, setPicker] = useState('');
  const [cropSearch, setCropSearch] = useState('');
  const cropRows = Array.from(
    { length: Number(rules.phase2Count) },
    (_, index) =>
      rules.phase2Crops[index] || {
        code: '',
        areaPercent: '100',
        irrigatedPercent: rules.phase2Irrigated ? '100' : '0',
      },
  );
  const changeCrop = (
    index: number,
    change: Partial<CensusRules['phase2Crops'][number]>,
  ) =>
    onChange({
      ...rules,
      phase2Crops: cropRows.map((row, i) =>
        i === index ? { ...row, ...change } : row,
      ),
    });
  const percentage = (
    label: string,
    value: string,
    change: (value: string) => void,
  ) => (
    <View>
      <Text style={[typography.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={change}
        editable={!disabled}
        keyboardType="decimal-pad"
        maxLength={6}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
      />
    </View>
  );
  const button = (label: string, fn: () => void, selected = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={fn}
      style={[
        styles.button,
        {
          borderColor: colors.primary,
          backgroundColor: selected ? colors.primary : colors.surface,
        },
      ]}
    >
      <Text
        style={[
          typography.label,
          { color: colors.primary },
          selected && styles.selectedText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
  const option = (
    title: string,
    key:
      | 'landUse'
      | 'landType'
      | 'holder'
      | 'smallAreaType'
      | 'irrigationSource',
    pattern: RegExp,
  ) => {
    const field = page?.fields.find(
      f => pattern.test(f.key) && f.kind === 'select',
    );
    return (
      <View>
        <Text style={[typography.label, { color: colors.text }]}>{title}</Text>
        {button(
          field?.options.find(o => o.value === rules[key])?.label ||
            (rules[key] ? rules[key] : 'Keep official value') + ' · ' + title,
          () => setPicker(picker === key ? '' : key),
        )}
        {picker === key && (
          <>
            {button(
              'Keep official value · ' + title,
              () => {
                onChange({ ...rules, [key]: '' });
                setPicker('');
              },
              !rules[key],
            )}
            {field?.options
              .filter(o => o.value)
              .map(o =>
                button(
                  o.label + ' · ' + title,
                  () => {
                    onChange({ ...rules, [key]: o.value });
                    setPicker('');
                  },
                  rules[key] === o.value,
                ),
              )}
          </>
        )}
      </View>
    );
  };
  return (
    <View style={styles.section}>
      <Text style={[typography.label, { color: colors.text }]}>
        Census workflow
      </Text>
      {CENSUS_MODES.map(mode =>
        button(
          labels[mode],
          () => onChange({ ...rules, mode }),
          rules.mode === mode,
        ),
      )}
      <Text style={[typography.body, { color: colors.textMuted }]}>
        Open the matching official form. Each workflow keeps its own preset.
        Personal details and plot areas are never copied between holders.
      </Text>
      {rules.mode !== 'phase2' && rules.mode !== 'operational' && (
        <>
          {option('Land use for every row', 'landUse', /^land_use_list\d+$/)}
          {option(
            'Non-operated land type',
            'landType',
            /^land_use_type_list\d+$/,
          )}
          {option(
            'Operational holder',
            'holder',
            /^operational_holder_list\d+$/,
          )}
          <Text style={{ color: colors.text }}>
            Small-area threshold (blank to disable)
          </Text>
          <TextInput
            accessibilityLabel="Census small-area threshold"
            value={rules.smallArea}
            editable={!disabled}
            keyboardType="decimal-pad"
            onChangeText={smallArea => onChange({ ...rules, smallArea })}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
          />
          {option(
            'Small-area land type',
            'smallAreaType',
            /^land_use_type_list\d+$/,
          )}
          <Text style={{ color: colors.text }}>
            Area divisor for split Maharashtra fields
          </Text>
          <TextInput
            accessibilityLabel="Census area divisor"
            value={divisor}
            editable={!disabled}
            keyboardType="number-pad"
            onChangeText={setDivisor}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
          />
          {button('Preview converted areas', () => {
            try {
              if (!page) throw Error('Open a census entry.');
              onPreview(censusAreaConversion(page, divisor));
            } catch (e) {
              onError((e as Error).message);
            }
          })}
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Conversion changes the draft below. Review every area, then use Fill
            changed fields once. It does not submit the record.
          </Text>
        </>
      )}
      {rules.mode === 'phase2' && (
        <>
          {button(
            'One crop per holding',
            () =>
              onChange({
                ...rules,
                phase2Count: '1',
                phase2Crops: cropRows.slice(0, 1),
              }),
            rules.phase2Count === '1',
          )}
          {button(
            'Two crops per holding',
            () =>
              onChange({
                ...rules,
                phase2Count: '2',
                phase2Crops: [
                  cropRows[0],
                  rules.phase2Crops[1] || {
                    code: '',
                    areaPercent: '100',
                    irrigatedPercent: rules.phase2Irrigated ? '100' : '0',
                  },
                ],
              }),
            rules.phase2Count === '2',
          )}
          {percentage(
            'Holding irrigated area (%)',
            rules.phase2HoldingIrrigatedPercent ||
              (rules.phase2Irrigated ? '100' : '0'),
            value =>
              onChange({ ...rules, phase2HoldingIrrigatedPercent: value }),
          )}
          {cropRows.map((row, index) => (
            <View key={index} style={styles.section}>
              <Text style={[typography.label, { color: colors.text }]}>
                Crop {index + 1}
              </Text>
              {button(
                CENSUS_CROPS.find(c => c.code === row.code)?.name ||
                  (row.code
                    ? `Crop code ${row.code}`
                    : `Choose crop ${index + 1}`),
                () => {
                  setPicker(picker === `crop-${index}` ? '' : `crop-${index}`);
                  setCropSearch('');
                },
              )}
              {picker === `crop-${index}` && (
                <View style={styles.section}>
                  <TextInput
                    accessibilityLabel={`Search crop ${index + 1}`}
                    placeholder="Search crop name or code"
                    placeholderTextColor={colors.textMuted}
                    value={cropSearch}
                    onChangeText={setCropSearch}
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                  />
                  {CENSUS_CROPS.filter(c =>
                    `${c.code} ${c.name}`
                      .toLowerCase()
                      .includes(cropSearch.trim().toLowerCase()),
                  )
                    .slice(0, 25)
                    .map(c =>
                      button(
                        `${c.code} · ${c.name}`,
                        () => {
                          changeCrop(index, { code: c.code });
                          setPicker('');
                        },
                        row.code === c.code,
                      ),
                    )}
                </View>
              )}
              <TextInput
                accessibilityLabel={`Crop ${index + 1} official code`}
                placeholder="Official crop code"
                placeholderTextColor={colors.textMuted}
                value={row.code}
                onChangeText={code => changeCrop(index, { code })}
                editable={!disabled}
                keyboardType="number-pad"
                maxLength={8}
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
              />
              {percentage(
                `Crop ${index + 1} area (% of holding)`,
                row.areaPercent,
                areaPercent => changeCrop(index, { areaPercent }),
              )}
              {percentage(
                `Crop ${index + 1} irrigated area (%)`,
                row.irrigatedPercent,
                irrigatedPercent => changeCrop(index, { irrigatedPercent }),
              )}
            </View>
          ))}
          {(Number(
            rules.phase2HoldingIrrigatedPercent ||
              (rules.phase2Irrigated ? '100' : '0'),
          ) > 0 ||
            cropRows.some(row => Number(row.irrigatedPercent) > 0)) &&
            option('Irrigation source', 'irrigationSource', /^source_irr$/)}
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Percentages use each holding’s current official operated area. Enter
            0–100 for irrigation; the remaining area is unirrigated. Two crops
            can each use the full holding when grown in different seasons. The
            batch opens the official lists, checks crop codes, calculates and
            saves each selected serial. A confirmed save is required before the
            next serial.
          </Text>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  selectedText: { color: '#fff' },
  section: { gap: 8 },
  button: { padding: 12, borderWidth: 1, borderRadius: 10 },
  input: { padding: 12, borderWidth: 1, borderRadius: 10 },
});
