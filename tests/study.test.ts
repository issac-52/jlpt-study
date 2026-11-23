import assert from "node:assert/strict";
import test from "node:test";
import { getNextReview, isDue, makeCards } from "../src/lib/study.ts";
import type { ReviewRow } from "../src/lib/types.ts";

const now = new Date("2026-01-01T00:00:00Z");

test("correct reviews advance through the scheduled intervals and cap at 60 days", () => {
  let previous: ReturnType<typeof getNextReview> | undefined;
  for (const [index, days] of [1, 3, 7, 14, 30, 60, 60].entries()) {
    previous = getNextReview(previous, true, now);
    assert.deepEqual(previous, {
      streak: Math.min(index + 1, 6),
      interval_days: days,
      due_at: new Date(now.getTime() + days * 86_400_000).toISOString(),
      updated_at: now.toISOString(),
    });
  }
});

test("a wrong answer resets the streak and is due after ten minutes", () => {
  const schedule = getNextReview({ streak: 6 }, false, now);
  assert.deepEqual(schedule, {
    streak: 0,
    interval_days: 0,
    due_at: "2026-01-01T00:10:00.000Z",
    updated_at: now.toISOString(),
  });
  const review: ReviewRow = {
    user_id: "learner", item_id: "word", item_type: "vocabulary", review_mode: "reading", ...schedule,
  };
  assert.equal(isDue(undefined, now), true);
  assert.equal(isDue(review, new Date("2026-01-01T00:09:59.999Z")), false);
  assert.equal(isDue(review, new Date(schedule.due_at)), true);
  assert.equal(getNextReview(review, true, now).interval_days, 1);
});

test("kanji meaning and both vocabulary modes have distinct keys and answers", () => {
  const cards = makeCards(
    [{ id: "shared", character: "学", meaning_ko: "배우다", onyomi: ["ガク"], kunyomi: [], jlpt_level: 5 }],
    [{ id: "shared", word: "学生", reading: "がくせい", meaning_ko: "학생", jlpt_level: 5, example_ja: null, example_ko: null }],
  );
  assert.deepEqual(cards.map(({ key, answer }) => [key, answer]), [
    ["kanji:shared:meaning", "배우다"],
    ["vocabulary:shared:reading", "がくせい"],
    ["vocabulary:shared:meaning", "학생"],
  ]);
});
