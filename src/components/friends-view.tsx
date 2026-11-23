"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, RefreshCw, Send, UserRoundCheck, UsersRound, X } from "lucide-react";
import type { FriendRequest, FriendStat, Profile } from "@/lib/types";

type Props = {
  userId: string;
  profile: Profile;
  requests: FriendRequest[];
  people: { id: string; nickname: string }[];
  stats: FriendStat[];
  onSend: (code: string) => Promise<string>;
  onRespond: (id: string, accept: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
};

const resultMessages: Record<string,string> = {
  sent: "친구 요청을 보냈어요. 상대가 수락하면 학습 통계를 비교할 수 있어요.",
  invalid_code: "친구 코드는 영문과 숫자 10자리예요.",
  not_found: "해당 친구 코드를 찾지 못했어요.",
  self: "본인의 코드는 사용할 수 없어요.",
  already_friends: "이미 친구로 연결되어 있어요.",
  already_pending: "이미 요청을 보냈어요.",
  incoming_request: "상대가 이미 요청했어요. 아래에서 요청을 수락해 주세요.",
};
export default function FriendsView({ userId, profile, requests, people, stats, onSend, onRespond, onRefresh }: Props) {
  const [code,setCode]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const nameOf=(id:string)=>people.find(p=>p.id===id)?.nickname ?? "친구";
  const incoming=requests.filter(r=>r.recipient_id===userId && r.status==="pending");
  const outgoing=requests.filter(r=>r.sender_id===userId && r.status==="pending");
  const accepted=stats.filter(s=>s.user_id!==userId);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || code.length !== 10) return;
    setBusy(true);setMessage("");
    try { const response=await onSend(code.trim().toUpperCase());setMessage(resultMessages[response]??response);if(response==="sent")setCode(""); }
    catch(e){setMessage(e instanceof Error?e.message:"요청을 보낼 수 없어요.");}
    finally {setBusy(false);}
  }
  async function respond(id:string,accept:boolean){
    setBusy(true);setMessage("");
    try {await onRespond(id,accept);setMessage(accept?"친구로 연결됐어요.":"요청을 거절했어요.");}
    catch(e){setMessage(e instanceof Error?e.message:"요청을 처리할 수 없어요.");}
    finally {setBusy(false);}
  }
  async function copyCode(){
    try {await navigator.clipboard.writeText(profile.friend_code);setMessage("친구 코드를 복사했어요.");}
    catch{setMessage("복사하지 못했어요. 코드를 길게 눌러 복사해 주세요.");}
  }

  return <section className="view-stack">
    <div className="section-head"><div><span className="eyebrow">STUDY TOGETHER</span><h2>같이 하면 더 꾸준하게</h2><p>각자 다른 급수를 공부해도 좋아요.</p></div></div>
    <div className="invite-card"><span className="label-light">나의 친구 코드</span><div className="invite-code"><strong>{profile.friend_code}</strong><button className="icon-button light" onClick={copyCode} aria-label="친구 코드 복사"><Copy size={19}/></button></div><p>코드를 친구에게 공유해 초대를 받아보세요.</p></div>
    <form className="white-panel" onSubmit={send}>
      <label className="field-label" htmlFor="friend-code">친구 코드 입력</label>
      <div className="invite-form">
        <input id="friend-code" className="input-field" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={10} placeholder="친구의 10자리 코드" autoCapitalize="characters" autoCorrect="off" spellCheck={false}/>
        <button type="submit" className="primary-icon" disabled={busy || code.length!==10} aria-label="친구 요청 보내기"><Send size={18}/></button>
      </div>
    </form>
    {message&&<p className="status-ok" role="status">{message}</p>}
    {incoming.length>0&&<div className="white-panel"><div className="card-header"><h3>받은 요청</h3><span className="count-pill">{incoming.length}</span></div>{incoming.map(r=><div key={r.id} className="friend-row"><span className="avatar-round"><UsersRound size={18}/></span><strong>{nameOf(r.sender_id)}</strong><div className="friend-actions"><button disabled={busy} className="tiny-button" onClick={()=>respond(r.id,false)} aria-label="친구 요청 거절"><X size={17}/></button><button disabled={busy} className="tiny-button positive" onClick={()=>respond(r.id,true)} aria-label="친구 요청 수락"><Check size={17}/></button></div></div>)}</div>}
    {outgoing.length>0&&<div className="white-panel"><h3>보낸 요청</h3>{outgoing.map(r=><div key={r.id} className="friend-row"><span className="avatar-round"><UsersRound size={18}/></span><strong>{nameOf(r.recipient_id)}</strong><small>수락 대기 중</small></div>)}</div>}
    <div className="white-panel"><div className="card-header"><h3>친구의 학습 현황</h3><button className="icon-button" onClick={()=>void onRefresh()} aria-label="통계 새로고침"><RefreshCw size={18}/></button></div>
      {accepted.length===0 ? <div className="friends-empty"><UserRoundCheck size={28}/><p>아직 연결된 친구가 없어요.<br/>상대방이 초대를 수락하면 여기서 비교할 수 있어요.</p></div> :
        accepted.map(s=><div className="friend-stats" key={s.user_id}><div className="friend-person"><span className="avatar-round">{s.nickname.slice(0,1)}</span><strong>{s.nickname}</strong><span className="connected-badge">함께 공부 중</span></div><div className="friend-metrics"><span>한자 <b>{s.kanji_learned}</b></span><span>단어 <b>{s.vocab_learned}</b></span><span>최근 7일 복습 <b>{s.reviews_last_7d}</b></span></div></div>)}
    </div>
    <p className="helper-copy">친구 요청을 서로 수락하면 한자/단어 학습 수와 최근 7일 복습 수만 공유됩니다. 오답 내용이나 이메일은 공유하지 않아요.</p>
  </section>;
}
