/* TimePilot v8.8 - Adaptive Personalization Engine
 * Safe, additive module. Learns from stated preferences, actual execution records, and feedback.
 */
(() => {
  'use strict';

  const PROFILE_KEY = 'tp_personal_profile_v880';
  const FEEDBACK_KEY = 'tp_personal_feedback_v880';
  const INSIGHT_KEY = 'tp_personal_insight_v880';
  const CARD_ID = 'tp-v88-personal';
  const STYLE_ID = 'tp-v88-style';

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };

  function todayKey() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function getProfile() { return load(PROFILE_KEY, null); }
  function getFeedback() { return load(FEEDBACK_KEY, []).slice(-10); }
  function getInsight() { return load(INSIGHT_KEY, null); }
  function getRecords() { const raw=load('tp_execution_v850',[]); return Array.isArray(raw)?raw.slice(-60):[]; }
  function getTodayEvents() { const cal=typeof appState!=='undefined'&&appState?.calendar?appState.calendar:{}; return Array.isArray(cal[todayKey()])?cal[todayKey()]:[]; }

  function adaptiveLearning(records) {
    const tasks = {}, hours = {};
    records.forEach(r => {
      const title = String(r.title || '').replace(/\s*（\d+分）/g, '').replace(/\s*（延期）/g, '').trim().slice(0, 24);
      const minutes = Number(r.minutes) || 0;
      if (title && minutes > 0) {
        const x = tasks[title] || { count: 0, total: 0 };
        x.count++; x.total += minutes; tasks[title] = x;
      }
      const h = String(r.time || '').slice(0, 2);
      if (/^\d\d$/.test(h)) hours[h] = (hours[h] || 0) + 1;
    });
    const task_profiles = Object.entries(tasks)
      .sort((a,b) => (b[1].count-a[1].count) || (b[1].total-a[1].total))
      .slice(0, 8)
      .map(([title,x]) => ({ title, count:x.count, avg_minutes:Math.round(x.total/x.count) }));
    const best_hour = Object.entries(hours).sort((a,b)=>b[1]-a[1])[0];
    return { task_profiles, best_hour: best_hour ? `${best_hour[0]}時台` : null };
  }

  function behaviorSummary() {
    const records=getRecords(), byHour={}, byType={};
    records.forEach(r=>{
      const h=String(r.time||'').slice(0,2);
      if(/^\d\d$/.test(h)){byHour[h]=byHour[h]||{count:0,minutes:0};byHour[h].count++;byHour[h].minutes+=Number(r.minutes)||0;}
      const t=String(r.type||'unknown'); byType[t]=(byType[t]||0)+1;
    });
    const strongest=Object.entries(byHour).sort((a,b)=>(b[1].minutes-a[1].minutes)||(b[1].count-a[1].count))[0];
    return {record_count:records.length,total_minutes:records.reduce((s,r)=>s+(Number(r.minutes)||0),0),recent:records.slice(-8).map(r=>({time:r.time,title:r.title,minutes:r.minutes,type:r.type})),strongest_hour:strongest?`${strongest[0]}時台`:'まだ判定できない',record_types:byType,adaptive:adaptiveLearning(records)};
  }
  function context(){ return getTodayEvents().map((e,i)=>({index:i,time:String(e?.time||''),title:String(e?.title||'予定'),completed:!!e?.checked})); }

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent=`#${CARD_ID}{margin-bottom:20px;border-color:rgba(168,85,247,.24);background:linear-gradient(135deg,rgba(168,85,247,.07),rgba(59,130,246,.045))}.tp88-head{display:flex;align-items:center;gap:11px;margin-bottom:12px}.tp88-icon{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(168,85,247,.14);color:var(--color-ai);font-size:17px;flex:none}.tp88-title{font-size:15px;font-weight:900;line-height:1.35;font-family:inherit}.tp88-sub{font-size:10px;color:var(--text-muted);margin-top:3px}.tp88-panel{padding:11px 12px;border:1px solid var(--glass-border);border-radius:12px;margin-top:9px;background:rgba(255,255,255,.03)}.tp88-label{font-size:10px;color:var(--text-muted);font-weight:800;margin-bottom:4px}.tp88-text{font-size:12px;line-height:1.55;font-weight:700}.tp88-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.tp88-btn{width:100%;padding:11px 8px;border:0;border-radius:11px;background:linear-gradient(135deg,var(--color-ai),var(--color-study));color:#fff;font-size:11px;font-weight:900;cursor:pointer}.tp88-btn.secondary{background:rgba(255,255,255,.06);border:1px solid var(--glass-border);color:var(--text-main)}.tp88-btn:disabled{opacity:.55;cursor:not-allowed}.tp88-status{font-size:11px;color:var(--text-muted);line-height:1.5;margin-top:8px}`;document.head.appendChild(s);
  }

  function card(){
    const home=document.getElementById('page-home');if(!home)return null;let c=document.getElementById(CARD_ID);if(c)return c;injectStyles();c=document.createElement('div');c.id=CARD_ID;c.className='glass-card';const anchor=document.getElementById('tp-v86-reflection')||document.getElementById('tp-v85-execution')||document.getElementById('tp-v84-ai-today')||document.getElementById('tp-v83-overview');if(anchor)anchor.insertAdjacentElement('afterend',c);else home.prepend(c);return c;
  }

  function render(){
    const c=card();if(!c)return;const p=getProfile();
    if(!p){
      c.innerHTML=`<div class="tp88-head"><div class="tp88-icon"><i class="fa-solid fa-user-gear"></i></div><div><div class="tp88-title">あなた専用AIの初期設定</div><div class="tp88-sub">約1分。使い方の好みをAIに伝えます。</div></div></div><div class="tp88-survey"><div><div class="tp88-label">主な目的</div><div class="tp88-row" data-q="goal"><button class="tp88-option" data-v="勉強・学習">勉強・学習</button><button class="tp88-option" data-v="部活・運動">部活・運動</button><button class="tp88-option" data-v="生活リズム">生活リズム</button><button class="tp88-option" data-v="時間管理">時間管理</button></div></div><div><div class="tp88-label">集中しやすい時間帯</div><div class="tp88-row" data-q="time"><button class="tp88-option" data-v="朝">朝</button><button class="tp88-option" data-v="昼">昼</button><button class="tp88-option" data-v="夕方">夕方</button><button class="tp88-option" data-v="夜">夜</button></div></div><div><div class="tp88-label">普段の連続集中時間</div><div class="tp88-row" data-q="focus"><button class="tp88-option" data-v="25">25分前後</button><button class="tp88-option" data-v="40">40分前後</button><button class="tp88-option" data-v="50">50分前後</button><button class="tp88-option" data-v="60">60分以上</button></div></div><button class="tp88-btn" id="tp88-save-profile">設定を保存してAIを学習開始</button><div class="tp88-status">後から実際の実行記録を使って、AIの提案を調整できます。</div></div>`;
      const selected={};c.querySelectorAll('.tp88-row').forEach(row=>row.querySelectorAll('.tp88-option').forEach(b=>b.addEventListener('click',()=>{row.querySelectorAll('.tp88-option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selected[row.dataset.q]=b.dataset.v;})));
      c.querySelector('#tp88-save-profile').addEventListener('click',()=>{if(!selected.goal||!selected.time||!selected.focus){alert('3項目を選択してください。');return;}save(PROFILE_KEY,{goal:selected.goal,preferred_time:selected.time,focus_minutes:Number(selected.focus),created_at:new Date().toISOString(),version:2});render();});return;
    }
    const b=behaviorSummary(),ins=getInsight();
    c.innerHTML=`<div class="tp88-head"><div class="tp88-icon"><i class="fa-solid fa-brain"></i></div><div style="flex:1"><div class="tp88-title">あなた専用AI</div><div class="tp88-sub">実際の行動を学習して、次の計画の組み方を調整</div></div></div><div class="tp88-panel"><div class="tp88-label">現在の学習データ</div><div class="tp88-text">${esc(p.goal)} ・ ${esc(p.preferred_time)}に集中しやすい ・ ${esc(p.focus_minutes)}分を目安</div><div class="tp88-status">実行記録 ${b.record_count}件 ・ 累計 ${b.total_minutes}分 ・ 実行が多い時間帯 ${esc(b.strongest_hour)}</div></div>${ins?.rule?`<div class="tp88-panel"><div class="tp88-label">AIが学習したあなたの傾向</div><div class="tp88-text">${esc(ins.rule)}</div><div class="tp88-status">信頼度：${esc(ins.confidence||'low')} ・ ${esc(ins.learned_at||'')}</div></div>`:''}<div class="tp88-panel" id="tp88-result"><div class="tp88-label">AIの個別提案</div><div class="tp88-text" data-result-text>${ins?.next?esc(ins.next):'今日の行動データを分析して提案できます。'}</div></div><div class="tp88-actions"><button class="tp88-btn" id="tp88-analyze"><i class="fa-solid fa-wand-magic-sparkles"></i> 個別分析</button><button class="tp88-btn secondary" id="tp88-replan"><i class="fa-solid fa-shuffle"></i> 今日を再計画</button></div><div class="tp88-status" id="tp88-feedback" style="display:none"></div>`;
    c.querySelector('#tp88-analyze').addEventListener('click',analyze);c.querySelector('#tp88-replan').addEventListener('click',replan);
  }

  function ensureLogin(){if(typeof requireAILogin==='function')return requireAILogin();if(typeof currentUser!=='undefined'&&currentUser)return true;alert('AI機能を利用するにはログインしてください。');return false;}
  async function callAI(prompt){if(!ensureLogin()||typeof invokeTimePilotAI!=='function')throw new Error('LOGIN_REQUIRED');const data=await invokeTimePilotAI({mode:'chat',text:prompt});return String(data?.reply||data?.content||'').trim();}
  function parseJSON(text){const m=String(text||'').match(/\{[\s\S]*\}/);if(!m)return null;try{return JSON.parse(m[0]);}catch(_){return null;}}

  async function analyze(){
    const c=card();if(!c)return;const btn=c.querySelector('#tp88-analyze'),out=c.querySelector('[data-result-text]');btn.disabled=true;out.textContent='実行記録・予定・評価を分析しています…';
    const p=getProfile(),b=behaviorSummary(),events=context(),feedback=getFeedback();
    const prompt=`あなたはTimePilotの個人適応AIです。実際の行動データを自己申告より優先し、「この人なら続けやすい」予定ルールを学習してください。記録が少ない場合は断定しないでください。必ずJSONのみ。形式:{"summary":"本人の特徴","rule":"今後の予定の組み方","next":"今日まずやること","confidence":"low|medium|high"}\nプロフィール:${JSON.stringify(p)}\n実行データ:${JSON.stringify(b)}\n今日の予定:${JSON.stringify(events)}\n過去の提案への評価:${JSON.stringify(feedback)}\n重要:睡眠・休息を削って効率を上げるルールは作らない。`;
    try{const parsed=parseJSON(await callAI(prompt));if(!parsed?.summary)throw new Error('INVALID');const insight={summary:parsed.summary,rule:parsed.rule||'',next:parsed.next||'',confidence:parsed.confidence||'low',learned_at:todayKey()};save(INSIGHT_KEY,insight);out.textContent=`${parsed.summary} ${parsed.rule?'予定ルール：'+parsed.rule+'。':''} ${parsed.next?'次：'+parsed.next:''}`;const fb=c.querySelector('#tp88-feedback');fb.style.display='block';fb.innerHTML=`この提案は合っていましたか？ <button type="button" data-fb="good">合っていた</button> <button type="button" data-fb="bad">違った</button>`;fb.querySelectorAll('[data-fb]').forEach(x=>x.addEventListener('click',()=>{const f=getFeedback();f.push({date:todayKey(),rating:x.dataset.fb,summary:parsed.summary,rule:parsed.rule||''});save(FEEDBACK_KEY,f);fb.textContent='評価を保存しました。次回の提案に反映します。';}));}
    catch(e){out.textContent=e?.message==='LOGIN_REQUIRED'?'ログインすると個別分析を利用できます。':'AI分析に失敗しました。もう一度試してください。';}finally{btn.disabled=false;}
  }

  async function replan(){
    const c=card();if(!c)return;const btn=c.querySelector('#tp88-replan'),out=c.querySelector('[data-result-text]');btn.disabled=true;out.textContent='今日の残り時間を再計画しています…';
    const events=context(),b=behaviorSummary(),p=getProfile(),ins=getInsight(),feedback=getFeedback();const now=new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',hour12:false});
    const prompt=`あなたはTimePilotの適応型スケジューラーです。現在時刻以降の今日の予定を、このユーザーの実際の行動傾向に合わせて再構築してください。単純な一律後ろ倒しではなく、重要度、未完了、実際に続けられた集中時間、過去のAI評価を考慮し、短縮・移動・延期を判断してください。睡眠や休息は犠牲にしないでください。既存予定を勝手に追加・削除せず、再計画案としてJSONのみ。形式:{"summary":"再計画の考え方","items":[{"time":"HH:MM","title":"予定","action":"keep|shorten|move|postpone","minutes":数字}],"reason":"理由"}\n現在時刻:${now}\nプロフィール:${JSON.stringify(p)}\n学習済み個人ルール:${JSON.stringify(ins)}\n行動データ:${JSON.stringify(b)}\n過去の評価:${JSON.stringify(feedback)}\n今日の予定:${JSON.stringify(events)}`;
    try{const parsed=parseJSON(await callAI(prompt));if(!parsed?.summary||!Array.isArray(parsed.items))throw new Error('INVALID');out.innerHTML=`${esc(parsed.summary)}<br>${parsed.items.map(i=>`<div style="margin-top:6px">${esc(i.time)}　${esc(i.title)}　<small>${esc(i.action)}${i.minutes?`・${esc(i.minutes)}分`:''}</small></div>`).join('')}<div style="margin-top:7px;color:var(--text-muted)">${esc(parsed.reason||'')}</div>`;}
    catch(e){out.textContent=e?.message==='LOGIN_REQUIRED'?'ログインすると再計画を利用できます。':'再計画に失敗しました。もう一度試してください。';}finally{btn.disabled=false;}
  }

  function boot(){const run=()=>{if(document.getElementById('page-home'))render();};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();}
  boot();
})();
