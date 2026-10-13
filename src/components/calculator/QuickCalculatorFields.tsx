import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { QuickCalculatorId } from '../../domain/quickCalculators';
import { CalculatorChoices, CalculatorField } from './CalculatorUI';
import { quickCalculatorTools } from './quickCalculatorContent';
import ScientificCalculator from './ScientificCalculator';
import CalendarDateField from './CalendarDateField';
import ConversionUnitPicker from '../measurement/ConversionUnitPicker';
export default function QuickCalculatorFields({
  toolId,
  values,
  onChange,
}: {
  toolId: QuickCalculatorId;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const { language } = useLanguage();
  const index = language === 'hi' ? 1 : 0;
  const tool = quickCalculatorTools.find(t => t.id === toolId)!;
  if (toolId === 'scientific-calculator')
    return <ScientificCalculator values={values} onChange={onChange} />;
  if (toolId === 'length-converter')
    return (
      <View style={styles.form}>
        <CalculatorField
          label={tool.fields[0].label[index]}
          value={values.lengthValue || ''}
          onChange={v => onChange('lengthValue', v)}
        />
        <ConversionUnitPicker
          from={values.lengthFrom}
          to={values.lengthTo}
          options={tool.fields[1].choices!.map(option => ({
            value: option.id,
            label: option.title[index],
          }))}
          onChange={(side, value) =>
            onChange(side === 'from' ? 'lengthFrom' : 'lengthTo', value)
          }
          onSwap={() => {
            onChange('lengthFrom', values.lengthTo);
            onChange('lengthTo', values.lengthFrom);
          }}
        />
      </View>
    );
  return (
    <View style={styles.form}>
      {tool.fields.map(f =>
        f.choices ? (
          <CalculatorChoices
            key={f.key}
            label={f.label[index]}
            value={values[f.key]}
            items={f.choices.map(c => ({ id: c.id, title: c.title[index] }))}
            onChange={v => onChange(f.key, v)}
          />
        ) : f.date ? (
          <CalendarDateField
            key={f.key}
            label={f.label[index]}
            value={values[f.key] || ''}
            onChange={v => onChange(f.key, v)}
          />
        ) : (
          <CalculatorField
            key={f.key}
            label={f.label[index]}
            value={values[f.key] || ''}
            text={f.text}
            optional={f.optional}
            placeholder={f.placeholder}
            onChange={v => onChange(f.key, v)}
          />
        ),
      )}
    </View>
  );
}
const styles = StyleSheet.create({ form: { gap: 12 } });
