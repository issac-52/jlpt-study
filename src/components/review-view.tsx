"use client";

import { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import type { StudyCard } from "@/lib/types";

export type ReviewResult = { input: string; correct: boolean };

type Props = {
  sessionLabel: string;
  card: StudyCard | null;
  index: number;
  total: number;
  dueCount: number;
  result: ReviewResult | null;
  saving: boolean;
  finished: boolean;
  onSubmit: (input: string) => Promise<void>;
  onNext: () => void;
  onRetry: () => void;
  onStart: () => void;
};

export default function ReviewView({ sessionLabel,card,index,total,dueCount,result,saving,finished,onSubmit,onNext,onRetry,onStart }: Props) {
  const [input, setInput] = useState("");
  if (finished) return <section className="view-stack review-finished"><span className="finish-illustration"><Sparkles size={40}/></span><span className="eyebrow">WELL DONE</span><h2>오늘도 한 걸음 성장했어요.</h2><p>{total}장의 카드를 마쳤어요. 기억은 짧게, 반복은 꾸준하게.</p><button className="primary-button" onClick={onStart}>오늘의 복습 확인하기 <RotateCcw size={18}/></button></section>;
  if (!card) return <section className="view-stack"><span className="eyebrow">SMART REVIEW</span><h2>오늘의 복습</h2><p className="view-description">어렴풋이 아는 단어도 직접 떠올려 봐요. 답을 입력하면 복습 결과가 기록됩니다.</p><div className="review-empty"><RotateCcw size={30}/><strong>지금 복습할 카드 {dueCount}개</strong><p>학습한 카드 중 복습 시간이 된 카드를 연습해요.</p></div><button className="primary-button" disabled={dueCount===0} onClick={onStart}>{dueCount===0?"복습할 카드가 없어요":"복습 시작"} <Sparkles size={18}/></button></section>;
  const progress=Math.round((index/Math.max(total,1))*100);
  return <section className="view-stack review-screen">
    <div className="review-top"><div><span className="eyebrow">FOCUS MODE</span><h2>{sessionLabel}</h2></div><span className="review-counter">{index+1} / {total}</span></div>
    <div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div>
    <div className="flashcard" aria-live="polite">
      <span className="flashcard-badge">{card.itemType==="kanji"?"한자 뜻":card.reviewMode==="reading"?"단어 읽기":"단어 뜻"}{card.level && ` · N${card.level}`}</span>
      <div className="flashcard-center"><span className="flashcard-prompt">{card.front}</span><span className="flashcard-question">{card.reviewMode==="reading"?"이 단어는 어떻게 읽을까요?":"무슨 뜻일까요?"}</span></div>
    </div>
    {result ? <div className="white-panel">
      <div role="status">
        <h3>{result.correct ? "정답이에요!" : "오답입니다! 다시 외우시겠어요?"}</h3>
        {result.input && <p>입력한 답 · {result.input}</p>}
        <p>정답 · <strong>{card.answer}</strong></p>
        {card.details && <p className="helper-copy">{card.details}</p>}
      </div>
      {!result.correct && <button type="button" className="primary-button" onClick={onRetry}>이번 복습 끝에 다시 풀기</button>}
      <button type="button" className={result.correct ? "primary-button" : "reveal-button"} onClick={onNext}>{index + 1 === total ? "마치기" : "다음 카드"}</button>
    </div> : <form className="white-panel" onSubmit={event => {
      event.preventDefault();
      if (input.trim() && !saving) void onSubmit(input.trim());
    }}>
      <label className="field-label">{card.reviewMode === "reading" ? "일본어 읽기 (가나)" : "한국어 뜻"}
        <input className="input-field" value={input} disabled={saving} onChange={e => setInput(e.target.value)}
          autoComplete="off" autoCorrect="off" spellCheck={false} required/>
      </label>
      <button className="primary-button" disabled={saving || !input.trim()}>{saving ? "저장 중…" : "답 제출"}</button>
      <button type="button" className="reveal-button" disabled={saving} onClick={() => void onSubmit("")}>모르겠어요</button>
    </form>}
  </section>;
}
