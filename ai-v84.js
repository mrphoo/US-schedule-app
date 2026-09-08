// ========================================
// TimePilot v8.4.1 - Secure AI Gateway
// Browser never stores or sends the Groq API key.
// AI features require an authenticated session.
// ========================================

const TIMEPILOT_AI_FUNCTION = 'timepilot-ai';

async function invokeTimePilotAI(body) {
    if (typeof supabaseClient === 'undefined') throw new Error('Supabase client unavailable');
    if (typeof currentUser === 'undefined' || !currentUser) throw new Error('LOGIN_REQUIRED');

    const { data, error } = await supabaseClient.functions.invoke(TIMEPILOT_AI_FUNCTION, { body });
    if (error) throw error;
    return data;
}

function updateAISettingsUI() {
    const keyInput = document.getElementById('api-key');
    if (!keyInput) return;

    const card = keyInput.closest('.glass-card');
    if (!card) return;

    card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;border-radius:12px;background:rgba(168,85,247,0.15);display:flex;align-items:center;justify-content:center;color:var(--color-ai);font-size:20px;">
                <i class="fa-solid fa-shield-halved"></i>
            </div>
            <div>
                <div style="font-size:14px;font-weight:800;">Secure AI Gateway</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">AIキーはサーバー側で安全に管理されています</div>
            </div>
        </div>
        <div style="margin-top:14px;padding:10px 12px;border-radius:10px;background:rgba(16,185,129,0.08);color:var(--color-sleep);font-size:11px;font-weight:700;">
            <i class="fa-solid fa-circle-check"></i> ログイン後すぐにAI機能を利用できます
        </div>`;
}

function requireAILogin() {
    if (typeof currentUser !== 'undefined' && currentUser) return true;
    alert('AI機能を利用するにはログインしてください。');
    if (typeof openAuthModal === 'function') openAuthModal();
    return false;
}

function escapeAIHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function initSettings() {
    safeStorage.remove('tp_api_v800');
    appState.apiKey = '';

    if (appState.theme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('theme-btn-icon').innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    const pSel = document.getElementById('pref-select');
    pSel.innerHTML = '';
    allPrefs.forEach(p => {
        const o = document.createElement('option');
        o.value = p;
        o.innerText = p;
        pSel.appendChild(o);
    });
    pSel.value = geoMaster[appState.pref] ? appState.pref : '東京都';
    updateCities();
    updateAISettingsUI();
}

function saveSettings() {
    appState.pref = document.getElementById('pref-select').value;
    appState.city = document.getElementById('city-select').value;
    safeStorage.set('tp_pref_v800', appState.pref);
    safeStorage.set('tp_city_v800', appState.city);
    safeStorage.remove('tp_api_v800');
    appState.apiKey = '';
    fetchWeatherAndApplyTheme();
}

async function generateAIPlan() {
    if (!requireAILogin()) return;

    const task = document.getElementById('input-task').value.trim() || '総合学習・集中セッション';
    const st = document.getElementById('input-start').value || '16:00';
    const et = document.getElementById('input-end').value || '18:00';
    const app = document.getElementById('input-app').value;
    const focus = document.getElementById('input-focus').value;
    const notes = document.getElementById('input-notes').value.trim();

    let startMins = timeToMins(st);
    let endMins = timeToMins(et);
    if (endMins <= startMins) endMins += 1440;
    const totalDiffMins = Math.max(10, endMins - startMins);

    const btn = document.querySelector('#page-home .btn-primary');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI分析・戦略構築中...';
    btn.disabled = true;

    let plan = generateLocalScientificPlan(task, st, totalDiffMins, focus, app, notes);

    try {
        const prompt = `あなたはプロの学習戦略アドバイザーです。以下の条件でセッションを分割し、必ずJSON配列のみを出力してください。\nタスク:${task}\n時間:${totalDiffMins}分\n集中度:${focus}\n天候:${weatherCache.temp}度\nフォーマット:[{"type":"focus"|"break"|"prep", "duration_mins":数字, "title":"タイトル", "advice":"アドバイス"}]`;
        const data = await invokeTimePilotAI({ mode: 'plan', prompt });
        const jsonStr = data?.content?.match(/\[.*\]/s);
        if (jsonStr) {
            const parsed = JSON.parse(jsonStr[0]);
            let curMin = startMins;
            plan.sessions = parsed
                .filter(s => s && Number.isFinite(Number(s.duration_mins)) && Number(s.duration_mins) > 0)
                .map(s => {
                    const duration = Math.round(Number(s.duration_mins));
                    const stTime = minsToTime(curMin);
                    curMin += duration;
                    return { ...s, duration_mins: duration, start_time: stTime, end_time: minsToTime(curMin) };
                });
            if (!plan.sessions.length) throw new Error('Invalid AI plan');
        } else {
            throw new Error('Invalid AI response');
        }
    } catch (e) {
        console.error('Secure AI error:', e);
        alert(e?.message === 'LOGIN_REQUIRED' ? 'AI機能を利用するにはログインしてください。' : 'AIに接続できませんでした。SupabaseのAI設定を確認してください。');
        btn.innerHTML = '<i class="fa-solid fa-brain"></i> 自分だけのAI戦略プランを生成';
        btn.disabled = false;
        return;
    }

    currentGeneratedPlan = plan;
    renderRichAIPlan(plan);
    document.getElementById('home-ai-result').style.display = 'block';
    btn.innerHTML = '<i class="fa-solid fa-brain"></i> 自分だけのAI戦略プランを生成';
    btn.disabled = false;

    setTimeout(() => {
        const anchor = document.getElementById('ai-scroll-anchor');
        if (anchor) window.scrollTo({ top: anchor.offsetTop - 30, behavior: 'smooth' });
    }, 150);
}

async function sendChat() {
    if (!requireAILogin()) return;

    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const w = document.getElementById('chat-window');
    w.innerHTML += `<div style="align-self:flex-end; background:var(--color-study); color:white; padding:12px; border-radius:12px; font-size:14px; max-width:85%;">${escapeAIHtml(text)}</div>`;
    input.value = '';
    w.scrollTop = w.scrollHeight;

    let reply = '';
    try {
        const data = await invokeTimePilotAI({ mode: 'chat', text });
        reply = data?.reply || '';
        if (!reply) throw new Error('Empty AI response');
    } catch (e) {
        console.error('Secure AI chat error:', e);
        reply = 'AIに接続できませんでした。SupabaseのAI設定を確認してください。';
    }

    w.innerHTML += `<div style="align-self:flex-start; background:rgba(168,85,247,0.15); padding:12px; border-radius:12px; font-size:14px; max-width:85%; border: 1px solid rgba(168,85,247,0.3);">${escapeAIHtml(reply)}</div>`;
    w.scrollTop = w.scrollHeight;
}

// ========================================
// TimePilot v8.4.3 - Today's AI Suggestion
// ========================================
function tpTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function tpGetTodayEvents() {
    const calendar = typeof appState !== 'undefined' && appState.calendar ? appState.calendar : {};
    const events = calendar[tpTodayKey()];
    return Array.isArray(events) ? events : [];
}
function tpBuildTodayContext() {
    return tpGetTodayEvents().map((e, i) => ({ index:i, time:String(e?.time||''), title:String(e?.title||'予定'), completed:!!e?.checked }));
}
function tpEnsureTodayAIStyles() {
    if (document.getElementById('tp-today-ai-style')) return;
    const style = document.createElement('style');
    style.id = 'tp-today-ai-style';
    style.textContent = `.tp-today-ai{margin-bottom:20px}.tp-today-ai-head{display:flex;align-items:center;gap:12px}.tp-today-ai-icon{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:rgba(168,85,247,.15);color:var(--color-ai);font-size:18px;flex:none}.tp-today-ai-title{font-size:15px;font-weight:900}.tp-today-ai-sub{font-size:11px;color:var(--text-muted);margin-top:3px}.tp-today-ai-result{margin-top:15px;padding:14px;border-radius:14px;background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.18);display:none}.tp-today-ai-label{font-size:10px;color:var(--text-muted);font-weight:800;margin-bottom:5px}.tp-today-ai-main{font-size:18px;font-weight:900}.tp-today-ai-time{font-size:13px;font-family:monospace;font-weight:900;margin-top:3px}.tp-today-ai-reason{font-size:12px;color:var(--text-muted);line-height:1.55;margin-top:9px}.tp-today-ai-empty{margin-top:12px;padding:11px 12px;border-radius:10px;background:rgba(128,128,128,.08);font-size:11px;color:var(--text-muted);line-height:1.5}`;
    document.head.appendChild(style);
}
function tpEnsureTodayAICard() {
    const home = document.getElementById('page-home');
    if (!home) return null;
    let card = document.getElementById('tp-today-ai');
    if (card) return card;
    tpEnsureTodayAIStyles();
    card = document.createElement('div');
    card.id = 'tp-today-ai';
    card.className = 'glass-card tp-today-ai';
    card.innerHTML = `<div class="tp-today-ai-head"><div class="tp-today-ai-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div><div style="flex:1;"><div class="tp-today-ai-title">今日のAI提案</div><div class="tp-today-ai-sub">今ある予定から「次にやること」を最適化</div></div></div><button id="tp-today-ai-btn" class="btn-primary" type="button" style="margin-top:14px;padding:12px;font-size:13px;"><i class="fa-solid fa-brain"></i> 今日をAI分析</button><div id="tp-today-ai-empty" class="tp-today-ai-empty" style="display:none;"></div><div id="tp-today-ai-result" class="tp-today-ai-result"><div class="tp-today-ai-label">次にやること</div><div id="tp-today-ai-main" class="tp-today-ai-main"></div><div id="tp-today-ai-time" class="tp-today-ai-time"></div><div class="tp-today-ai-label" style="margin-top:12px;">AIの理由</div><div id="tp-today-ai-reason" class="tp-today-ai-reason"></div></div>`;
    const overview = document.getElementById('tp-v83-overview');
    if (overview) overview.insertAdjacentElement('afterend', card);
    else {
        const weather = document.getElementById('home-weather-text')?.closest('.glass-card');
        if (weather) weather.insertAdjacentElement('afterend', card);
        else home.prepend(card);
    }
    document.getElementById('tp-today-ai-btn').addEventListener('click', tpAnalyzeToday);
    return card;
}
function tpParseSuggestion(raw, context) {
    const text = String(raw||'').trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { const parsed=JSON.parse(match[0]); if(parsed&&(parsed.next_task||parsed.reason)) return parsed; } catch(_){} }
    const first=context.find(e=>!e.completed);
    return {next_task:first?.title||'今日の予定を確認',recommended_time:first?.time||'',reason:text||'まず未完了の予定から1つ選んで始めるのがおすすめです。'};
}
async function tpAnalyzeToday() {
    if (!requireAILogin()) return;
    const card=tpEnsureTodayAICard(), btn=document.getElementById('tp-today-ai-btn'), empty=document.getElementById('tp-today-ai-empty'), result=document.getElementById('tp-today-ai-result');
    if(!btn||!card)return;
    const context=tpBuildTodayContext();
    if(!context.length){result.style.display='none';empty.style.display='block';empty.textContent='今日は予定がありません。まずカレンダーから予定を1つ作成すると、AIが時間の使い方を提案できます。';return;}
    empty.style.display='none';result.style.display='none';btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> 今日の予定を分析中...';
    const now=new Date(), nowText=now.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',hour12:false});
    const prompt=`あなたはTimePilotの時間管理AIです。ユーザーの今日の予定を分析し、次にやるべきことを1つだけ提案してください。予定を尊重し、無理な詰め込みは避けてください。必ずJSONオブジェクトのみで返してください。形式: {"next_task":"タスク名","recommended_time":"HH:MM","reason":"理由を日本語で短く"}\n現在時刻:${nowText}\n今日の予定:${JSON.stringify(context)}`;
    try{
        const data=await invokeTimePilotAI({mode:'chat',text:prompt});
        const suggestion=tpParseSuggestion(data?.reply||data?.content||'',context);
        document.getElementById('tp-today-ai-main').textContent=suggestion.next_task||'次のタスク';
        document.getElementById('tp-today-ai-time').textContent=suggestion.recommended_time?`おすすめ開始 ${suggestion.recommended_time}`:'おすすめ開始時間を確認';
        document.getElementById('tp-today-ai-reason').textContent=suggestion.reason||'未完了の予定から優先度の高いものを進めましょう。';
        result.style.display='block';
    }catch(e){console.error('Today AI error:',e);empty.style.display='block';empty.textContent=e?.message==='LOGIN_REQUIRED'?'AI機能を利用するにはログインしてください。':'AIに接続できませんでした。少し時間を置いて再試行してください。';}
    finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-brain"></i> 今日をAI分析';}
}

// ========================================
// v8.4.4 - Notes field autofill protection
// Browser password managers sometimes insert the saved account email into
// unrelated fields. Make the notes field explicitly non-login and clear only
// an exact account-email autofill value.
// ========================================
function protectTimePilotNotesField() {
    const notes = document.getElementById('input-notes');
    if (!notes) return;

    notes.setAttribute('autocomplete', 'off');
    notes.setAttribute('autocorrect', 'off');
    notes.setAttribute('autocapitalize', 'sentences');
    notes.setAttribute('spellcheck', 'true');
    notes.setAttribute('name', 'timepilot-notes');
    notes.setAttribute('data-lpignore', 'true');
    notes.setAttribute('data-1p-ignore', 'true');

    const email = typeof currentUser !== 'undefined' && currentUser?.email
        ? String(currentUser.email).trim()
        : '';
    if (email && notes.value.trim() === email) notes.value = '';
}

window.addEventListener('DOMContentLoaded', () => {
    safeStorage.remove('tp_api_v800');
    updateAISettingsUI();
    protectTimePilotNotesField();
    setTimeout(() => {
        protectTimePilotNotesField();
        tpEnsureTodayAICard();
    }, 300);
    setTimeout(protectTimePilotNotesField, 1000);
});
