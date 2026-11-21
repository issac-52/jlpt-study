export type Level = 5 | 4 | 3 | 2;
export type ItemType = "kanji" | "vocabulary";
export type ReviewMode = "meaning" | "reading";

export type Profile = { id: string; nickname: string; target_level: Level; friend_code: string; };
export type FriendStat = { user_id: string; nickname: string; kanji_learned: number; vocab_learned: number; reviews_last_7d: number; };

export type KanjiRow = {
  id: string;
  character: string;
  meaning_ko: string;
  onyomi: string[];
  kunyomi: string[];
  jlpt_level: Level;
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
};

export type StudyCard = {
  key: string;
  itemId: string;
  itemType: ItemType;
  reviewMode: ReviewMode;
  level: Level;
  front: string;
  answer: string;
  details: string;
};

export type FriendRequest = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "rejected";
};
