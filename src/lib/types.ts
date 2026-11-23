export type Level = 5 | 4 | 3 | 2 | 1;
export type ItemType = "kanji" | "vocabulary";
export type ReviewMode = "meaning" | "reading";

export type Profile = { id: string; nickname: string; target_level: Level; daily_new_goal: number; daily_review_goal: number; };

export type CatalogueEntry = { character: string; basic: boolean; reading: string; meaning: string; meaning_ko: string };

export type KanjiRow = {
  id: string;
  character: string;
  meaning_ko: string;
  onyomi: string[];
  kunyomi: string[];
  jlpt_level: Level | null;
  catalogue?: CatalogueEntry;
};

export type VocabularyRow = {
  id: string;
  word: string;
  reading: string;
  meaning_ko: string;
  jlpt_level: Level;
  example_ja: string | null;
  example_ko: string | null;
};

export type VocabularyKanjiRow = {
  vocabulary_id: string;
  kanji_id: string;
  position: number;
};

export type ReviewRow = {
  user_id: string;
  item_type: ItemType;
  item_id: string;
  review_mode: ReviewMode;
  streak: number;
  interval_days: number;
  due_at: string;
  updated_at: string;
  first_studied_at?: string;
  last_reviewed_at?: string | null;
};

export type StudyCard = {
  key: string;
  itemId: string;
  itemType: ItemType;
  reviewMode: ReviewMode;
  level: Level | null;
  alternativeAnswer?: string;
  front: string;
  answer: string;
  details: string;
};
