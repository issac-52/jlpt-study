import type { CatalogueEntry, KanjiRow } from "./types";

// A character shared by multiple courses must keep its original review-state key.
export function mergeCatalogue(characters: Map<string, KanjiRow>, entries: CatalogueEntry[]) {
  for (const entry of entries) {
    const existing = characters.get(entry.character);
    if (existing) {
      characters.set(entry.character, { ...existing, catalogue: entry });
    } else {
      // Application-defined UUIDv8: the last field encodes the Unicode scalar.
      const hex = entry.character.codePointAt(0)!.toString(16).padStart(12, "0");
      characters.set(entry.character, {
        id: `cf418297-35ac-8000-8000-${hex}`,
        character: entry.character, jlpt_level: null, meaning_ko: entry.meaning_ko,
        onyomi: [], kunyomi: [], catalogue: entry,
      });
    }
  }
}
