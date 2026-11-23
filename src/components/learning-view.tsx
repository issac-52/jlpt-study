"use client";

import { useMemo, useState } from "react";
import KanjiCatalogue from "./kanji-catalogue";
import { BookText, ChevronDown, Search, X } from "lucide-react";
import type { KanjiRow, Level, VocabularyKanjiRow, VocabularyRow } from "@/lib/types";

type Props = {
  kanji: KanjiRow[];
  vocabulary: VocabularyRow[];
  links: VocabularyKanjiRow[];
  targetLevel: Level;
};

export default function LearningView(props: Props) {
  const [scope, setScope] = useState(props.targetLevel === 5 ? "n5" : "goal");
  const catalogue = scope === "basic" || scope === "joyo";
  return <div className="view-stack">
    <label className="field-label">학습 범위
      <select className="input-field" value={scope} onChange={event => setScope(event.target.value)}>
        <option value="n5">JLPT N5 한자·단어 학습</option>
        <option value="goal">내 목표 급수 · N{props.targetLevel}</option>
        <option value="basic">기초 교육한자 · 1,026자</option>
        <option value="joyo">전체 상용한자 · 2,136자</option>
      </select>
    </label>
    {catalogue ? <KanjiCatalogue key={scope} basic={scope === "basic"}/> :
      <CourseLibrary key={scope} {...props} targetLevel={scope === "n5" ? 5 : props.targetLevel}/>}
  </div>;
}

function CourseLibrary({ kanji, vocabulary, links, targetLevel }: Props) {
  const [kind, setKind] = useState<"kanji" | "vocabulary">("kanji");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filteredKanji = useMemo(() =>
    kanji.filter(k => k.jlpt_level >= targetLevel && [k.character,k.meaning_ko,...k.onyomi,...k.kunyomi].join(" ").toLowerCase().includes(query.toLowerCase().trim())),
    [kanji, targetLevel, query]
  );
  const filteredWords = useMemo(() =>
    vocabulary.filter(v => v.jlpt_level >= targetLevel && [v.word,v.reading,v.meaning_ko].join(" ").toLowerCase().includes(query.toLowerCase().trim())),
    [vocabulary, targetLevel, query]
  );

  const selectedKanji = kanji.find(k=>kind==="kanji" && k.id===selected);
  const selectedWord = vocabulary.find(v=>kind==="vocabulary" && v.id===selected);
  const relatedWords = selectedKanji
    ? links.filter(link=>link.kanji_id===selectedKanji.id).sort((a,b)=>a.position-b.position).map(link=>vocabulary.find(v=>v.id===link.vocabulary_id)).filter((v):v is VocabularyRow=>Boolean(v))
    : [];
  const relatedKanji = selectedWord
    ? links.filter(link=>link.vocabulary_id===selectedWord.id).sort((a,b)=>a.position-b.position).map(link=>kanji.find(k=>k.id===link.kanji_id)).filter((k):k is KanjiRow=>Boolean(k))
    : [];

  return (
    <section className="view-stack">
      <div className="section-head"><div><span className="eyebrow">LIBRARY</span><h2>차곡차곡, 일본어</h2><p>N{targetLevel}까지의 단어와 한자를 살펴보세요.</p></div></div>
      <div className="segment-control" role="group" aria-label="학습 유형">
        <button type="button" className={kind==="kanji"?"active":""} onClick={()=>{setKind("kanji");setSelected(null);}}>한자 <span>{kanji.filter(k=>k.jlpt_level>=targetLevel).length}</span></button>
        <button type="button" className={kind==="vocabulary"?"active":""} onClick={()=>{setKind("vocabulary");setSelected(null);}}>단어 <span>{vocabulary.filter(v=>v.jlpt_level>=targetLevel).length}</span></button>
      </div>
      <div className="search-field"><Search size={18}/><input type="search" placeholder="한자, 읽기, 한국어로 검색" value={query} onChange={e=>setQuery(e.target.value)} aria-label="한자 단어 검색"/></div>
      <p className="helper-copy">목록의 급수는 학습용 참고 분류이며 JLPT 공식 목록이 아닙니다.</p>
      {kind==="kanji" ? (
        <div className="tile-grid">
          {filteredKanji.map(k=><button type="button" key={k.id} onClick={()=>setSelected(selected===k.id?null:k.id)} className={`kanji-tile ${selected===k.id?"chosen":""}`} aria-pressed={selected===k.id}>
            <span className="kanji-glyph">{k.character}</span><span className="tile-meaning">{k.meaning_ko}</span><small>N{k.jlpt_level}</small>
          </button>)}
        </div>
      ) : (
        <div className="word-list">
          {filteredWords.map(v=><button type="button" className={`word-row ${selected===v.id?"chosen":""}`} key={v.id} onClick={()=>setSelected(selected===v.id?null:v.id)} aria-pressed={selected===v.id}>
            <span className="word-main"><strong>{v.word}</strong><span>{v.reading}</span></span><span className="word-right">{v.meaning_ko}<ChevronDown size={16}/></span>
          </button>)}
        </div>
      )}
      {((kind==="kanji"&&filteredKanji.length===0)||(kind==="vocabulary"&&filteredWords.length===0)) && <p className="empty-panel">검색 결과가 없어요. 다른 단어를 입력해 보세요.</p>}
      {(selectedKanji || selectedWord) && <div className="detail-panel">
        <div className="detail-heading"><div><span className="eyebrow">CONNECTED LEARNING</span><h3>{selectedKanji?.character ?? selectedWord?.word}</h3></div><button className="icon-button" aria-label="상세 닫기" onClick={()=>setSelected(null)}><X size={19}/></button></div>
        {selectedKanji ? <>
          <p className="detail-meaning">{selectedKanji.meaning_ko}</p>
          <p className="detail-pronunciation">음독 {selectedKanji.onyomi.join(" · ")||"—"}<br/>훈독 {selectedKanji.kunyomi.join(" · ")||"—"}</p>
          <div className="detail-divider"/>
          <h4><BookText size={16}/> 연결된 단어</h4>
          <div className="related-list">{relatedWords.length ? relatedWords.map(v=><div key={v.id} className="related-item"><strong>{v.word}</strong><small>{v.reading}</small><span>{v.meaning_ko}</span></div>) : <p className="muted-small">아직 연결된 단어가 없어요.</p>}</div>
        </> : selectedWord ? <>
          <p className="detail-meaning">{selectedWord.reading} · {selectedWord.meaning_ko}</p>
          {selectedWord.example_ja && <div className="example-box"><p>{selectedWord.example_ja}</p><small>{selectedWord.example_ko}</small></div>}
          <div className="detail-divider"/>
          <h4><BookText size={16}/> 구성 한자</h4>
          <div className="kanji-chips">{relatedKanji.length?relatedKanji.map(k=><span className="kanji-chip" key={k.id}>{k.character} <small>{k.meaning_ko}</small></span>):<p className="muted-small">연결된 한자가 없어요.</p>}</div>
        </> : null}
      </div>}
    </section>
  );
}
