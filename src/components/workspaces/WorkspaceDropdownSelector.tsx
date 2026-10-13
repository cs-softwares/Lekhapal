import React, {
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {COLORS} from '../../theme/colors';
import AppPressable from '../AppPressable';

type WorkspaceDropdownOption = {
  label: string;
  value: string;
};

type WorkspaceDropdownSelectorProps = {
  accentColor?: string;
  borderColor?: string;
  compact?: boolean;
  iconSurfaceColor?: string;
  label: string;
  onSelect: (value: string) => void;
  options: WorkspaceDropdownOption[];
  selectedValue: string;
  surfaceColor?: string;
  triggerBackgroundColor?: string;
};

const WorkspaceDropdownSelector = ({
  accentColor = COLORS.primary,
  borderColor = COLORS.border,
  compact = false,
  iconSurfaceColor = COLORS.primarySoft,
  label,
  onSelect,
  options,
  selectedValue,
  surfaceColor = COLORS.primarySoft,
  triggerBackgroundColor = COLORS.white,
}: WorkspaceDropdownSelectorProps) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = useMemo(
    () =>
      options.find(option => option.value === selectedValue) ??
      options[0],
    [options, selectedValue],
  );

  const arrowRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [42, 0],
  });

  const animateTo = (toValue: number, onDone?: () => void) => {
    Animated.timing(progress, {
      duration: 190,
      easing: Easing.out(Easing.cubic),
      toValue,
      useNativeDriver: true,
    }).start(() => {
      onDone?.();
    });
  };

  const openModal = () => {
    if (modalVisible) {
      return;
    }

    setModalVisible(true);
    requestAnimationFrame(() => {
      animateTo(1);
    });
  };

  const closeModal = () => {
    animateTo(0, () => {
      setModalVisible(false);
    });
  };

  return (
    <View style={styles.field}>
      <Text
        style={[
          styles.label,
          compact && styles.labelCompact,
        ]}>
        {label}
      </Text>

      <AppPressable
        onPress={openModal}

        pressedOpacity={0.9}
        style={[
          styles.trigger,
          compact && styles.triggerCompact,
          {
            backgroundColor: triggerBackgroundColor,
            borderColor,
          },
        ]}>
        <View style={styles.triggerContent}>
          <View
            style={[
              styles.iconWrap,
              compact && styles.iconWrapCompact,
              {
                backgroundColor: iconSurfaceColor,
              },
            ]}>
            <Icon
              color={accentColor}
              name="chevron-down-circle-outline"
              size={18}
            />
          </View>

          <Text
            numberOfLines={1}
            style={[
              styles.triggerValue,
              compact && styles.triggerValueCompact,
            ]}>
            {selectedOption?.label ?? ''}
          </Text>
        </View>

        <Animated.View
          style={{
            transform: [{rotate: arrowRotation}],
          }}>
          <Icon
            color={accentColor}
            name="chevron-down"
            size={compact ? 20 : 22}
          />
        </Animated.View>
      </AppPressable>

      {modalVisible ? (
        <Modal
          onRequestClose={closeModal}
          statusBarTranslucent
          transparent
          visible>
          <View style={styles.modalRoot}>
            <AppPressable
              onPress={closeModal}

              style={styles.backdropPressable}>
              <Animated.View
                style={[
                  styles.backdrop,
                  {
                    opacity: backdropOpacity,
                  },
                ]}
              />
            </AppPressable>

            <Animated.View
              style={[
                styles.sheet,
                {
                  opacity: progress,
                  transform: [{translateY: sheetTranslateY}],
                },
              ]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{label}</Text>

              <ScrollView
                contentContainerStyle={styles.optionList}
                showsVerticalScrollIndicator={false}>
                {options.map(option => {
                  const selected =
                    option.value === selectedValue;

                  return (
                    <AppPressable
                      key={option.value}
                      onPress={() => {
                        onSelect(option.value);
                        closeModal();
                      }}

                      pressedOpacity={0.88}
                      style={[
                        styles.optionCard,
                        selected && {
                          backgroundColor: surfaceColor,
                          borderColor: accentColor,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.optionText,
                          selected && {
                            color: accentColor,
                          },
                        ]}>
                        {option.label}
                      </Text>

                      <Icon
                        color={
                          selected
                            ? accentColor
                            : COLORS.textSoft
                        }
                        name={
                          selected
                            ? 'check-circle'
                            : 'circle-outline'
                        }
                        size={18}
                      />
                    </AppPressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: COLORS.overlay,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  backdropPressable: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  field: {
    marginBottom: 14,
  },
  iconWrap: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconWrapCompact: {
    height: 32,
    width: 32,
  },
  label: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  labelCompact: {
    fontSize: 12,
    marginBottom: 6,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  optionCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  optionList: {
    paddingTop: 8,
  },
  optionText: {
    color: COLORS.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 14,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '70%',
    paddingBottom: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: COLORS.border,
    borderRadius: 999,
    height: 5,
    width: 54,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
  },
  trigger: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 2,
  },
  triggerCompact: {
    borderRadius: 16,
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  triggerContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 10,
  },
  triggerValue: {
    color: COLORS.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 12,
  },
  triggerValueCompact: {
    fontSize: 13.5,
    marginLeft: 10,
  },
});

export default WorkspaceDropdownSelector;
