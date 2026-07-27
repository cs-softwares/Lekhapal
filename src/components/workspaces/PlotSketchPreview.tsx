import React, {useMemo} from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {COLORS} from '../../theme/colors';

type PlotSketchPreviewProps = {
  bottomLabel: string;
  leftLabel: string;
  rightLabel: string;
  topLabel: string;
  title: string;
};

type Point = {
  x: number;
  y: number;
};

const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 220;
const STRIP_COUNT = 28;

const clamp = (
  value: number,
  min: number,
  max: number,
) => Math.min(max, Math.max(min, value));

const toNumber = (value: string) => Number(value) || 0;

const normalizeLength = (
  value: number,
  maxValue: number,
  minVisual: number,
  maxVisual: number,
) => {
  const ratio = Math.max(value, 1) / Math.max(maxValue, 1);

  return minVisual + ratio * (maxVisual - minVisual);
};

const lerp = (
  start: number,
  end: number,
  progress: number,
) => start + (end - start) * progress;

const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

const buildSimpleScaledShape = (
  topValue: number,
  rightValue: number,
  bottomValue: number,
  leftValue: number,
) => {
  const maxValue = Math.max(
    topValue,
    rightValue,
    bottomValue,
    leftValue,
    1,
  );
  const topWidth = normalizeLength(
    topValue,
    maxValue,
    28,
    152,
  );
  const bottomWidth = normalizeLength(
    bottomValue,
    maxValue,
    28,
    152,
  );
  const leftLength = normalizeLength(
    leftValue,
    maxValue,
    46,
    134,
  );
  const rightLength = normalizeLength(
    rightValue,
    maxValue,
    46,
    134,
  );

  let best:
    | {
        bottomLeftX: number;
        bottomRightX: number;
        height: number;
        score: number;
      }
    | undefined;

  const topLeftX = 0;
  const topRightX = topWidth;

  for (
    let height = Math.floor(
      Math.min(leftLength, rightLength),
    );
    height >= 18;
    height -= 1
  ) {
    const leftDx = Math.sqrt(
      Math.max(leftLength * leftLength - height * height, 0),
    );
    const rightDx = Math.sqrt(
      Math.max(
        rightLength * rightLength - height * height,
        0,
      ),
    );

    const candidates = [
      {
        bottomLeftX: topLeftX - leftDx,
        bottomRightX: topRightX + rightDx,
      },
      {
        bottomLeftX: topLeftX + leftDx,
        bottomRightX: topRightX - rightDx,
      },
      {
        bottomLeftX: topLeftX + leftDx,
        bottomRightX: topRightX + rightDx,
      },
      {
        bottomLeftX: topLeftX - leftDx,
        bottomRightX: topRightX - rightDx,
      },
    ];

    candidates.forEach(candidate => {
      const width =
        candidate.bottomRightX - candidate.bottomLeftX;

      if (width <= 8) {
        return;
      }

      const widthError = Math.abs(width - bottomWidth);
      const centerError = Math.abs(
        (candidate.bottomLeftX +
          candidate.bottomRightX) /
          2 -
          topWidth / 2,
      );
      const shapeBias =
        bottomWidth > topWidth
          ? Math.max(0, topWidth - width)
          : Math.max(0, width - topWidth);

      const score =
        widthError * 5 +
        centerError * 0.45 +
        shapeBias * 0.8;

      if (!best || score < best.score) {
        best = {
          bottomLeftX: candidate.bottomLeftX,
          bottomRightX: candidate.bottomRightX,
          height,
          score,
        };
      }
    });
  }

  if (!best) {
    return {
      bottomLeft: {x: 102, y: 162},
      bottomRight: {x: 178, y: 162},
      topLeft: {x: 88, y: 52},
      topRight: {x: 192, y: 52},
    };
  }

  const rawPoints = [
    {x: topLeftX, y: 0},
    {x: topRightX, y: 0},
    {x: best.bottomRightX, y: best.height},
    {x: best.bottomLeftX, y: best.height},
  ];
  const minX = Math.min(...rawPoints.map(point => point.x));
  const maxX = Math.max(...rawPoints.map(point => point.x));
  const rawWidth = Math.max(maxX - minX, 1);
  const rawHeight = Math.max(best.height, 1);
  const scale = Math.min(
    (CANVAS_WIDTH - 72) / rawWidth,
    (CANVAS_HEIGHT - 84) / rawHeight,
  );

  const mapPoint = (point: Point): Point => ({
    x:
      (point.x - minX) * scale +
      (CANVAS_WIDTH - rawWidth * scale) / 2,
    y:
      point.y * scale +
      (CANVAS_HEIGHT - rawHeight * scale) / 2,
  });

  return {
    bottomLeft: mapPoint(rawPoints[3]),
    bottomRight: mapPoint(rawPoints[2]),
    topLeft: mapPoint(rawPoints[0]),
    topRight: mapPoint(rawPoints[1]),
  };
};

const PlotSketchPreview = ({
  bottomLabel,
  leftLabel,
  rightLabel,
  topLabel,
  title,
}: PlotSketchPreviewProps) => {
  const layout = useMemo(() => {
    const topValue = Math.max(toNumber(topLabel), 1);
    const rightValue = Math.max(toNumber(rightLabel), 1);
    const bottomValue = Math.max(toNumber(bottomLabel), 1);
    const leftValue = Math.max(toNumber(leftLabel), 1);

    const {
      bottomLeft,
      bottomRight,
      topLeft,
      topRight,
    } = buildSimpleScaledShape(
      topValue,
      rightValue,
      bottomValue,
      leftValue,
    );

    const topMid = midpoint(topLeft, topRight);
    const bottomMid = midpoint(bottomLeft, bottomRight);
    const leftMid = midpoint(topLeft, bottomLeft);
    const rightMid = midpoint(topRight, bottomRight);
    const stripHeight = clamp(
      (bottomLeft.y - topLeft.y) / STRIP_COUNT + 1,
      3,
      7,
    );

    return {
      bottomBadgeLeft: clamp(
        bottomMid.x - 34,
        8,
        CANVAS_WIDTH - 76,
      ),
      bottomBadgeTop: clamp(
        bottomMid.y + 10,
        0,
        CANVAS_HEIGHT - 42,
      ),
      bottomLeft,
      bottomRight,
      leftBadgeLeft: clamp(
        leftMid.x - 74,
        0,
        CANVAS_WIDTH - 76,
      ),
      leftBadgeTop: clamp(
        leftMid.y - 18,
        0,
        CANVAS_HEIGHT - 42,
      ),
      rightBadgeLeft: clamp(
        rightMid.x + 14,
        0,
        CANVAS_WIDTH - 76,
      ),
      rightBadgeTop: clamp(
        rightMid.y - 18,
        0,
        CANVAS_HEIGHT - 42,
      ),
      strips: Array.from(
        {length: STRIP_COUNT},
        (_, index) => {
          const progress =
            index / (STRIP_COUNT - 1);
          const leftX = lerp(
            topLeft.x,
            bottomLeft.x,
            progress,
          );
          const rightX = lerp(
            topRight.x,
            bottomRight.x,
            progress,
          );
          const y = lerp(
            topLeft.y,
            bottomLeft.y,
            progress,
          );

          return {
            leftX,
            rightX,
            y,
          };
        },
      ),
      stripHeight,
      topBadgeLeft: clamp(
        topMid.x - 34,
        8,
        CANVAS_WIDTH - 76,
      ),
      topBadgeTop: clamp(
        topMid.y - 44,
        0,
        CANVAS_HEIGHT - 42,
      ),
      topLeft,
      topRight,
    };
  }, [bottomLabel, leftLabel, rightLabel, topLabel]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.canvas}>
        {layout.strips.map((strip, index) => (
          <React.Fragment key={`strip-${index}`}>
            <View
              style={[
                styles.fillStrip,
                {
                  height: layout.stripHeight,
                  left: strip.leftX,
                  top: strip.y,
                  width: Math.max(
                    strip.rightX - strip.leftX,
                    2,
                  ),
                },
              ]}
            />
            <View
              style={[
                styles.edgeStrip,
                {
                  height: layout.stripHeight,
                  left: strip.leftX,
                  top: strip.y,
                },
              ]}
            />
            <View
              style={[
                styles.edgeStrip,
                {
                  height: layout.stripHeight,
                  left: strip.rightX - 2,
                  top: strip.y,
                },
              ]}
            />
          </React.Fragment>
        ))}

        <View
          style={[
            styles.horizontalEdge,
            {
              left: layout.topLeft.x,
              top: layout.topLeft.y,
              width: layout.topRight.x - layout.topLeft.x,
            },
          ]}
        />
        <View
          style={[
            styles.horizontalEdge,
            {
              left: layout.bottomLeft.x,
              top: layout.bottomLeft.y,
              width:
                layout.bottomRight.x - layout.bottomLeft.x,
            },
          ]}
        />

        {[layout.topLeft, layout.topRight, layout.bottomRight, layout.bottomLeft].map(
          (point, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.cornerDot,
                {
                  left: point.x - 5,
                  top: point.y - 5,
                },
              ]}
            />
          ),
        )}

        <View
          style={[
            styles.badge,
            {
              left: layout.topBadgeLeft,
              top: layout.topBadgeTop,
            },
          ]}>
          <Text style={styles.badgeText}>{topLabel}</Text>
        </View>

        <View
          style={[
            styles.badge,
            {
              left: layout.bottomBadgeLeft,
              top: layout.bottomBadgeTop,
            },
          ]}>
          <Text style={styles.badgeText}>
            {bottomLabel}
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            {
              left: layout.leftBadgeLeft,
              top: layout.leftBadgeTop,
            },
          ]}>
          <Text style={styles.badgeText}>{leftLabel}</Text>
        </View>

        <View
          style={[
            styles.badge,
            {
              left: layout.rightBadgeLeft,
              top: layout.rightBadgeTop,
            },
          ]}>
          <Text style={styles.badgeText}>
            {rightLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.note}>
        Simple scaled sketch from the entered side
        values
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 68,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
    zIndex: 4,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  canvas: {
    backgroundColor: '#F6F9FF',
    borderColor: COLORS.border,
    borderRadius: 24,
    borderWidth: 1,
    height: CANVAS_HEIGHT,
    marginTop: 12,
    overflow: 'hidden',
    position: 'relative',
    width: CANVAS_WIDTH,
  },
  cornerDot: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    height: 10,
    position: 'absolute',
    width: 10,
    zIndex: 3,
  },
  edgeStrip: {
    backgroundColor: COLORS.primary,
    position: 'absolute',
    width: 2,
    zIndex: 2,
  },
  fillStrip: {
    backgroundColor: '#DCEBFF',
    position: 'absolute',
    zIndex: 1,
  },
  horizontalEdge: {
    backgroundColor: COLORS.primary,
    height: 3,
    position: 'absolute',
    zIndex: 2,
  },
  note: {
    color: COLORS.textSoft,
    fontSize: 11,
    marginTop: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  wrapper: {
    marginTop: 12,
  },
});

export default PlotSketchPreview;
