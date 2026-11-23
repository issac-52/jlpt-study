"use client";

import { useMemo, useState } from "react";

import type { KanjiRow, VocabularyRow } from "@/lib/types";

export default function KanjiCatalogue({ kanji, vocabulary }: { kanji: KanjiRow[]; vocabulary: VocabularyRow[] }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(40);
  const examples = useMemo(() => {
    const byCharacter = new Map<string, VocabularyRow[]>();
    for (const word of vocabulary) {
      for (const character of new Set(word.word)) {
        const group = byCharacter.get(character);
        if (group) group.push(word);
        else byCharacter.set(character, [word]);
      }
    }
    return byCharacter;
  }, [vocabulary]);
  const term = query.trim().toLowerCase();
  const matches = kanji.filter(({ catalogue: entry }) => entry &&
    [entry.character, entry.reading, entry.meaning_ko, entry.meaning.toLowerCase()].some(value => value.includes(term)));
  return <>
    <label className="field-label">한자·읽기·한국어·영어 뜻 검색<input className="input-field" type="search" value={query}
      onChange={event => { setQuery(event.target.value); setLimit(40); }}/></label>
    <p role="status">{matches.length}자</p>
    <div className="word-list">{matches.slice(0, limit).map(({catalogue, jlpt_level}) => {
      const row = catalogue!;
      return <div className="white-panel" key={row.character}><strong lang="ja">{row.character}</strong>
        {jlpt_level && <small>JLPT N{jlpt_level}</small>}
        <span lang="ko">{row.meaning_ko}</span>
        <span lang="ja">{row.reading}</span><small lang="en">{row.meaning}</small>
        {examples.has(row.character) && <details><summary>예시 단어와 예문</summary>
          {examples.get(row.character)?.map(word => <div className="example-box" key={word.id}>
            <strong lang="ja">{word.word} · {word.reading}</strong><p>{word.meaning_ko}</p>
            {word.example_ja && <p lang="ja">{word.example_ja}</p>}
            {word.example_ko && <small>{word.example_ko}</small>}
          </div>)}
        </details>}
      </div>})}</div>
    {limit < matches.length && <button className="primary-button" onClick={() => setLimit(limit + 40)}>더 보기</button>}
    <a href="/data/sources.txt">한자 자료 출처 및 라이선스</a>
  </>;
}
