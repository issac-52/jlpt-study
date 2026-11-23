import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mergeCatalogue } from "../src/lib/catalogue.ts";
import { cardKey, dailyPlan, makeCards, matchesAnswer } from "../src/lib/study.ts";
import type { CatalogueEntry, KanjiRow, ReviewRow } from "../src/lib/types.ts";

const catalogue: CatalogueEntry[] = JSON.parse(readFileSync("public/data/joyo.json", "utf8"));
const graded: KanjiRow[] = JSON.parse(readFileSync("src/data/graded.json", "utf8"));

test("catalogue courses share existing JLPT cards and give stable keys to ungraded kanji", () => {
  const characters = new Map(graded.map(k => [k.character, k]));
  mergeCatalogue(characters, catalogue);
  const joyo = [...characters.values()].filter(k => k.catalogue);
  assert.equal(joyo.length, 2136);
  assert.equal(joyo.filter(k => k.catalogue?.basic).length, 1026);
  assert.deepEqual([5, 4, 3, 2, 1, null].map(level => joyo.filter(k => k.jlpt_level === level).length),
    [79, 166, 367, 367, 985, 172]);
  for (const known of graded) assert.equal(characters.get(known.character)?.id, known.id);
  const secondLoad = new Map<string, KanjiRow>();
  mergeCatalogue(secondLoad, [...catalogue].reverse());
  const cards = makeCards(joyo, []);
  assert.equal(new Set(cards.map(card => card.key)).size, 2136);
  for (const card of cards) {
    assert.ok(matchesAnswer(card, card.answer), card.front);
    if (card.level === null) assert.equal(card.itemId, secondLoad.get(card.front)?.id);
  }
  const ungraded = cards.find(card => card.level === null)!;
  const now = new Date();
  const review: ReviewRow = { item_type: "kanji", item_id: ungraded.itemId, review_mode: "meaning",
    user_id: "test", streak: 0, interval_days: 0, due_at: now.toISOString(), updated_at: now.toISOString() };
  assert.deepEqual(dailyPlan(cards, [review], 5, +now, 10, 10).dueCards.map(c => c.key),
    [cardKey("kanji", ungraded.itemId, "meaning")]);
});
