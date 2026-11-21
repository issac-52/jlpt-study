"use client";

import { Check, Eye, RotateCcw, Sparkles, X } from "lucide-react";
import type { StudyCard } from "@/lib/types";

type Props = {
  card: StudyCard | null;
  index: number;
  total: number;
  dueCount: number;
  revealed: boolean;
  saving: boolean;
  finished: boolean;
  onReveal: () => void;
  onScore: (correct: boolean) => void;
  onStart: () => void;
};

export default function ReviewView({ card,index,total,dueCount,revealed,saving,finished,onReveal,onScore,onStart }: Props) {
  if (finished) return <section className="view-stack review-finished"><span className="finish-illustration"><Sparkles size={40}/></span><span className="eyebrow">WELL DONE</span><h2>오늘도 한 걸음 성장했어요.</h2><p>{total}개 카드를 복습했어요. 기억은 짧게, 반복은 꾸준하게.</p><button className="primary-button" onClick={onStart}>남은 카드 확인하기 <RotateCcw size={18}/></button></section>;
  if (!card) return <section className="view-stack"><span className="eyebrow">SMART REVIEW</span><h2>오늘의 복습</h2><p className="view-description">어렴풋이 아는 단어도 직접 떠올려 봐요. 정답을 확인한 뒤 스스로 평가합니다.</p><div className="review-empty"><RotateCcw size={30}/><strong>지금 복습할 카드 {dueCount}개</strong><p>새 카드와 복습 예정 카드를 함께 연습해요.</p></div><button className="primary-button" disabled={dueCount===0} onClick={onStart}>{dueCount===0?"복습할 카드가 없어요":"복습 시작"} <Sparkles size={18}/></button></section>;
  const progress=Math.round((index/Math.max(total,1))*100);
  return <section className="view-stack review-screen">
    <div className="review-top"><div><span className="eyebrow">FOCUS MODE</span><h2>기억을 꺼내는 시간</h2></div><span className="review-counter">{index+1} / {total}</span></div>
    <div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div>
    <div className="flashcard" aria-live="polite">
      <span className="flashcard-badge">{card.itemType==="kanji"?"한자 뜻":card.reviewMode==="reading"?"단어 읽기":"단어 뜻"} · N{card.level}</span>
      <div className="flashcard-center"><span className="flashcard-prompt">{card.front}</span><span className="flashcard-question">{card.reviewMode==="reading"?"이 단어는 어떻게 읽을까요?":"무슨 뜻일까요?"}</span></div>
      {revealed ? <div className="flashcard-answer"><span className="eyebrow">정답</span><strong>{card.answer}</strong>{card.details&&<small>{card.details}</small>}</div> : <button className="reveal-button" onClick={onReveal}><Eye size={18}/> 정답 확인</button>}
    </div>
    {revealed ? <div className="answer-buttons"><p>기억해 냈나요?</p><div><button className="wrong-button" disabled={saving} onClick={()=>onScore(false)}><X size={19}/> 다시 외우기</button><button className="correct-button" disabled={saving} onClick={()=>onScore(true)}><Check size={19}/> 기억했어요</button></div></div> : <p className="review-hint">정답을 누르기 전에 소리 내어 읽거나 뜻을 생각해 보세요.</p>}
  </section>;
}
