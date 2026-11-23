"use client";

import { useEffect, useState } from "react";

type Entry = { character: string; basic: boolean; reading: string; meaning: string };

export default function KanjiCatalogue({ basic }: { basic: boolean }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(40);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/joyo.json", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(setEntries)
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);
  const term = query.trim().toLowerCase();
  const matches = entries.filter(row => (!basic || row.basic) &&
    [row.character, row.reading, row.meaning.toLowerCase()].some(value => value.includes(term)));
  return <>
    <label className="field-label">한자·읽기·영어 뜻 검색<input className="input-field" type="search" value={query}
      onChange={event => { setQuery(event.target.value); setLimit(40); }}/></label>
    {error ? <button className="primary-button" onClick={() => { setError(false); setAttempt(attempt + 1); }}>다시 불러오기</button> :
      <p role="status">{entries.length ? matches.length + "자" : "한자를 불러오는 중…"}</p>}
    <div className="word-list">{matches.slice(0, limit).map(row =>
      <div className="white-panel" key={row.character}><strong lang="ja">{row.character}</strong><span lang="ja">{row.reading}</span><small lang="en">{row.meaning}</small></div>)}</div>
    {limit < matches.length && <button className="primary-button" onClick={() => setLimit(limit + 40)}>더 보기</button>}
    <a href="/data/sources.txt">한자 자료 출처 및 라이선스</a>
  </>;
}
