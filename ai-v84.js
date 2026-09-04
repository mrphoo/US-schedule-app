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
    // 旧バージョンのブラウザ保存APIキーを削除
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

window.addEventListener('DOMContentLoaded', () => {
    // index.htmlの既存UIを壊さず、APIキー入力欄だけ安全なステータス表示へ置換
    safeStorage.remove('tp_api_v800');
    updateAISettingsUI();
});
