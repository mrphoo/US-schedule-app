/* TimePilot v8.5 - Home, AI Suggestion & Execution Record */
(() => {
  'use strict';

  const STYLE_ID = 'tp-v84-style';
  const CARD_ID = 'tp-v83-overview';
  const AI_CARD_ID = 'tp-v84-ai-today';
  const RECORD_CARD_ID = 'tp-v85-execution';
  const RECORD_KEY = 'tp_execution_v850';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tp-v83-overview { margin-bottom: 20px; }
      .tp-v83-overview-head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; }
      .tp-v83-overview-title { font-size:15px; font-weight:900; }
      .tp-v83-overview-date { font-size:11px; color:var(--text-muted); font-weight:700; }
      .tp-v83-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
      .tp-v83-stat { min-width:0; padding:12px 9px; border:1px solid var(--glass-border); border-radius:14px; background:rgba(255,255,255,.04); text-align:center; }
      .tp-v83-value { font-size:20px; font-weight:900; line-height:1.15; }
      .tp-v83-label { margin-top:4px; font-size:10px; color:var(--text-muted); font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .tp-v83-next { margin-top:10px; padding:10px 12px; border-radius:12px; background:rgba(59,130,246,.08); border:1px solid rgba(59,130,246,.18); font-size:12px; font-weight:700; }
      .tp-v83-next span { color:var(--text-muted); font-weight:600; }
      .tp-v83-today-btn { margin-left:auto; border:1px solid var(--glass-border); background:rgba(255,255,255,.05); color:var(--text-main); border-radius:10px; padding:7px 10px; font-size:11px; font-weight:800; cursor:pointer; }
      .tp-v83-today-btn:active { transform:scale(.96); }
      .tp-v84-ai-card { margin-bottom:20px; border-color:rgba(168,85,247,.28); background:linear-gradient(135deg,rgba(168,85,247,.09),rgba(59,130,246,.06)); }
      .tp-v84-ai-head { display:flex; align-items:center; gap:11px; margin-bottom:12px; }
      .tp-v84-ai-icon { width:38px; height:38px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:rgba(168,85,247,.16); color:var(--color-ai); font-size:17px; flex-shrink:0; }
      .tp-v84-ai-title { font-size:15px; font-weight:900; }
      .tp-v84-ai-sub { font-size:10px; color:var(--text-muted); margin-top:3px; }
      .tp-v84-ai-result { padding:13px; border-radius:14px; background:rgba(0,0,0,.12); border:1px solid var(--glass-border); margin-bottom:10px; display:none; }
      body.light-theme .tp-v84-ai-result { background:rgba(0,0,0,.035); }
      .tp-v84-ai-label { font-size:10px; color:var(--text-muted); font-weight:800; margin-bottom:4px; }
      .tp-v84-ai-next { font-size:18px; font-weight:900; line-height:1.3; }
      .tp-v84-ai-time { margin-top:8px; font-size:12px; font-weight:800; color:var(--color-study); }
      .tp-v84-ai-reason { margin-top:9px; font-size:12px; line-height:1.55; color:var(--text-muted); }
      .tp-v84-ai-action { margin-top:10px; padding:9px 11px; border-radius:10px; background:rgba(16,185,129,.08); border:1px solid rgba(16,185,129,.16); font-size:11px; font-weight:800; }
      .tp-v84-ai-btn { width:100%; padding:12px; border:0; border-radius:12px; background:linear-gradient(135deg,var(--color-ai),var(--color-study)); color:#fff; font-size:13px; font-weight:900; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:7px; }
      .tp-v84-ai-btn:disabled { opacity:.6; cursor:not-allowed; }
      .tp-v84-ai-empty { color:var(--text-muted); font-size:12px; line-height:1.5; padding:2px 0 10px; }
      .tp-v85-execution { margin-bottom:20px; }
      .tp-v85-execution-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
      .tp-v85-execution-title { font-size:15px; font-weight:900; }
      .tp-v85-execution-sub { font-size:10px; color:var(--text-muted); margin-top:3px; }
      .tp-v85-execution-rate { font-size:20px; font-weight:900; color:var(--color-sleep); }
      .tp-v85-progress { height:8px; border-radius:8px; background:rgba(128,128,128,.18); overflow:hidden; margin-bottom:12px; }
      .tp-v85-progress-bar { height:100%; width:0%; background:linear-gradient(90deg,var(--color-sleep),var(--color-study)); border-radius:8px; transition:width .3s; }
      .tp-v85-record { display:flex; gap:10px; align-items:center; padding:10px 0; border-top:1px solid var(--glass-border); }
      .tp-v85-record-icon { width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; background:rgba(59,130,246,.1); color:var(--color-study); flex:none; }
      .tp-v85-record-main { min-width:0; flex:1; }
      .tp-v85-record-title { font-size:12px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .tp-v85-record-time { font-size:10px; color:var(--text-muted); margin-top:2px; }
      .tp-v85-empty { font-size:11px; color:var(--text-muted); padding:4px 0; }
      .cal-cell { touch-action: manipulation; transition: transform .12s, background .2s, border-color .2s; }
      .cal-cell:active { transform:scale(.97); }
      @media (max-width:420px) {
        .tp-v83-stats { gap:6px; }
        .tp-v83-stat { padding:11px 6px; }
        .tp-v83-value { font-size:18px; }
        .tp-v84-ai-next { font-size:16px; }
      }
    `;
    document.head.appendChild(style);
  }

  function formatDate() {
    return new Intl.DateTimeFormat('ja-JP', { month:'long', day:'numeric', weekday:'short' }).format(new Date());
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getTasks() {
    const area = document.getElementById('home-checklist-area');
    if (!area) return { total:0, done:0, next:null, all:[] };
    const items = [...area.querySelectorAll('.mission-item')];
    const tasks = items.map(el => ({ time:el.querySelector('.mission-time')?.textContent?.trim()||'', text:el.querySelector('.mission-text')?.textContent?.trim()||'タスク', done:el.classList.contains('checked') }));
    const total = tasks.length, done = tasks.filter(t=>t.done).length;
    return { total, done, next:tasks.find(t=>!t.done)||null, all:tasks };
  }

  function ensureOverview() {
    const home = document.getElementById('page-home');
    const weather = document.getElementById('home-weather-text')?.closest('.glass-card');
    if (!home || !weather) return null;
    let card = document.getElementById(CARD_ID);
    if (!card) {
      card = document.createElement('div'); card.id=CARD_ID; card.className='glass-card tp-v83-overview';
      card.innerHTML=`<div class="tp-v83-overview-head"><div class="tp-v83-overview-title">今日の概要</div><div class="tp-v83-overview-date"></div></div><div class="tp-v83-stats"><div class="tp-v83-stat"><div class="tp-v83-value" data-stat="total">0</div><div class="tp-v83-label">タスク</div></div><div class="tp-v83-stat"><div class="tp-v83-value" data-stat="done">0</div><div class="tp-v83-label">完了</div></div><div class="tp-v83-stat"><div class="tp-v83-value" data-stat="rate">0%</div><div class="tp-v83-label">達成率</div></div></div><div class="tp-v83-next"><span>次にやる：</span><b data-stat="next">タスクを確認</b></div>`;
      weather.insertAdjacentElement('afterend',card);
    }
    return card;
  }

  function updateOverview() {
    const card=ensureOverview(); if(!card)return;
    const tasks=getTasks(), rate=tasks.total?Math.round(tasks.done/tasks.total*100):0;
    card.querySelector('.tp-v83-overview-date').textContent=formatDate();
    card.querySelector('[data-stat="total"]').textContent=tasks.total;
    card.querySelector('[data-stat="done"]').textContent=tasks.done;
    card.querySelector('[data-stat="rate"]').textContent=`${rate}%`;
    card.querySelector('[data-stat="next"]').textContent=tasks.next?`${tasks.next.time?tasks.next.time+'　':''}${tasks.next.text}`:(tasks.total?'今日のタスク完了':'まず予定を作成');
  }

  function ensureAIToday() {
    const home=document.getElementById('page-home'), overview=document.getElementById(CARD_ID);
    if(!home||!overview)return null;
    let card=document.getElementById(AI_CARD_ID);
    if(!card){
      card=document.createElement('div'); card.id=AI_CARD_ID; card.className='glass-card tp-v84-ai-card';
      card.innerHTML=`<div class="tp-v84-ai-head"><div class="tp-v84-ai-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div><div><div class="tp-v84-ai-title">今日のAI提案</div><div class="tp-v84-ai-sub">今日の予定から「次にやること」を提案</div></div></div><div class="tp-v84-ai-empty" data-ai-empty>予定を分析して、今やるべきことをAIに決めてもらえます。</div><div class="tp-v84-ai-result" data-ai-result><div class="tp-v84-ai-label">次にやること</div><div class="tp-v84-ai-next" data-ai-next>-</div><div class="tp-v84-ai-time" data-ai-time></div><div class="tp-v84-ai-reason" data-ai-reason></div><div class="tp-v84-ai-action" data-ai-action></div></div><button class="tp-v84-ai-btn" type="button" data-ai-button><i class="fa-solid fa-brain"></i> 今日をAI分析</button>`;
      overview.insertAdjacentElement('afterend',card); card.querySelector('[data-ai-button]').addEventListener('click',analyzeToday);
    }
    return card;
  }

  function safeJson(text){try{return JSON.parse(text);}catch(_){}const match=String(text||'').match(/\{[\s\S]*\}/);if(!match)return null;try{return JSON.parse(match[0]);}catch(_){return null;}}

  async function analyzeToday(){
    const card=ensureAIToday(); if(!card)return;
    const tasks=getTasks(), button=card.querySelector('[data-ai-button]'), empty=card.querySelector('[data-ai-empty]'), result=card.querySelector('[data-ai-result]');
    if(!tasks.all.length){empty.textContent='今日の予定がありません。まず予定を作成してください。';result.style.display='none';return;}
    if(typeof requireAILogin==='function'&&!requireAILogin())return;
    if(typeof invokeTimePilotAI!=='function'){empty.textContent='AI機能を読み込めませんでした。';return;}
    button.disabled=true;button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> 今日の予定を分析中...';empty.style.display='block';empty.textContent='予定・完了状況・現在時刻を分析しています。';result.style.display='none';
    const now=new Date(), currentTime=now.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}), taskText=tasks.all.map((t,i)=>`${i+1}. ${t.time||'時間未設定'} / ${t.text} / ${t.done?'完了':'未完了'}`).join('\n');
    const prompt=`あなたはTimePilotの時間管理AIです。ユーザーの今日の予定から、現在時刻以降で「次にやるべきこと」を1つだけ提案してください。完了済みタスクは除外し、時間が決まっている予定はその時間を優先してください。JSONのみで回答してください。\n現在時刻:${currentTime}\n今日の予定:\n${taskText}\n形式:{"next_task":"タスク名","recommended_time":"HH:MM","reason":"理由を1〜2文","action":"今すぐできる具体的な一歩"}`;
    try{
      const data=await invokeTimePilotAI({mode:'chat',text:prompt}), parsed=safeJson(data?.reply||data?.content||''); if(!parsed?.next_task)throw new Error('Invalid AI response');
      card.querySelector('[data-ai-next]').textContent=String(parsed.next_task);card.querySelector('[data-ai-time]').textContent=parsed.recommended_time?`おすすめ開始：${parsed.recommended_time}`:'';card.querySelector('[data-ai-reason]').textContent=String(parsed.reason||'今日の予定状況をもとに提案しています。');card.querySelector('[data-ai-action]').textContent=`最初の一歩：${String(parsed.action||parsed.next_task)}`;empty.style.display='none';result.style.display='block';
    }catch(e){console.error('Today AI error:',e);empty.style.display='block';empty.textContent=e?.message==='LOGIN_REQUIRED'?'AI機能を使うにはログインしてください。':'AI分析に失敗しました。もう一度試してください。';result.style.display='none';}
    finally{button.disabled=false;button.innerHTML='<i class="fa-solid fa-brain"></i> 今日をAI分析';}
  }

  function loadRecords(){try{const raw=localStorage.getItem(RECORD_KEY);const data=raw?JSON.parse(raw):[];return Array.isArray(data)?data:[];}catch(_){return[];}}
  function saveRecords(records){try{localStorage.setItem(RECORD_KEY,JSON.stringify(records.slice(-100)));}catch(_){} }
  function addExecutionRecord(title,minutes,type='timer'){
    if(!title)return;
    const records=loadRecords(), now=new Date();
    records.push({date:todayKey(),title:String(title),minutes:Math.max(1,Math.round(Number(minutes)||0)),type,time:now.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})});
    saveRecords(records); updateExecutionCard();
  }
  function todayRecords(){return loadRecords().filter(r=>r.date===todayKey());}

  function ensureExecutionCard(){
    const home=document.getElementById('page-home'), overview=document.getElementById(CARD_ID); if(!home||!overview)return null;
    let card=document.getElementById(RECORD_CARD_ID); if(card)return card;
    card=document.createElement('div');card.id=RECORD_CARD_ID;card.className='glass-card tp-v85-execution';
    card.innerHTML=`<div class="tp-v85-execution-head"><div><div class="tp-v85-execution-title">今日の実行記録</div><div class="tp-v85-execution-sub">計画した時間をどれだけ実行できたか</div></div><div class="tp-v85-execution-rate" data-exec-rate>0%</div></div><div class="tp-v85-progress"><div class="tp-v85-progress-bar" data-exec-bar></div></div><div data-exec-list></div>`;
    overview.insertAdjacentElement('afterend',card); return card;
  }

  function updateExecutionCard(){
    const card=ensureExecutionCard();if(!card)return;
    const records=todayRecords(), total=records.reduce((sum,r)=>sum+Number(r.minutes||0),0);
    const tasks=getTasks(), planned=tasks.total;
    const completed=tasks.done;
    const rate=planned?Math.round(completed/planned*100):0;
    card.querySelector('[data-exec-rate]').textContent=`${rate}%`;
    card.querySelector('[data-exec-bar]').style.width=`${rate}%`;
    const list=card.querySelector('[data-exec-list]');
    if(!records.length){list.innerHTML='<div class="tp-v85-empty">まだ実行記録がありません。タイマーを使うと、ここに記録されます。</div>';return;}
    const recent=records.slice(-3).reverse();
    list.innerHTML=recent.map(r=>`<div class="tp-v85-record"><div class="tp-v85-record-icon"><i class="fa-solid ${r.type==='timer'?'fa-stopwatch':'fa-check'}"></i></div><div class="tp-v85-record-main"><div class="tp-v85-record-title">${escapeText(r.title)}</div><div class="tp-v85-record-time">${r.time} ・ ${r.minutes}分実行</div></div></div>`).join('');
  }

  function escapeText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

  function monitorTimer(){
    if(window.__tpV85TimerMonitor)return; window.__tpV85TimerMonitor=true;
    let wasRunning=false, lastRemaining=null, startedTitle='';
    setInterval(()=>{
      try{
        const running=typeof isRunning!=='undefined'&&!!isRunning;
        if(running&&!wasRunning){startedTitle=document.getElementById('timer-title')?.textContent?.trim()||'集中セッション';lastRemaining=typeof timerRemaining!=='undefined'?timerRemaining:null;}
        if(wasRunning&&!running&&lastRemaining!==null&&typeof timerRemaining!=='undefined'&&timerRemaining<=0){
          const duration=typeof timerDuration!=='undefined'?timerDuration/60:0; if(duration>0)addExecutionRecord(startedTitle,duration,'timer');
        }
        wasRunning=running;
      }catch(_){}
    },500);
  }

  function addCalendarTodayButton(){
    const header=document.querySelector('.cal-header-nav');if(!header||header.querySelector('.tp-v83-today-btn'))return;
    const button=document.createElement('button');button.className='tp-v83-today-btn';button.type='button';button.textContent='今日';button.addEventListener('click',()=>{const today=document.querySelector('.cal-cell.today');if(today)today.scrollIntoView({behavior:'smooth',block:'center'});});header.appendChild(button);
  }

  function boot(){
    injectStyles();updateOverview();ensureAIToday();ensureExecutionCard();updateExecutionCard();addCalendarTodayButton();monitorTimer();
    const area=document.getElementById('home-checklist-area');
    if(area)new MutationObserver(()=>{updateOverview();ensureAIToday();ensureExecutionCard();updateExecutionCard();}).observe(area,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    setInterval(()=>{updateOverview();ensureAIToday();ensureExecutionCard();updateExecutionCard();addCalendarTodayButton();},1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();