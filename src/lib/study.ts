import type { KanjiRow, ReviewMode, ReviewRow, StudyCard, VocabularyRow } from "./types";

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60] as const;

export function cardKey(itemType: string, itemId: string, mode: ReviewMode): string {
  return `${itemType}:${itemId}:${mode}`;
}

export function makeCards(kanji: KanjiRow[], vocabulary: VocabularyRow[]): StudyCard[] {
  return [
    ...kanji.map((k) => ({
      key: cardKey("kanji", k.id, "meaning"),
      itemId: k.id,
      itemType: "kanji" as const,
      reviewMode: "meaning" as const,
      level: k.jlpt_level,
      front: k.character,
      answer: k.meaning_ko,
      details: [k.onyomi.join(" · "), k.kunyomi.join(" · ")].filter(Boolean).join(" / "),
    })),
    ...vocabulary.flatMap((v) => ([
      { key: cardKey("vocabulary", v.id, "reading"), itemId: v.id, itemType: "vocabulary" as const, reviewMode: "reading" as const, level: v.jlpt_level, front: v.word, answer: v.reading, details: v.meaning_ko },
      { key: cardKey("vocabulary", v.id, "meaning"), itemId: v.id, itemType: "vocabulary" as const, reviewMode: "meaning" as const, level: v.jlpt_level, front: v.word, answer: v.meaning_ko, details: [v.reading, v.example_ja, v.example_ko].filter(Boolean).join(" · ") },
    ])),
  ];
}

export function getNextReview(previous: Pick<ReviewRow, "streak"> | undefined, correct: boolean, now = new Date()) {
  const streak = correct ? Math.min((previous?.streak ?? 0) + 1, REVIEW_INTERVALS_DAYS.length) : 0;
  const intervalDays = correct ? REVIEW_INTERVALS_DAYS[streak - 1] : 0;
  const delayMs = correct ? intervalDays * 86_400_000 : 10 * 60_000;
  return {
    streak,
    interval_days: intervalDays,
    due_at: new Date(now.getTime() + delayMs).toISOString(),
    updated_at: now.toISOString(),
  };
}

export function isDue(review: ReviewRow | undefined, now = new Date()): boolean {
  return !review || new Date(review.due_at).getTime() <= now.getTime();
}
