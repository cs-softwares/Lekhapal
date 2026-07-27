import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import AppHeader from '../components/AppHeader';
import AppScreen from '../components/AppScreen';
import AppSectionTitle from '../components/AppSectionTitle';
import DashboardBlockButton from '../components/DashboardBlockButton';
import {useLanguage} from '../context/LanguageContext';
import {BIHAR_BHUMI_OFFICER_ITEMS} from '../data/biharBhumiOfficerCatalog';
import {COLORS} from '../theme/colors';
import {RootStackParamList} from '../types/navigation';
import {getLocalizedText} from '../types/tool';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'BiharBhumiOfficer'
>;

const BiharBhumiOfficerScreen = ({
  navigation,
}: Props) => {
  const {language} = useLanguage();

  const screenTitle =
    language === 'hi'
      ? 'बिहारभूमि अधिकारी'
      : 'BiharBhumi Officer';
  const introTitle =
    language === 'hi'
      ? 'अधिकारी विकल्प'
      : 'Officer options';
  const introBody =
    language === 'hi'
      ? 'यहां से बिहारभूमि के वही आधिकारिक अधिकारी लॉगिन और संबंधित सेवाएं खोलें जो असली पोर्टल में मिलती हैं।'
      : 'Open the same official BiharBhumi officer logins and related services from here.';

  return (
    <AppScreen>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => navigation.goBack()}
        title={screenTitle}
      />

      <View style={styles.content}>
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>{introTitle}</Text>
          <Text style={styles.introBody}>{introBody}</Text>
        </View>

        <AppSectionTitle
          title={
            language === 'hi'
              ? 'आधिकारिक बिहारभूमि रूट'
              : 'Official BiharBhumi Routes'
          }
        />

        <View style={styles.blockGrid}>
          {BIHAR_BHUMI_OFFICER_ITEMS.map(item => (
            <View
              key={item.id}
              style={styles.blockCell}>
              <DashboardBlockButton
                accentColor={item.accentColor}
                helper={getLocalizedText(item.helper, language)}
                icon={item.icon}
                label={getLocalizedText(item.label, language)}
                onPress={() =>
                  navigation.navigate('WebViewPortal', {
                    title: getLocalizedText(item.label, language),
                    url: item.url,
                  })
                }
              />
            </View>
          ))}
        </View>
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  blockCell: {
    marginBottom: 12,
    width: '48.3%',
  },
  blockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  introBody: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  introCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 18,
    padding: 18,
  },
  introTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
});

export default BiharBhumiOfficerScreen;
