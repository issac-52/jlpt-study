"use client";

import { useMemo, useState } from "react";
import { makeCards, matchesAnswer } from "@/lib/study";
import type { KanjiRow, StudyCard, VocabularyRow } from "@/lib/types";

const modes = { kanji: "한자 뜻", reading: "단어 읽기", meaning: "단어 뜻", mixed: "섞어서 풀기" };

type Props = {
  kanji: KanjiRow[]; vocabulary: VocabularyRow[]; label: string; saving: boolean; wordFilter: React.ReactNode;
  onScore: (card: StudyCard, correct: boolean) => Promise<boolean>;
};

export default function Practice({ kanji, vocabulary, label, saving, wordFilter, onScore }: Props) {
  const [mode, setMode] = useState<keyof typeof modes>("kanji");
  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState<StudyCard[]>([]);
  const [hits, setHits] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const pool = useMemo(() => makeCards(kanji, vocabulary).filter(card => mode === "mixed" ||
    (card.itemType === "kanji" ? mode === "kanji" : mode === card.reviewMode)), [kanji, vocabulary, mode]);
  const card = queue[index];
  function start() {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    beginRound(shuffled.slice(0, 10));
  }
  function beginRound(selected: StudyCard[]) {
    setMissed([]); setQueue(selected); setIndex(0); setHits(0); setInput(""); setChecked(false);
  }
  async function next(correct: boolean, retry = false) {
    if (!await onScore(card, correct)) return;
    setMissed(previous => {
      const others = previous.filter(item => item.key !== card.key);
      return correct ? others : [...others, card];
    });
    if (retry) setQueue(previous => [...previous, card]);
    setHits(count => count + Number(correct)); setIndex(i => i + 1); setInput(""); setChecked(false);
  }
  if (!card) return <section className="white-panel">
    <h2>{queue.length ? "연습 완료" : `${label} 자유 연습`}</h2>
    {queue.length > 0 && <p role="status">{queue.length}문제 중 {hits}문제 정답</p>}
    {missed.length > 0 && <button className="primary-button" onClick={() => beginRound(missed)}>이번 오답 {missed.length}개 다시 풀기</button>}
    <label className="field-label">문제 유형<select className="input-field" value={mode} onChange={e => setMode(e.target.value as keyof typeof modes)}>
      {Object.entries(modes).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    {mode !== "kanji" && wordFilter}
    <button className="primary-button" onClick={start} disabled={!pool.length}>{pool.length ? `${Math.min(10,pool.length)}문제 시작` : "준비된 문제가 없어요"}</button>
    <p className="helper-copy">JLPT 급수는 학습용 참고 분류입니다. <a href="/data/sources.txt">자료 출처</a></p>
  </section>;
  const reading = card.reviewMode === "reading";
  const correct = matchesAnswer(card, input);
  return <section className="white-panel">
    <span>{label} · {index + 1} / {queue.length}</span>
    <h2 className="kanji-glyph" lang="ja">{card.front}</h2>
    <form className="form-stack" onSubmit={e => { e.preventDefault(); if (input.trim()) setChecked(true); }}>
      <label className="field-label">{reading ? "일본어 읽기를 가나로 적어 보세요." : "한국어 뜻을 적어 보세요."}
        <input className="input-field" value={input} disabled={checked} onChange={e => setInput(e.target.value)} autoComplete="off"/></label>
      {!checked && <><button className="primary-button" disabled={!input.trim()}>정답 확인</button>
        <button className="reveal-button" type="button" onClick={() => { setInput(""); setChecked(true); }}>모르겠어요</button></>}
    </form>
    {checked && <><p role="status">{correct ? "맞았어요!" : "오답입니다! 다시 외우시겠어요?"} 정답 · <strong>{card.answer}</strong></p>
      <p>{card.details}</p>
      {!correct && <button className="primary-button" disabled={saving} onClick={() => void next(false, true)}>이번 연습 끝에 다시 풀기</button>}
      <button className="primary-button" disabled={saving} onClick={() => void next(correct)}>{saving ? "저장 중…" : "기록하고 계속"}</button>
      {!correct && input.trim() && <button className="reveal-button" disabled={saving} onClick={() => void next(true)}>같은 뜻이에요 · 정답으로 기록</button>}
    </>}
  </section>;
}
