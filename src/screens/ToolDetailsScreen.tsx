import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import AppSectionTitle from '../components/AppSectionTitle';
import {useLanguage} from '../context/LanguageContext';
import {getToolById} from '../data/toolCatalog';
import {openToolWorkspace} from '../navigation/toolNavigation';
import {COLORS} from '../theme/colors';
import {RootStackParamList} from '../types/navigation';
import {getLocalizedText} from '../types/tool';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ToolDetails'
>;

const ToolDetailsScreen = ({navigation, route}: Props) => {
  const {language, strings} = useLanguage();
  const tool = getToolById(route.params.toolId);

  if (!tool) {
    return (
      <AppScreen>
        <AppHeader
          leftIconName="arrow-left"
          onLeftPress={() => navigation.goBack()}
          title="Tool Details"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => navigation.goBack()}
        title={getLocalizedText(tool.title, language)}
      />

      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <View
            style={[
              styles.shortCodeBadge,
              {backgroundColor: tool.accentColor},
            ]}>
            <Text style={styles.shortCodeText}>
              {tool.shortCode}
            </Text>
          </View>
          <Text style={styles.description}>
            {getLocalizedText(tool.description, language)}
          </Text>
        </View>

        <AppSectionTitle title={strings.keyHighlights} />
        {tool.highlights.map((item, index) => (
          <View
            key={`${tool.id}-highlight-${index}`}
            style={styles.listCard}>
            <Text style={styles.listText}>
              {getLocalizedText(item, language)}
            </Text>
          </View>
        ))}

        <AppSectionTitle title={strings.stepsToUse} />
        {tool.steps.map((item, index) => (
          <View
            key={`${tool.id}-step-${index}`}
            style={styles.stepCard}>
            <Text style={styles.stepIndex}>
              {index + 1}
            </Text>
            <Text style={styles.stepText}>
              {getLocalizedText(item, language)}
            </Text>
          </View>
        ))}

        <AppPressable
          onPress={() =>
            openToolWorkspace(navigation, tool.id, language)
          }
          style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {tool.url
              ? strings.openOfficialSite
              : strings.openLabel}
          </Text>
        </AppPressable>

        {tool.premium ? (
          <AppPressable
            onPress={() => navigation.goBack()}
            style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              {strings.goToPremium}
            </Text>
          </AppPressable>
        ) : null}
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    marginBottom: 18,
    padding: 18,
  },
  shortCodeBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 16,
    justifyContent: 'center',
    marginBottom: 14,
    minWidth: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  shortCodeText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  description: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginBottom: 10,
    padding: 16,
  },
  listText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 21,
  },
  stepCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 16,
  },
  stepIndex: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
    marginRight: 14,
  },
  stepText: {
    color: COLORS.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    marginTop: 18,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 18,
    marginTop: 12,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
});

export default ToolDetailsScreen;
