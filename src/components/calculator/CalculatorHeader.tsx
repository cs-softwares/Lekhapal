import React from 'react';
import { StatusBar } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import AppHeader from '../AppHeader';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function CalculatorHeader({
  title,
  subtitle,
  onBack,
  onOpenSaved,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onOpenSaved?: () => void;
}) {
  const { colors, isDarkTheme } = useAppTheme();
  const { language } = useLanguage();
  const focused = useIsFocused();
  const headerColor = isDarkTheme ? '#1E3A8A' : colors.primary;
  return (
    <>
      {focused && (
        <StatusBar barStyle="light-content" backgroundColor={headerColor} />
      )}
      <AppHeader
        title={title}
        subtitle={subtitle}
        leftIconName="arrow-left"
        onLeftPress={onBack}
        rightIcons={
          onOpenSaved
            ? [
                {
                  iconName: 'notebook-outline',
                  accessibilityLabel:
                    language === 'hi'
                      ? 'सेव की गई गणनाएं'
                      : 'Saved calculations',
                  onPress: onOpenSaved,
                },
              ]
            : undefined
        }
      />
    </>
  );
}
