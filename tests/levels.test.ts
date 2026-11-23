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
