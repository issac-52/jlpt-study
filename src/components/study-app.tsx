"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ArrowRight, BookOpenText, CalendarCheck2, ChevronRight, CircleHelp, Flame, House, Layers, RotateCcw, Settings2, Sparkles } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { cardKey, getNextReview, dailyPlan, makeCards, matchesAnswer } from "@/lib/study";
import type { KanjiRow, Profile, ReviewRow, StudyCard, VocabularyKanjiRow, VocabularyRow } from "@/lib/types";
import AuthScreen from "./auth-screen";
import { includeN5 } from "@/lib/n5";
import LearningView from "./learning-view";
import PersonalSettings, { type Goals } from "./personal-settings";
import ReviewView, { type ReviewResult } from "./review-view";

type Tab = "home" | "learn" | "review" | "settings";
type ReviewLog = { reviewed_at: string };

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function dayStreak(logs: ReviewLog[], nowMs: number) {
  const days = new Set(logs.map(log => dayKey(new Date(log.reviewed_at))));
  let cursor = new Date(nowMs);
  if (!days.has(dayKey(cursor))) cursor = new Date(cursor.getTime() - 86_400_000);
  let count = 0;
  while (days.has(dayKey(cursor)) && count < 365) {
    count++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return count;
}


async function loadReviewState(client: SupabaseClient, userId: string) {
  const rows: ReviewRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from("review_state")
      .select("*")
      .eq("user_id", userId).order("item_type").order("item_id").order("review_mode")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...data as ReviewRow[]);
    if (data.length < pageSize) return rows;
  }
}

export default function StudyApp() {
  const client = useMemo(() => getSupabase(), []);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    if (!client) return;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, [client]);

  if (!client) return <div className="setup-page"><div className="logo-mark"><BookOpenText size={25}/></div><span className="eyebrow">KOTOBA / SETUP</span><h1>이제 첫 페이지가<br/>준비됐어요.</h1><p>Supabase를 연결하면 회원가입, 한자·단어 학습과 개인 복습 기록을 이용할 수 있어요.</p><div className="setup-code">.env.local<br/>NEXT_PUBLIC_SUPABASE_URL=...<br/>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</div><p className="helper-copy">README.md에 있는 SQL 마이그레이션도 먼저 실행해 주세요.</p></div>;
  if(!authReady) return <div className="loading-page"><div className="logo-mark"><BookOpenText size={27}/></div><p>로그인 상태를 확인하고 있어요…</p></div>;
  if(!user) return <AuthScreen client={client}/>;

  return <SignedInStudyApp key={user.id} client={client} user={user}/>;
}

function SignedInStudyApp({ client, user }: { client: SupabaseClient; user: User }) {
  const userId = user.id;
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [kanji, setKanji] = useState<KanjiRow[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyRow[]>([]);
  const [links, setLinks] = useState<VocabularyKanjiRow[]>([]);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const savingRef = useRef(false);
  const [sessionKind, setSessionKind] = useState<"new" | "review" | "missed">("review");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const lastMonth = new Date(Date.now() - 35 * 86_400_000).toISOString();
      const [p, k, v, link, rev, log] = await Promise.all([
        client.from("profiles").select("*").eq("id",userId).single(),
        client.from("kanji").select("id,character,meaning_ko,onyomi,kunyomi,jlpt_level").order("character"),
        client.from("vocabulary").select("id,word,reading,meaning_ko,jlpt_level,example_ja,example_ko").order("word"),
        client.from("vocabulary_kanji").select("vocabulary_id,kanji_id,position"),
        loadReviewState(client, userId),
        client.from("review_logs").select("reviewed_at").eq("user_id",userId).gte("reviewed_at", lastMonth).order("reviewed_at",{ascending:false}).limit(2000),
      ]);
      const firstError = [p,k,v,link,log].find(result=>result.error)?.error;
      if (firstError) throw firstError;
      if (!p.data) throw new Error("프로필이 없어요. 데이터베이스 초기화 상태를 확인해 주세요.");
      setProfile(p.data as Profile);
      const content = includeN5((k.data ?? []) as KanjiRow[], (v.data ?? []) as VocabularyRow[], (link.data ?? []) as VocabularyKanjiRow[]);
      setKanji(content.kanji);
      setVocabulary(content.vocabulary);
      setLinks(content.links);
      setReviewRows(rev);
      setLogs((log.data ?? []) as ReviewLog[]);
      setNowMs(Date.now());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "학습 정보를 가져오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [client,userId]);

  useEffect(() => {
    let cancelled = false;
    // Schedule after the effect so React state isn't synchronously cascaded.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      void refresh();
    });
    return () => { cancelled = true; };
  }, [refresh]);

  const targetLevel=profile?.target_level ?? 5;
  const allCards = useMemo(() => makeCards(kanji, vocabulary), [kanji, vocabulary]);
  const newGoal = profile?.daily_new_goal ?? 10;
  const reviewGoal = profile?.daily_review_goal ?? 20;
  const plan = useMemo(() => dailyPlan(allCards, reviewRows, targetLevel, nowMs, newGoal, reviewGoal),
    [allCards, reviewRows, targetLevel, nowMs, newGoal, reviewGoal]);
  const { dueCards, newCards } = plan;
  const reviewsByKey=useMemo(()=>new Map(reviewRows.map(r=>[cardKey(r.item_type,r.item_id,r.review_mode),r])),[reviewRows]);
  const missedCards = useMemo(() => allCards
    .filter(card => reviewsByKey.get(card.key)?.streak === 0)
    .sort((a, b) => Date.parse(reviewsByKey.get(a.key)!.updated_at) - Date.parse(reviewsByKey.get(b.key)!.updated_at)),
    [allCards, reviewsByKey]);
  useEffect(() => {
    const nextDue = reviewRows.reduce((next, row) => {
      const due = Date.parse(row.due_at);
      return due > nowMs ? Math.min(next, due) : next;
    }, plan.nextMidnight);
    const updateClock = () => setNowMs(Date.now());
    const timer = Number.isFinite(nextDue)
      ? window.setTimeout(updateClock, Math.min(2_147_483_647, Math.max(0, nextDue - Date.now())))
      : undefined;
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, [reviewRows, nowMs, plan.nextMidnight]);
  const kanjiLearned=new Set(reviewRows.filter(r=>r.item_type==="kanji").map(r=>r.item_id)).size;
  const wordsLearned=new Set(reviewRows.filter(r=>r.item_type==="vocabulary").map(r=>r.item_id)).size;
  const streak=dayStreak(logs,nowMs);
  const lastWeekCount=logs.filter(log=>nowMs-new Date(log.reviewed_at).getTime()<7*86_400_000).length;
  const currentCard=queue[reviewIndex]??null;
  const finished=queue.length>0 && reviewIndex>=queue.length;

  function startReview() {
    beginReview(dueCards, "review");
  }

  function beginReview(selected: StudyCard[], kind: typeof sessionKind) {
    setError("");
    if (savingRef.current) return;
    setSessionKind(kind);
    setQueue(selected);
    setReviewIndex(0);
    setReviewResult(null);
    setTab("review");
  }

  async function score(card: StudyCard, correct: boolean) {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const previous=reviewsByKey.get(card.key);
      const next=getNextReview(previous,correct);
      const row:ReviewRow={
        user_id:userId,
        item_type:card.itemType,
        item_id:card.itemId,
        review_mode:card.reviewMode,
        ...next,
      };
      const {data:stored,error:saveError}=await client.from("review_state").upsert(row,{onConflict:"user_id,item_type,item_id,review_mode"}).select("*").single();
      if(saveError) throw saveError;
      // The progress save is authoritative. A logging error must not cause duplicate scoring.
      const {error:logError}=await client.from("review_logs").insert({
        user_id:userId,
        item_type:card.itemType,
        item_id:card.itemId,
        review_mode:card.reviewMode,
        correct,
      });
      setReviewRows(existing=>[...existing.filter(r=>cardKey(r.item_type,r.item_id,r.review_mode)!==card.key),stored as ReviewRow]);
      if (!logError) setLogs(existing=>[{reviewed_at:new Date().toISOString()},...existing]);
      else setError("복습 진도는 저장했지만 통계 기록에 실패했어요. 새로고침 후 확인해 주세요.");
      setNowMs(Date.now());
      return true;
    } catch(cause) {
      setError(cause instanceof Error?cause.message:"복습 결과를 저장하지 못했어요.");
      return false;
    } finally { savingRef.current = false; setSaving(false); }
  }

  async function submitReview(input: string) {
    if (!currentCard || reviewResult) return;
    const correct = matchesAnswer(currentCard, input);
    if (await score(currentCard, correct)) setReviewResult({ input, correct });
  }

  function nextReview() {
    setReviewIndex(index => index + 1);
    setReviewResult(null);
  }

  async function saveGoals(goals: Goals) {
    const { data, error } = await client.from("profiles").update(goals).eq("id", userId).select("*").single();
    if (error) throw error;
    setProfile(data as Profile);
    setQueue([]);
    setReviewIndex(0);
  }

  async function signOut() {
    const {error:signOutError}=await client.auth.signOut();
    if(signOutError) setError(signOutError.message);
  }

  return <div className="app-shell">
    <header className="topbar">
      <button type="button" className="brand-button" onClick={()=>setTab("home")} aria-label="Kotoba 홈">
        <span className="logo-mark small"><BookOpenText size={20}/></span><span className="brand-name">kotoba<span className="brand-dot">.</span></span>
      </button>
      <div className="top-actions">
        {profile && <span className="level-badge">N{targetLevel} 목표</span>}
        <button type="button" className="avatar-button" onClick={()=>setTab("settings")} aria-label="개인 설정"><Settings2 size={19}/></button>
      </div>
    </header>
    <main className="content">
      {error && <div className="alert-error" role="alert"><CircleHelp size={17}/><span>{error}</span>{profile && <button type="button" onClick={()=>setError("")} aria-label="오류 닫기">×</button>}</div>}
      {!profile ? (
        <div className="loading-state">
          {loading || !error ? <p role="status">공부 내용을 불러오고 있어요…</p> : (
            <button type="button" className="primary-button" onClick={() => void refresh()}>다시 시도</button>
          )}
        </div>
      ) : <>
        {tab==="settings" && <PersonalSettings profile={profile} email={user.email} onSave={saveGoals} onSignOut={() => void signOut()}/>}
        {tab==="home" && <section className="view-stack">
          <div className="hero-panel">
            <div className="hero-copy"><span className="hero-eyebrow"><Sparkles size={14}/> 오늘도 조금씩, 꾸준히</span><h1>{profile?.nickname ?? "학습자"}님,<br/>한 글자씩<br/><em>쌓아가요.</em></h1><p>이해하고, 연결하고, 오래 기억하기.</p></div>
            <span className="hero-kanji" aria-hidden="true">学</span>
          </div>
          <div className="dashboard-title"><div><span className="eyebrow">MY PROGRESS</span><h2>나의 학습 현황</h2></div><span className="muted-small">JLPT N{targetLevel} 목표</span></div>
          <div className="stats-grid">
            <div className="stat-box"><span className="stat-icon"><Layers size={19}/></span><strong>{kanjiLearned}<small>개</small></strong><span>배운 한자</span></div>
            <div className="stat-box"><span className="stat-icon amber"><BookOpenText size={19}/></span><strong>{wordsLearned}<small>개</small></strong><span>배운 단어</span></div>
            <div className="stat-box"><span className="stat-icon pink"><Flame size={19}/></span><strong>{streak}<small>일</small></strong><span>연속 학습</span></div>
          </div>
          <div className="review-cta"><div className="review-cta-top"><span className="review-cta-icon"><RotateCcw size={20}/></span><span className="eyebrow">SPACED REPETITION</span></div><div className="review-cta-body"><div><h3>오늘의 복습</h3><p>오늘 복습 {plan.reviewDone} / {reviewGoal}장 · 기한이 된 카드 {plan.dueTotal}장</p></div><span className="due-bubble">{dueCards.length}<small>개</small></span></div><button type="button" className="cta-link" onClick={startReview} disabled={dueCards.length===0}>{plan.reviewDone >= reviewGoal ? "오늘의 복습 목표 달성" : dueCards.length ? "복습 시작하기" : "지금 복습할 카드가 없어요"} <ArrowRight size={17}/></button></div>
          <div className="white-panel"><h3>오늘의 새 학습</h3>
            <p>N{targetLevel} · 오늘 처음 학습한 카드 {plan.newDone} / {newGoal}장</p>
            <button className="primary-button" disabled={!newCards.length} onClick={() => beginReview(newCards, "new")}>
              {newCards.length ? `새 카드 ${newCards.length}장 학습하기` : "오늘의 새 학습 완료"}
            </button>
          </div>
          <div className="feature-grid">
            <button className="feature-card" type="button" onClick={()=>setTab("learn")}><span className="feature-glyph">字</span><strong>한자와 단어</strong><small>연결해서 기억하기</small><ChevronRight size={17}/></button>
            <button className="feature-card mint" type="button" disabled={!missedCards.length || saving} onClick={() => beginReview(missedCards.slice(0, 12), "missed")}>
              <span className="feature-glyph"><RotateCcw size={33}/></span><strong>오답 다시 보기</strong>
              <small>{missedCards.length ? `다시 떠올릴 카드 ${missedCards.length}개` : "다시 볼 오답이 없어요"}</small><ChevronRight size={17}/>
            </button>
          </div>
          <div className="weekly-panel"><CalendarCheck2 size={18}/><span>최근 7일 동안 카드를 <strong>{lastWeekCount}번</strong> 풀었어요.</span></div>
          <p className="helper-copy">JLPT 급수는 학습용 참고 분류입니다.</p>
        </section>}
        {tab==="learn" && <LearningView onScore={score} saving={saving} kanji={kanji} vocabulary={vocabulary} links={links} targetLevel={targetLevel}/>}
        {tab==="review" && <ReviewView key={currentCard?.key ?? "summary"} sessionLabel={sessionKind==="new"?"새 학습":sessionKind==="missed"?"오답 복습":"복습"} card={currentCard} index={reviewIndex} total={queue.length} dueCount={dueCards.length} result={reviewResult} saving={saving} finished={finished} onSubmit={submitReview} onNext={nextReview} onStart={startReview}/>}
      </>}
    </main>
    <nav className="bottom-nav" aria-label="주 메뉴">
      <button type="button" className={tab==="home"?"active":""} onClick={()=>setTab("home")} aria-current={tab==="home"?"page":undefined}><House size={21}/><span>홈</span></button>
      <button type="button" className={tab==="learn"?"active":""} onClick={()=>setTab("learn")} aria-current={tab==="learn"?"page":undefined}><BookOpenText size={21}/><span>학습</span></button>
      <button type="button" className={tab==="review"?"active":""} onClick={()=>setTab("review")} aria-current={tab==="review"?"page":undefined}><RotateCcw size={21}/><span>복습</span></button>
      <button type="button" className={tab==="settings"?"active":""} onClick={()=>setTab("settings")} aria-current={tab==="settings"?"page":undefined}><Settings2 size={21}/><span>개인</span></button>
    </nav>
  </div>;
}
