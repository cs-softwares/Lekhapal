import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {COLORS} from '../../theme/colors';
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
      label: labels.pdf,
      icon: 'file-pdf-box',
      onPress: onExportPdf,
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
            onPress={action.onPress}
            pressEffect="slide"
            style={[
              styles.button,
              primaryTone
                ? styles.buttonPrimary
                : styles.buttonSoft,
              exportDisabled &&
                action.key !== 'save' &&
                styles.buttonDisabled,
            ]}>
            <Icon
              color={
                primaryTone
                  ? COLORS.white
                  : COLORS.primaryDark
              }
              name={action.icon}
              size={18}
            />
            <Text
              style={[
                styles.buttonText,
                primaryTone
                  ? styles.buttonTextPrimary
                  : styles.buttonTextSoft,
              ]}>
              {action.label}
            </Text>
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
