"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, BookOpenText, LockKeyhole, Sparkles } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function AuthScreen({ client }: { client: SupabaseClient }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup") {
        if (nickname.trim().length < 1 || nickname.trim().length > 20) throw new Error("닉네임은 1~20자로 입력해 주세요.");
        if (password.length < 6) throw new Error("비밀번호는 6자 이상 입력해 주세요.");
        const { data, error: err } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { nickname: nickname.trim() } },
        });
        if (err) throw err;
        if (!data.session) setMessage("가입 요청이 접수됐어요. 메일 인증이 활성화되어 있다면 이메일을 확인한 뒤 로그인해 주세요.");
      } else {
        const { error: err } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "처리 중 문제가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-top">
        <div className="logo-mark"><BookOpenText size={25}/></div>
        <span className="brand-name">kotoba<span className="brand-dot">.</span></span>
      </div>
      <div className="auth-intro">
        <span className="eyebrow"><Sparkles size={14} /> 오늘의 작은 배움</span>
        <h1>한자 하나에서<br/><em>단어 열 개로.</em></h1>
        <p>한자의 뜻을 이해하고, 단어와 문장으로 연결해 기억해요. 복습 기록은 내 계정에 저장돼요.</p>
      </div>
      <div className="auth-card">
        <div className="auth-switch" role="group" aria-label="로그인 모드">
          <button type="button" className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("");setMessage("");}}>로그인</button>
          <button type="button" className={mode==="signup"?"active":""} onClick={()=>{setMode("signup");setError("");setMessage("");}}>회원가입</button>
        </div>
        <form onSubmit={submit} className="form-stack">
          {mode==="signup" && <label className="field-label">닉네임<input className="input-field" value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={20} placeholder="어떻게 불러드릴까요?" autoComplete="nickname" required/></label>}
          <label className="field-label">이메일<input className="input-field" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></label>
          <label className="field-label">비밀번호<input className="input-field" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} placeholder="6자 이상" autoComplete={mode==="signup"?"new-password":"current-password"} required/></label>
          {error && <p className="status-error" role="alert">{error}</p>}
          {message && <p className="status-ok" role="status">{message}</p>}
          <button className="primary-button" disabled={busy} type="submit">{busy?"처리 중…":mode==="login"?"공부하러 가기":"계정 만들기"} <ArrowRight size={18}/></button>
        </form>
      </div>
      <p className="auth-footnote"><LockKeyhole size={13}/> 공부 기록은 계정별로 안전하게 분리돼요.</p>
    </div>
  );
}
