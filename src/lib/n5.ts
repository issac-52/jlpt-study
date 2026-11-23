import examples from "../data/example-words.json";
import graded from "../data/graded.json";
import course from "../data/n5.json";
import type { KanjiRow, Level, VocabularyKanjiRow, VocabularyRow } from "./types";

export function includeN5(kanji: KanjiRow[], vocabulary: VocabularyRow[], links: VocabularyKanjiRow[]) {
  const characters = new Map(kanji.map(row => [row.character, row]));
  const words = new Map(vocabulary.map(row => [row.word + ":" + row.reading, row]));
  for (const entry of graded) {
    const existing = characters.get(entry.character);
    characters.set(entry.character, { ...entry, ...existing, jlpt_level: entry.jlpt_level as Level });
  }
  for (const entry of course.kanji) {
    const existing = characters.get(entry.character);
    characters.set(entry.character, { ...entry, id: existing?.id ?? entry.id, jlpt_level: 5 });
  }
  for (const entry of [...course.vocabulary, ...examples]) {
    const key = entry.word + ":" + entry.reading;
    const existing = words.get(key);
    const hasExample = existing?.example_ja && existing.example_ko;
    words.set(key, {
      ...entry, ...existing, jlpt_level: entry.jlpt_level as Level,
      example_ja: hasExample ? existing.example_ja : entry.example_ja,
      example_ko: hasExample ? existing.example_ko : entry.example_ko,
    });
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
