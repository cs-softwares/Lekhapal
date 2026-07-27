import React, {useMemo} from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {COLORS} from '../../theme/colors';

type FieldPlanPreviewProps = {
  bottomLabel: string;
  leftLabel: string;
  rightLabel: string;
  title: string;
  topLabel: string;
};

const clamp = (
  value: number,
  min: number,
  max: number,
) => Math.min(max, Math.max(min, value));

const toNumber = (value: string) => Number(value) || 0;

const MAX_PLOT_WIDTH = 184;
const MAX_PLOT_HEIGHT = 156;
const MIN_PLOT_SIZE = 42;

const FieldPlanPreview = ({
  bottomLabel,
  leftLabel,
  rightLabel,
  title,
  topLabel,
}: FieldPlanPreviewProps) => {
  const layout = useMemo(() => {
    const horizontal =
      (Math.max(toNumber(topLabel), 1) +
        Math.max(toNumber(bottomLabel), 1)) /
      2;
    const vertical =
      (Math.max(toNumber(leftLabel), 1) +
        Math.max(toNumber(rightLabel), 1)) /
      2;
    const ratio = clamp(
      horizontal / Math.max(vertical, 1),
      0.28,
      3.6,
    );

    if (ratio >= 1) {
      return {
        plotHeight: clamp(
          MAX_PLOT_WIDTH / ratio,
          MIN_PLOT_SIZE,
          MAX_PLOT_HEIGHT,
        ),
        plotWidth: MAX_PLOT_WIDTH,
        ratioLabel: `${horizontal} : ${vertical}`,
      };
    }

    return {
      plotHeight: MAX_PLOT_HEIGHT,
      plotWidth: clamp(
        MAX_PLOT_HEIGHT * ratio,
        MIN_PLOT_SIZE,
        MAX_PLOT_WIDTH,
      ),
      ratioLabel: `${horizontal} : ${vertical}`,
    };
  }, [bottomLabel, leftLabel, rightLabel, topLabel]);

  const sizeLabel = `${topLabel} x ${leftLabel}`;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.canvas}>
        <View style={styles.topBadgeRow}>
          <View style={styles.topBadge}>
            <Text style={styles.badgeText}>{topLabel}</Text>
          </View>
        </View>

        <View style={styles.middleRow}>
          <View style={styles.sideBadge}>
            <Text style={styles.badgeText}>{leftLabel}</Text>
          </View>

          <View style={styles.middleColumn}>
            <View
              style={[
                styles.plotCard,
                {
                  height: layout.plotHeight,
                  width: layout.plotWidth,
                },
              ]}>
              <View style={styles.cornerDotTopLeft} />
              <View style={styles.cornerDotTopRight} />
              <View style={styles.cornerDotBottomLeft} />
              <View style={styles.cornerDotBottomRight} />
            </View>

            <Text style={styles.fieldCaption}>
              {`Field shape: ${sizeLabel}`}
            </Text>
            <Text style={styles.fieldRatio}>
              {`Preview ratio ${layout.ratioLabel}`}
            </Text>
          </View>

          <View style={styles.sideBadge}>
            <Text style={styles.badgeText}>{rightLabel}</Text>
          </View>
        </View>

        <View style={styles.bottomBadgeRow}>
          <View style={styles.bottomBadge}>
            <Text style={styles.badgeText}>
              {bottomLabel}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.note}>
        The field preview now scales directly from the
        entered length and width
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  bottomBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 86,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bottomBadgeRow: {
    alignItems: 'center',
    marginTop: 14,
  },
  canvas: {
    alignItems: 'center',
    backgroundColor: '#F6F9FF',
    borderColor: COLORS.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  cornerDotBottomLeft: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    bottom: 10,
    height: 8,
    left: 10,
    position: 'absolute',
    width: 8,
  },
  cornerDotBottomRight: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    bottom: 10,
    height: 8,
    position: 'absolute',
    right: 10,
    width: 8,
  },
  cornerDotTopLeft: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    height: 8,
    left: 10,
    position: 'absolute',
    top: 10,
    width: 8,
  },
  cornerDotTopRight: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    height: 8,
    position: 'absolute',
    right: 10,
    top: 10,
    width: 8,
  },
  fieldCaption: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  fieldRatio: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  middleColumn: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  middleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  note: {
    color: COLORS.textSoft,
    fontSize: 11,
    marginTop: 6,
  },
  plotCard: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#DCEBFF',
    borderColor: COLORS.primary,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  sideBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 54,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  topBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 86,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  topBadgeRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  wrapper: {
    marginTop: 12,
  },
});

export default FieldPlanPreview;
