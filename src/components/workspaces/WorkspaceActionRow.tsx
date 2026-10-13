import { useLanguage } from '../../context/LanguageContext';
import { PremiumLockBadge } from '../premium/PremiumLock';
import { usePremiumFeatures } from '../../hooks/usePremiumFeatures';
import { requestPremiumAccess } from '../../services/premiumAccess';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../theme/colors';
import AppPressable from '../AppPressable';

type WorkspaceActionRowProps = {
  exportDisabled?: boolean;
  labels: {
    save: string;
    share: string;
    pdf: string;
    image: string;
  };
  onExportImage: () => void;
  onExportPdf: () => void;
  onSave: () => void;
  onShare: () => void;
};

const WorkspaceActionRow = ({
  exportDisabled = false,
  labels,
  onExportImage,
  onExportPdf,
  onSave,
  onShare,
}: WorkspaceActionRowProps) => {
  const premium = usePremiumFeatures();
  const { language } = useLanguage();
  const actions = [
    {
      key: 'save',
      label: labels.save,
      icon: 'content-save-outline',
      onPress: onSave,
      tone: 'primary',
    },
    {
      key: 'share',
      label: labels.share,
      icon: 'share-variant-outline',
      onPress: onShare,
      tone: 'soft',
    },
    {
      key: 'pdf',
      label: premium
        ? labels.pdf
        : language === 'hi'
        ? 'PDF अनलॉक करें'
        : 'Unlock PDF',
      icon: premium ? 'file-pdf-box' : 'lock-outline',
      onPress: () => {
        if (requestPremiumAccess('pdf_reports')) onExportPdf();
      },
      tone: 'soft',
    },
    {
      key: 'image',
      label: labels.image,
      icon: 'image-outline',
      onPress: onExportImage,
      tone: 'soft',
    },
  ] as const;

  return (
    <View style={styles.row}>
      {actions.map(action => {
        const primaryTone = action.tone === 'primary';

        return (
          <AppPressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={
              action.key === 'pdf' && !premium
                ? `${action.label} · Premium`
                : action.label
            }
            onPress={action.onPress}
            style={[
              styles.button,
              primaryTone ? styles.buttonPrimary : styles.buttonSoft,
              action.key === 'pdf' && !premium && styles.lockedButton,
              exportDisabled && action.key !== 'save' && styles.buttonDisabled,
            ]}
          >
            <Icon
              color={primaryTone ? COLORS.white : COLORS.primaryDark}
              name={action.icon}
              size={18}
            />
            <Text
              style={[
                styles.buttonText,
                primaryTone ? styles.buttonTextPrimary : styles.buttonTextSoft,
              ]}
            >
              {action.label}
            </Text>
            {action.key === 'pdf' && !premium && <PremiumLockBadge />}
          </AppPressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  button: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  buttonSoft: {
    backgroundColor: COLORS.primarySoft,
  },
  lockedButton: {
    borderColor: '#A86D12',
    borderWidth: 2,
    gap: 8,
    flexWrap: 'wrap',
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  buttonTextPrimary: {
    color: COLORS.white,
  },
  buttonTextSoft: {
    color: COLORS.primaryDark,
  },
});

export default WorkspaceActionRow;
