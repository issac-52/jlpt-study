import course from "../data/n5.json";
import type { KanjiRow, VocabularyKanjiRow, VocabularyRow } from "./types";

export function includeN5(kanji: KanjiRow[], vocabulary: VocabularyRow[], links: VocabularyKanjiRow[]) {
  const characters = new Map(kanji.map(row => [row.character, row]));
  const words = new Map(vocabulary.map(row => [row.word + ":" + row.reading, row]));
  for (const entry of course.kanji) {
    const existing = characters.get(entry.character);
    characters.set(entry.character, { ...(existing ?? entry), jlpt_level: 5 });
  }
  for (const entry of course.vocabulary) {
    const key = entry.word + ":" + entry.reading;
    words.set(key, { ...(words.get(key) ?? entry), jlpt_level: 5 });
  }
  const relations = new Map(links.map(link => [link.vocabulary_id + ":" + link.kanji_id, link]));
  for (const word of words.values()) {
    Array.from(word.word).forEach((character, index) => {
      const item = characters.get(character);
      if (!item) return;
      const key = word.id + ":" + item.id;
      if (!relations.has(key)) relations.set(key, { vocabulary_id: word.id, kanji_id: item.id, position: index + 1 });
    });
  }
  return { kanji: [...characters.values()], vocabulary: [...words.values()], links: [...relations.values()] };
}
