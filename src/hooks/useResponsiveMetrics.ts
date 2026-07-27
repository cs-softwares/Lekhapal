import {Dimensions} from 'react-native';

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

const clamp = (
  value: number,
  min: number,
  max: number,
) => Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value);

type ScaleOptions = {
  maxFactor?: number;
  minFactor?: number;
};

export const useResponsiveMetrics = () => {
  const {height, width} = Dimensions.get('window');
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const widthRatio = shortestSide / BASE_WIDTH;
  const heightRatio = longestSide / BASE_HEIGHT;
  const isCompactPhone = shortestSide < 360;
  const isLargePhone = shortestSide >= 430;

  const scale = (
    value: number,
    options?: ScaleOptions,
  ) =>
    round(
      clamp(
        value * widthRatio,
        value * (options?.minFactor ?? 0.9),
        value * (options?.maxFactor ?? 1.14),
      ),
    );

  const verticalScale = (
    value: number,
    options?: ScaleOptions,
  ) =>
    round(
      clamp(
        value * heightRatio,
        value * (options?.minFactor ?? 0.92),
        value * (options?.maxFactor ?? 1.16),
      ),
    );

  const responsiveFont = (
    value: number,
    options?: ScaleOptions,
  ) =>
    round(
      clamp(
        value * widthRatio,
        value * (options?.minFactor ?? 0.92),
        value * (options?.maxFactor ?? 1.12),
      ),
    );

  return {
    contentPadding: isCompactPhone
      ? 14
      : isLargePhone
      ? 18
      : 16,
    height,
    isCompactPhone,
    isLargePhone,
    responsiveFont,
    scale,
    shortestSide,
    verticalScale,
    width,
  };
};
