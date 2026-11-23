import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("graded kanji match the five non-cumulative source counts and retain N5 review IDs", () => {
  type Entry = { id: string; character: string; jlpt_level: number; meaning_ko: string };
  const graded: Entry[] = JSON.parse(readFileSync("src/data/graded.json", "utf8"));
  const n5: Entry[] = JSON.parse(readFileSync("src/data/n5.json", "utf8")).kanji;
  assert.deepEqual([5, 4, 3, 2, 1].map(n => graded.filter(k => k.jlpt_level === n).length),
    [79, 166, 367, 367, 1232]);
  assert.equal(new Set(graded.map(k => k.character)).size, graded.length);
  assert.ok(graded.every(k => /[가-힣]/.test(k.meaning_ko)));
  assert.deepEqual(new Set(graded.filter(k => k.jlpt_level === 5).map(k => k.id)), new Set(n5.map(k => k.id)));
});

test("every catalogue entry has a Korean gloss and every bundled word has a bilingual example", () => {
  const catalogue = JSON.parse(readFileSync("public/data/joyo.json", "utf8")) as {
    character: string; meaning: string; meaning_ko: string;
  }[];
  assert.equal(catalogue.length, 2136);
  for (const entry of catalogue) {
    assert.match(entry.meaning_ko, /[가-힣]/, entry.character);
    assert.ok(entry.meaning.trim(), entry.character);
  }
  const words = [
    ...JSON.parse(readFileSync("src/data/n5.json", "utf8")).vocabulary,
    ...JSON.parse(readFileSync("src/data/example-words.json", "utf8")),
  ];
  assert.equal(new Set(words.map(word => word.word + ":" + word.reading)).size, words.length);
  for (const word of words) {
    assert.match(word.meaning_ko, /[가-힣]/, word.word);
    assert.match(word.example_ja, /[ぁ-んァ-ヶ]/, word.word);
    assert.match(word.example_ko, /[가-힣]/, word.word);
  }
});
