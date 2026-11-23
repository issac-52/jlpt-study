"use client";

import { useState } from "react";
import type { Level, Profile } from "@/lib/types";

export type Goals = Pick<Profile, "target_level" | "daily_new_goal" | "daily_review_goal">;

export default function PersonalSettings({ profile, email, onSave, onSignOut }: {
  profile: Profile; email?: string; onSave: (goals: Goals) => Promise<void>; onSignOut: () => void;
}) {
  const [level, setLevel] = useState(profile.target_level);
  const [newGoal, setNewGoal] = useState(String(profile.daily_new_goal ?? 10));
  const [reviewGoal, setReviewGoal] = useState(String(profile.daily_review_goal ?? 20));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <section className="view-stack">
    <h2>개인 설정</h2>
    <div className="white-panel"><strong>{profile.nickname}</strong><span>{email}</span></div>
    <form className="white-panel" onChange={() => setMessage("")} onSubmit={async event => {
      event.preventDefault();
      setBusy(true);
      try {
        await onSave({ target_level: level, daily_new_goal: Number(newGoal), daily_review_goal: Number(reviewGoal) });
        setMessage("학습 설정을 저장했어요.");
      } catch { setMessage("저장하지 못했어요. 잠시 후 다시 시도해 주세요."); }
      finally { setBusy(false); }
    }}>
      <label className="field-label">목표 급수<select className="input-field" value={level} onChange={e => setLevel(Number(e.target.value) as Level)}>
        {[5,4,3,2,1].map(n => <option key={n} value={n}>JLPT N{n}</option>)}</select></label>
      <label className="field-label">하루 새 학습량 (카드)<input className="input-field" type="number" min="1" max="100" required value={newGoal} onChange={e => setNewGoal(e.target.value)}/></label>
      <label className="field-label">하루 복습량 (카드)<input className="input-field" type="number" min="1" max="100" required value={reviewGoal} onChange={e => setReviewGoal(e.target.value)}/></label>
      <p className="helper-copy">각각 1~100장으로 설정할 수 있어요. 단어 읽기와 뜻은 별도 카드이며, 같은 카드를 여러 번 복습해도 하루 복습량은 1장으로 집계해요. 하루는 한국 시간 자정에 시작해요.</p>
      <button className="primary-button" disabled={busy}>{busy ? "저장 중…" : "설정 저장"}</button>
      {message && <p role="status">{message}</p>}
    </form>
    <button className="reveal-button" onClick={onSignOut}>로그아웃</button>
  </section>;
}
