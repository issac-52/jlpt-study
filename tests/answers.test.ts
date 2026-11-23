import assert from "node:assert/strict";
import test from "node:test";
import { matchesAnswer } from "../src/lib/study.ts";

test("reading answers accept equivalent kana and require the entire reading", () => {
  const card = { itemType: "vocabulary", answer: "がっこう" } as const;
  for (const input of ["がっこう", "ガッコウ", " ｶﾞｯｺｳ "]) assert.ok(matchesAnswer(card, input));
  for (const input of ["がっこ", "学校", "", " "]) assert.equal(matchesAnswer(card, input), false);
});

test("meaning answers accept listed alternatives and the gloss in a Korean hun-eum", () => {
  const word = { itemType: "vocabulary", answer: "높다·비싸다" } as const;
  assert.ok(matchesAnswer(word, "비싸다"));
  assert.equal(matchesAnswer(word, "싸다"), false);
  const kanji = { itemType: "kanji", answer: "사랑 애" } as const;
  assert.ok(matchesAnswer(kanji, "사랑"));
  assert.ok(matchesAnswer(kanji, "사랑 애"));
  assert.equal(matchesAnswer(kanji, "애"), false);
});
