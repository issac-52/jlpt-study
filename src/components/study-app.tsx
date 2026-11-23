"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ArrowRight, BookOpenText, CalendarCheck2, ChevronRight, CircleHelp, Flame, House, Layers, LogOut, RotateCcw, Settings2, Sparkles, UsersRound } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { cardKey, getNextReview, isDue, makeCards } from "@/lib/study";
import type { FriendRequest, FriendStat, KanjiRow, Level, Profile, ReviewRow, StudyCard, VocabularyKanjiRow, VocabularyRow } from "@/lib/types";
import AuthScreen from "./auth-screen";
import { includeN5 } from "@/lib/n5";
import LearningView from "./learning-view";
import ReviewView from "./review-view";
import FriendsView from "./friends-view";

type Tab = "home" | "learn" | "review" | "friends";
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
const levels: Level[] = [5,4,3,2];

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

  if (!client) return <div className="setup-page"><div className="logo-mark"><BookOpenText size={25}/></div><span className="eyebrow">KOTOBA / SETUP</span><h1>이제 첫 페이지가<br/>준비됐어요.</h1><p>Supabase를 연결하면 회원가입, 한자·단어 학습과 친구 기능을 이용할 수 있어요.</p><div className="setup-code">.env.local<br/>NEXT_PUBLIC_SUPABASE_URL=...<br/>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</div><p className="helper-copy">README.md에 있는 SQL 마이그레이션도 먼저 실행해 주세요.</p></div>;
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
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [people, setPeople] = useState<{id:string;nickname:string}[]>([]);
  const [stats, setStats] = useState<FriendStat[]>([]);
  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const lastMonth = new Date(Date.now() - 35 * 86_400_000).toISOString();
      const [p, k, v, link, rev, log, req, stat, names] = await Promise.all([
        client.from("profiles").select("id,nickname,target_level,friend_code").eq("id",userId).single(),
        client.from("kanji").select("id,character,meaning_ko,onyomi,kunyomi,jlpt_level").order("character"),
        client.from("vocabulary").select("id,word,reading,meaning_ko,jlpt_level,example_ja,example_ko").order("word"),
        client.from("vocabulary_kanji").select("vocabulary_id,kanji_id,position"),
        client.from("review_state").select("user_id,item_type,item_id,review_mode,streak,interval_days,due_at,updated_at").eq("user_id",userId),
        client.from("review_logs").select("reviewed_at").eq("user_id",userId).gte("reviewed_at", lastMonth).order("reviewed_at",{ascending:false}).limit(2000),
        client.from("friend_requests").select("id,sender_id,recipient_id,status"),
        client.rpc("get_friend_progress"),
        client.rpc("get_pending_friend_names"),
      ]);
      const firstError = [p,k,v,link,rev,log,req,stat,names].find(result=>result.error)?.error;
      if (firstError) throw firstError;
      if (!p.data) throw new Error("프로필이 없어요. 데이터베이스 초기화 상태를 확인해 주세요.");
      setProfile(p.data as Profile);
      const content = includeN5((k.data ?? []) as KanjiRow[], (v.data ?? []) as VocabularyRow[], (link.data ?? []) as VocabularyKanjiRow[]);
      setKanji(content.kanji);
      setVocabulary(content.vocabulary);
      setLinks(content.links);
      setReviewRows((rev.data ?? []) as ReviewRow[]);
      setLogs((log.data ?? []) as ReviewLog[]);
      setRequests((req.data ?? []) as FriendRequest[]);
      setStats((stat.data ?? []) as FriendStat[]);
      setPeople((names.data ?? []) as { id: string; nickname: string }[]);
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
  const cards=useMemo(()=>makeCards(kanji,vocabulary).filter(c=>c.level>=targetLevel),[kanji,vocabulary,targetLevel]);
  const reviewsByKey=useMemo(()=>new Map(reviewRows.map(r=>[cardKey(r.item_type,r.item_id,r.review_mode),r])),[reviewRows]);
  const dueCards=useMemo(()=>cards.filter(c=>isDue(reviewsByKey.get(c.key))),[cards,reviewsByKey]);
  const kanjiLearned=new Set(reviewRows.filter(r=>r.item_type==="kanji").map(r=>r.item_id)).size;
  const wordsLearned=new Set(reviewRows.filter(r=>r.item_type==="vocabulary").map(r=>r.item_id)).size;
  const streak=dayStreak(logs,nowMs);
  const lastWeekCount=logs.filter(log=>nowMs-new Date(log.reviewed_at).getTime()<7*86_400_000).length;
  const currentCard=queue[reviewIndex]??null;
  const finished=queue.length>0 && reviewIndex>=queue.length;

  function startReview() {
    setError("");
    const due=cards.filter(c=>isDue(reviewsByKey.get(c.key)));
    // Existing due cards first, then new cards. A session is capped at 12 to keep it approachable.
    due.sort((a,b)=>{
      const aa=reviewsByKey.get(a.key)?.due_at;
      const bb=reviewsByKey.get(b.key)?.due_at;
      if (aa && !bb) return -1;
      if (!aa && bb) return 1;
      return (aa??"").localeCompare(bb??"");
    });
    setQueue(due.slice(0,12));
    setReviewIndex(0);
    setRevealed(false);
    setTab("review");
  }

  async function score(correct:boolean) {
    if(!currentCard || saving) return;
    setSaving(true);
    setError("");
    try {
      const previous=reviewsByKey.get(currentCard.key);
      const next=getNextReview(previous,correct);
      const row:ReviewRow={
        user_id:userId,
        item_type:currentCard.itemType,
        item_id:currentCard.itemId,
        review_mode:currentCard.reviewMode,
        ...next,
      };
      const {error:saveError}=await client.from("review_state").upsert(row,{onConflict:"user_id,item_type,item_id,review_mode"});
      if(saveError) throw saveError;
      // The progress save is authoritative. A logging error must not cause duplicate scoring.
      const {error:logError}=await client.from("review_logs").insert({
        user_id:userId,
        item_type:currentCard.itemType,
        item_id:currentCard.itemId,
        review_mode:currentCard.reviewMode,
        correct,
      });
      setReviewRows(existing=>[...existing.filter(r=>cardKey(r.item_type,r.item_id,r.review_mode)!==currentCard.key),row]);
      if (!logError) setLogs(existing=>[{reviewed_at:new Date().toISOString()},...existing]);
      else setError("복습 진도는 저장했지만 통계 기록에 실패했어요. 새로고침 후 확인해 주세요.");
      setNowMs(Date.now());
      setReviewIndex(i=>i+1);
      setRevealed(false);
    } catch(cause) {
      setError(cause instanceof Error?cause.message:"복습 결과를 저장하지 못했어요.");
    } finally {setSaving(false);}
  }

  async function setTarget(level:Level) {
    if(!profile) return;
    const {error:updateError}=await client.from("profiles").update({target_level:level}).eq("id",userId);
    if(updateError){setError(updateError.message);return;}
    setProfile({...profile,target_level:level});
    setQueue([]);
    setReviewIndex(0);
  }

  async function sendFriend(code:string):Promise<string> {
    const {data,error:rpcError}=await client.rpc("request_friend_by_code",{p_code:code});
    if(rpcError) throw rpcError;
    await refresh();
    return String(data);
  }
  async function respondFriend(id:string,accept:boolean) {
    const {error:replyError}=await client.from("friend_requests").update({status:accept?"accepted":"rejected"})
      .eq("id",id).eq("recipient_id",userId).eq("status","pending");
    if(replyError) throw replyError;
    await refresh();
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
        <button type="button" className="avatar-button" onClick={()=>setProfileEditing(v=>!v)} aria-label="학습 목표와 계정 설정" aria-expanded={profileEditing} aria-controls={profileEditing ? "account-settings" : undefined}><Settings2 size={19}/></button>
      </div>
    </header>
    {profileEditing && <div id="account-settings" className="settings-panel"><div><strong>{profile?.nickname ?? "학습자"}</strong><small>{user.email}</small></div><label>학습 목표 급수<select value={targetLevel} onChange={e=>void setTarget(Number(e.target.value) as Level)}>{levels.map(n=><option key={n} value={n}>JLPT N{n}</option>)}</select></label><button type="button" onClick={()=>void signOut()} className="logout-button"><LogOut size={16}/> 로그아웃</button></div>}
    <main className="content">
      {error && <div className="alert-error" role="alert"><CircleHelp size={17}/><span>{error}</span>{profile && <button type="button" onClick={()=>setError("")} aria-label="오류 닫기">×</button>}</div>}
      {!profile ? (
        <div className="loading-state">
          {loading || !error ? <p role="status">공부 내용을 불러오고 있어요…</p> : (
            <button type="button" className="primary-button" onClick={() => void refresh()}>다시 시도</button>
          )}
        </div>
      ) : <>
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
          <div className="review-cta"><div className="review-cta-top"><span className="review-cta-icon"><RotateCcw size={20}/></span><span className="eyebrow">SPACED REPETITION</span></div><div className="review-cta-body"><div><h3>오늘의 복습</h3><p>기억이 사라지기 전에 다시 만나기</p></div><span className="due-bubble">{dueCards.length}<small>개</small></span></div><button type="button" className="cta-link" onClick={startReview} disabled={dueCards.length===0}>{dueCards.length===0?"복습 완료":"복습 시작하기"} <ArrowRight size={17}/></button></div>
          <div className="feature-grid">
            <button className="feature-card" type="button" onClick={()=>setTab("learn")}><span className="feature-glyph">字</span><strong>한자와 단어</strong><small>연결해서 기억하기</small><ChevronRight size={17}/></button>
            <button className="feature-card mint" type="button" onClick={()=>setTab("friends")}><span className="feature-glyph"><UsersRound size={33}/></span><strong>친구와 함께</strong><small>함께 만드는 학습 습관</small><ChevronRight size={17}/></button>
          </div>
          <div className="weekly-panel"><CalendarCheck2 size={18}/><span>최근 7일 동안 <strong>{lastWeekCount}번</strong> 복습했어요.</span></div>
          <p className="helper-copy">JLPT 급수는 학습용 참고 분류입니다.</p>
        </section>}
        {tab==="learn" && <LearningView kanji={kanji} vocabulary={vocabulary} links={links} targetLevel={targetLevel}/>}
        {tab==="review" && <ReviewView card={currentCard} index={reviewIndex} total={queue.length} dueCount={dueCards.length} revealed={revealed} saving={saving} finished={finished} onReveal={()=>setRevealed(true)} onScore={correct=>void score(correct)} onStart={startReview}/>}
        {tab==="friends" && profile && <FriendsView userId={userId} profile={profile} requests={requests} people={people} stats={stats} onSend={sendFriend} onRespond={respondFriend} onRefresh={refresh}/>}
      </>}
    </main>
    <nav className="bottom-nav" aria-label="주 메뉴">
      <button type="button" className={tab==="home"?"active":""} onClick={()=>setTab("home")} aria-current={tab==="home"?"page":undefined}><House size={21}/><span>홈</span></button>
      <button type="button" className={tab==="learn"?"active":""} onClick={()=>setTab("learn")} aria-current={tab==="learn"?"page":undefined}><BookOpenText size={21}/><span>학습</span></button>
      <button type="button" className={tab==="review"?"active":""} onClick={()=>setTab("review")} aria-current={tab==="review"?"page":undefined}><RotateCcw size={21}/><span>복습</span></button>
      <button type="button" className={tab==="friends"?"active":""} onClick={()=>setTab("friends")} aria-current={tab==="friends"?"page":undefined}><UsersRound size={21}/><span>친구</span></button>
    </nav>
  </div>;
}
