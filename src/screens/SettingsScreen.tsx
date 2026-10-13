import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import AppHeader from '../components/AppHeader';
import AppScreen from '../components/AppScreen';
import AppSectionTitle from '../components/AppSectionTitle';
import SettingRow from '../components/SettingRow';
import {useAppTheme} from '../context/ThemeContext';
import {useLanguage} from '../context/LanguageContext';
import {
  UP_BHULEKH_HISTORY_STORAGE_KEY,
  UP_BHULEKH_PRESET_STORAGE_KEY,
} from '../data/homeQuickStats';
import {selectDrawerSection} from '../navigation/drawerHelpers';

const WORKSPACE_RECORDS_PREFIX = 'smart-work-records-';

const SettingsScreen = () => {
  const {language} = useLanguage();
  const {colors} = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          paddingBottom: 28,
          paddingHorizontal: 16,
          paddingTop: 18,
        },
        noteText: {
          color: colors.textSoft,
          fontSize: 12,
          lineHeight: 18,
          marginBottom: 18,
          marginTop: 6,
        },
      }),
    [colors],
  );

  const copy =
    language === 'hi'
      ? {
          title: 'Settings',
          dataTitle: 'Data',
          clearRecordsTitle: 'Saved records हटाएँ',
          clearRecordsBody:
            'इस phone से saved reports, measurement saves, calculator saves और workspace records हटते हैं।',
          clearPortalTitle: 'Portal history हटाएँ',
          clearPortalBody:
            'Saved Bhulekh memory, recent portal history और remembered state selection हटता है।',
          clearAction: 'Clear',
          resetAction: 'Reset',
          confirmTitle: 'Confirm करें',
          clearRecordsConfirm:
            'क्या आप इस phone से सभी saved app records हटाना चाहते हैं?',
          clearPortalConfirm:
            'क्या आप saved portal history और remembered portal selections हटाना चाहते हैं?',
          cancel: 'Cancel',
          proceed: 'Continue',
          recordsDoneTitle: 'Saved records cleared',
          recordsDoneBody:
            'Saved workspace records इस phone से हटा दिए गए हैं।',
          portalDoneTitle: 'Portal history cleared',
          portalDoneBody:
            'Saved portal memory और state selection clear कर दिए गए हैं।',
          nothingTitle: 'Nothing to clear',
          recordsNothingBody:
            'इस phone पर कोई saved workspace record नहीं मिला।',
          portalNothingBody:
            'इस phone पर कोई saved portal history नहीं मिली।',
          dangerNote:
            'ये actions सिर्फ इस phone की app memory clear करते हैं। Official websites से कुछ भी नहीं हटता।',
        }
      : {
          title: 'Settings',
          dataTitle: 'Data',
          clearRecordsTitle: 'Clear saved records',
          clearRecordsBody:
            'Removes saved reports, measurement saves, calculator saves, and workspace records from this phone.',
          clearPortalTitle: 'Clear portal history',
          clearPortalBody:
            'Removes saved Bhulekh memory, recent portal history, and remembered state selection.',
          clearAction: 'Clear',
          resetAction: 'Reset',
          confirmTitle: 'Please confirm',
          clearRecordsConfirm:
            'Do you want to remove all saved app records from this phone?',
          clearPortalConfirm:
            'Do you want to remove saved portal history and remembered portal selections?',
          cancel: 'Cancel',
          proceed: 'Continue',
          recordsDoneTitle: 'Saved records cleared',
          recordsDoneBody:
            'Saved workspace records have been removed from this phone.',
          portalDoneTitle: 'Portal history cleared',
          portalDoneBody:
            'Saved portal memory and state selection have been cleared.',
          nothingTitle: 'Nothing to clear',
          recordsNothingBody:
            'No saved workspace records were found on this phone.',
          portalNothingBody:
            'No saved portal history was found on this phone.',
          dangerNote:
            'These actions clear only app memory on this phone. They do not remove anything from official websites.',
        };

  const clearSavedRecords = async () => {
    const allKeys = await AsyncStorage.getAllKeys();
    const recordKeys = allKeys.filter(key =>
      key.startsWith(WORKSPACE_RECORDS_PREFIX),
    );

    if (!recordKeys.length) {
      Alert.alert(
        copy.nothingTitle,
        copy.recordsNothingBody,
      );
      return;
    }

    await Promise.all(
      recordKeys.map(key => AsyncStorage.removeItem(key)),
    );
    Alert.alert(
      copy.recordsDoneTitle,
      copy.recordsDoneBody,
    );
  };

  const clearPortalHistory = async () => {
    const keysToClear = [
      UP_BHULEKH_PRESET_STORAGE_KEY,
      UP_BHULEKH_HISTORY_STORAGE_KEY,
    ];
    const values = await Promise.all(
      keysToClear.map(key => AsyncStorage.getItem(key)),
    );
    const existingKeys = keysToClear.filter(
      (_key, index) => values[index] !== null,
    );

    if (!existingKeys.length) {
      Alert.alert(
        copy.nothingTitle,
        copy.portalNothingBody,
      );
      return;
    }

    await Promise.all(
      existingKeys.map(key => AsyncStorage.removeItem(key)),
    );
    Alert.alert(
      copy.portalDoneTitle,
      copy.portalDoneBody,
    );
  };

  const confirmClearSavedRecords = () => {
    Alert.alert(copy.confirmTitle, copy.clearRecordsConfirm, [
      {
        style: 'cancel',
        text: copy.cancel,
      },
      {
        style: 'destructive',
        text: copy.proceed,
        onPress: () => {
          void clearSavedRecords();
        },
      },
    ]);
  };

  const confirmClearPortalHistory = () => {
    Alert.alert(copy.confirmTitle, copy.clearPortalConfirm, [
      {
        style: 'cancel',
        text: copy.cancel,
      },
      {
        style: 'destructive',
        text: copy.proceed,
        onPress: () => {
          void clearPortalHistory();
        },
      },
    ]);
  };

  return (
    <AppScreen>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => selectDrawerSection('Workspace')}
        title={copy.title}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <AppSectionTitle title={copy.dataTitle} />

        <SettingRow
          actionLabel={copy.clearAction}
          body={copy.clearRecordsBody}
          onPress={confirmClearSavedRecords}
          title={copy.clearRecordsTitle}
        />
        <SettingRow
          actionLabel={copy.resetAction}
          body={copy.clearPortalBody}
          onPress={confirmClearPortalHistory}
          title={copy.clearPortalTitle}
        />

        <Text style={styles.noteText}>{copy.dangerNote}</Text>
      </ScrollView>
    </AppScreen>
  );
};

export default SettingsScreen;
