export type LanguageCode = 'en' | 'hi';

export type LocalizedText = {
  en: string;
  hi: string;
};

export type ToolCategory =
  | 'official'
  | 'workflow'
  | 'measurement'
  | 'calculator'
  | 'premium';

export type ToolItem = {
  id: string;
  shortCode: string;

  // MaterialCommunityIcons icon name
  icon?: string;

  category: ToolCategory;

  title: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  badge: LocalizedText;

  highlights: LocalizedText[];
  steps: LocalizedText[];

  accentColor: string;

  url?: string;
  premium?: boolean;
};

export const getLocalizedText = (
  text: LocalizedText,
  language: LanguageCode,
) => text[language];