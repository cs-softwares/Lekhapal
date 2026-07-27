import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import AppSectionTitle from '../components/AppSectionTitle';
import {useAppTheme} from '../context/ThemeContext';
import {useAuthSession} from '../context/AuthSessionContext';
import {useLanguage} from '../context/LanguageContext';
import {selectDrawerSection} from '../navigation/drawerHelpers';

type PlanCardProps = {
  accentColor: string;
  badge?: string;
  body: string;
  buttonLabel: string;
  featured?: boolean;
  items: string[];
  onPress: () => void;
  title: string;
};

const PlanCard = ({
  accentColor,
  badge,
  body,
  buttonLabel,
  featured = false,
  items,
  onPress,
  title,
}: PlanCardProps) => {
  const {colors} = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        planCard: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 24,
          borderWidth: 1,
          marginBottom: 14,
          padding: 16,
        },
        planCardFeatured: {
          borderColor: colors.successSoft,
        },
        planHeaderRow: {
          alignItems: 'flex-start',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        },
        planHeaderCopy: {
          flex: 1,
          paddingRight: 12,
        },
        planTitle: {
          color: colors.text,
          fontSize: 20,
          fontWeight: '800',
          lineHeight: 24,
        },
        planBody: {
          color: colors.textMuted,
          fontSize: 13,
          lineHeight: 20,
          marginTop: 8,
        },
        planBadge: {
          marginTop: 4,
        },
        planBadgeText: {
          fontSize: 12,
          fontWeight: '800',
        },
        planFeatureList: {
          marginTop: 16,
        },
        planFeatureRow: {
          alignItems: 'center',
          flexDirection: 'row',
          marginBottom: 10,
        },
        planFeatureDot: {
          borderRadius: 999,
          height: 8,
          marginRight: 10,
          width: 8,
        },
        planFeatureText: {
          color: colors.text,
          flex: 1,
          fontSize: 14,
          lineHeight: 20,
        },
        planButton: {
          alignItems: 'center',
          borderRadius: 16,
          justifyContent: 'center',
          marginTop: 6,
          minHeight: 52,
          paddingHorizontal: 16,
        },
        planButtonPrimary: {
          backgroundColor: colors.success,
        },
        planButtonSecondary: {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.primarySoft,
          borderWidth: 1,
        },
        planButtonText: {
          fontSize: 14,
          fontWeight: '800',
        },
        planButtonTextPrimary: {
          color: colors.white,
        },
        planButtonTextSecondary: {
          color: colors.primary,
        },
      }),
    [colors],
  );
  return (
    <View
      style={[
        styles.planCard,
        featured && styles.planCardFeatured,
      ]}>
      <View style={styles.planHeaderRow}>
        <View style={styles.planHeaderCopy}>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planBody}>{body}</Text>
        </View>

        {badge ? (
          <View style={styles.planBadge}>
            <Text
              style={[
                styles.planBadgeText,
                {color: accentColor},
              ]}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.planFeatureList}>
        {items.map(item => (
          <View
            key={item}
            style={styles.planFeatureRow}>
            <View
              style={[
                styles.planFeatureDot,
                {backgroundColor: accentColor},
              ]}
            />
            <Text style={styles.planFeatureText}>{item}</Text>
          </View>
        ))}
      </View>

      <AppPressable
        onPress={onPress}
        pressEffect="slide"
        style={[
          styles.planButton,
          featured
            ? styles.planButtonPrimary
            : styles.planButtonSecondary,
        ]}>
        <Text
          style={[
            styles.planButtonText,
            featured
              ? styles.planButtonTextPrimary
              : styles.planButtonTextSecondary,
          ]}>
          {buttonLabel}
        </Text>
      </AppPressable>
    </View>
  );
};

const PremiumScreen = () => {
  const navigation = useNavigation<any>();
  const {language} = useLanguage();
  const {colors} = useAppTheme();
  const {session} = useAuthSession();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          paddingBottom: 28,
          paddingHorizontal: 16,
          paddingTop: 18,
        },
        benefitCard: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 22,
          borderWidth: 1,
          padding: 16,
        },
        benefitRow: {
          alignItems: 'center',
          flexDirection: 'row',
          marginBottom: 12,
        },
        benefitDot: {
          backgroundColor: colors.success,
          borderRadius: 999,
          height: 8,
          marginRight: 10,
          width: 8,
        },
        benefitText: {
          color: colors.text,
          flex: 1,
          fontSize: 14,
          lineHeight: 20,
        },
        noteText: {
          color: colors.textMuted,
          fontSize: 12,
          lineHeight: 18,
          marginTop: 14,
        },
      }),
    [colors],
  );

  const isPremium = session?.plan === 'premium';

  const copy =
    language === 'hi'
      ? {
          title: 'प्रीमियम',
          choosePlan: 'प्लान चुनें',
          weeklyTitle: 'साप्ताहिक एक्सेस',
          weeklyBody:
            'ट्रायल, छोटे समय के काम, या जल्दी फील्ड उपयोग के लिए सही।',
          weeklyBadge: '7 दिन',
          weeklyItems: [
            'सेव्ड रिकॉर्ड्स और क्विक रीओपन',
            'PDF और इमेज एक्सपोर्ट टूल्स',
            'पोर्टल और डेली वर्क तक तेज़ पहुंच',
          ],
          monthlyTitle: 'मासिक एक्सेस',
          monthlyBody:
            'नियमित दैनिक काम और बार-बार उपयोग के लिए बेहतर।',
          monthlyBadge: '30 दिन',
          monthlyItems: [
            'साप्ताहिक प्लान की सभी सुविधाएं',
            'ऑफिस और फील्ड दोनों में नियमित उपयोग',
            'रिकॉर्ड और रिपोर्ट के लिए अधिक आसान रुटीन',
          ],
          featuredTag: 'Best',
          activate: isPremium
            ? 'अकाउंट खोलें'
            : 'लॉग इन करके एक्टिव करें',
          benefitsTitle: 'प्रीमियम में क्या मिलेगा',
          benefits: [
            'सेव्ड रिकॉर्ड्स को जल्दी दोबारा खोल सकेंगे',
            'रिपोर्ट के लिए एक्सपोर्ट विकल्प मिलेंगे',
            'ज़रूरी टूल्स एक जगह साफ तरीके से मिलेंगे',
          ],
          note:
            'रियल पेमेंट कनेक्शन बाद में जोड़ा जा सकता है। अभी यह स्क्रीन प्लान को साफ तरीके से दिखाती है।',
        }
      : {
          title: 'Premium',
          choosePlan: 'Choose plan',
          weeklyTitle: 'Weekly access',
          weeklyBody:
            'Good for trial use, urgent field work, or short-term access.',
          weeklyBadge: '7 days',
          weeklyItems: [
            'Saved records and quick reopen',
            'PDF and image export tools',
            'Fast portal and daily work access',
          ],
          monthlyTitle: 'Monthly access',
          monthlyBody:
            'Better for regular daily work with repeat use across tools.',
          monthlyBadge: '30 days',
          monthlyItems: [
            'Everything in weekly access',
            'Better for repeated office and field use',
            'Cleaner routine for daily records and reports',
          ],
          featuredTag: 'Best',
          activate: isPremium
            ? 'Open account'
            : 'Log in to activate',
          benefitsTitle: 'Included in premium',
          benefits: [
            'Saved records stay easy to reopen',
            'Exports remain available for reports',
            'Useful tools stay grouped in one place',
          ],
          note:
            'Real payment connection can be linked later. This screen keeps the plan options clear and ready.',
        };

  const handleActivate = () => {
    if (isPremium) {
      navigation.navigate('Profile');
      return;
    }

    navigation.navigate('Login');
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
        <AppSectionTitle title={copy.choosePlan} />

        <PlanCard
          accentColor={colors.warning}
          badge={copy.weeklyBadge}
          body={copy.weeklyBody}
          buttonLabel={copy.activate}
          items={copy.weeklyItems}
          onPress={handleActivate}
          title={copy.weeklyTitle}
        />

        <PlanCard
          accentColor={colors.success}
          badge={copy.featuredTag}
          body={copy.monthlyBody}
          buttonLabel={copy.activate}
          featured
          items={copy.monthlyItems}
          onPress={handleActivate}
          title={copy.monthlyTitle}
        />

        <AppSectionTitle title={copy.benefitsTitle} />

        <View style={styles.benefitCard}>
          {copy.benefits.map(item => (
            <View
              key={item}
              style={styles.benefitRow}>
              <View style={styles.benefitDot} />
              <Text style={styles.benefitText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.noteText}>{copy.note}</Text>
      </ScrollView>
    </AppScreen>
  );
};

export default PremiumScreen;
