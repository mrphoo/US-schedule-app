/* TimePilot v8.8 - AI Dynamic Rescheduler
 * Safe standalone module. AI proposes changes first; user explicitly applies them.
 * Adaptive recovery: propose -> review -> apply.
 */
(() => {
  'use strict';

  const CARD_ID = 'tp-v88-rescheduler';
  const STYLE_ID = 'tp-v88-rescheduler-style';
  let latestPlan = null;

  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const safeJson = (text) => {
    try { return JSON.parse(text); } catch (_) {}
    const m = String(text || '').match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch (_) { return null; }
  };
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  function getEvents() {
    const calendar = typeof appState !== 'undefined' && appState.calendar ? appState.calendar : {};
    return Array.isArray(calendar[todayKey()]) ? calendar[todayKey()] : [];
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .tp-v88-card{margin-bottom:20px}.tp-v88-head{display:flex;align-items:center;gap:12px}.tp-v88-icon{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:rgba(168,85,247,.15);color:var(--color-ai);font-size:18px;flex:none}.tp-v88-title{font-size:15px;font-weight:900}.tp-v88-sub{font-size:11px;color:var(--text-muted);margin-top:3px}.tp-v88-input{margin-top:14px;width:100%;min-height:72px;resize:vertical}.tp-v88-btn{width:100%;margin-top:10px;padding:13px;border:0;border-radius:12px;background:linear-gradient(135deg,var(--color-ai),var(--color-study));color:#fff;font-weight:800;cursor:pointer}.tp-v88-btn:disabled{opacity:.6;cursor:not-allowed}.tp-v88-apply{width:100%;margin-top:10px;padding:13px;border:0;border-radius:12px;background:var(--color-study);color:#fff;font-weight:800;cursor:pointer}.tp-v88-apply:disabled{opacity:.6;cursor:not-allowed}.tp-v88-result{margin-top:14px}.tp-v88-change{padding:11px 12px;border-radius:11px;background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.16);margin-top:8px;font-size:12px;line-height:1.55}.tp-v88-time{font-family:monospace;font-weight:900}.tp-v88-note{font-size:11px;color:var(--text-muted);margin-top:10px;line-height:1.5}.tp-v88-success{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.2)}`;
    document.head.appendChild(s);
  }

  function getCard() {
    const home = document.getElementById('page-home');
    if (!home) return null;
    let card = document.getElementById(CARD_ID);
    if (card) return card;
    ensureStyles();
    card = document.createElement('div');
    card.id = CARD_ID;
    card.className = 'glass-card tp-v88-card';
    card.innerHTML = `
      <div class="tp-v88-head"><div class="tp-v88-icon"><i class="fa-solid fa-arrows-rotate"></i></div><div><div class="tp-v88-title">AI予定リカバリー</div><div class="tp-v88-sub">予定の遅れや急な変更から、残りの予定を組み直す</div></div></div>
      <textarea id="tp-v88-input" class="tp-v88-input" placeholder="例：数学に予定より30分かかってしまった\n例：18:00から急な予定が入った"></textarea>
      <button id="tp-v88-btn" class="tp-v88-btn" type="button"><i class="fa-solid fa-wand-magic-sparkles"></i> 残りの予定をAIで組み直す</button>
      <div id="tp-v88-result" class="tp-v88-result" style="display:none"></div>
      <div class="tp-v88-note">AIはまず変更案を提示します。確認して「この案を適用」を押すまで、元の予定は変更しません。</div>`;
    const anchor = document.getElementById('tp-v86-reflection') || document.getElementById('tp-v85-execution') || document.getElementById('tp-v83-overview');
    if (anchor) anchor.insertAdjacentElement('afterend', card); else home.prepend(card);
    card.querySelector('#tp-v88-btn').addEventListener('click', reschedule);
    return card;
  }

  function buildContext() {
    const now = new Date();
    const current = now.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',hour12:false});
    const events = getEvents().map((e,i) => ({index:i,time:String(e?.time||''),title:String(e?.title||'予定'),completed:!!e?.checked,color:e?.color||''}));
    return { current, events };
  }

  function renderPlan(parsed) {
    const result = document.getElementById('tp-v88-result');
    if (!result) return;
    const changes = Array.isArray(parsed.changes) ? parsed.changes.slice(0,12) : [];
    const cards = changes.map(c => {
      const action = ({keep:'維持',move:'移動',shorten:'短縮',postpone:'延期'})[c.action] || '変更';
      return `<div class="tp-v88-change"><div><b>${escapeHtml(action)}</b>　<span class="tp-v88-time">${escapeHtml(c.new_time||'時間維持')}</span>　${escapeHtml(c.new_title||'')}</div><div>${escapeHtml(c.reason||'')}</div></div>`;
    }).join('');
    result.innerHTML = `<div class="tp-v88-change"><b>再計画方針</b><br>${escapeHtml(parsed.summary||'残りの予定を現実的に再調整しました。')}</div>${cards}<div class="tp-v88-change"><b>守る条件</b><br>${escapeHtml(parsed.priority_note||'無理のない計画を優先')}</div><button id="tp-v88-apply" class="tp-v88-apply" type="button"><i class="fa-solid fa-check"></i> この案を適用</button>`;
    result.style.display='block';
    document.getElementById('tp-v88-apply').addEventListener('click', applyPlan);
  }

  function applyPlan() {
    if (!latestPlan || !Array.isArray(latestPlan.changes)) return;
    const key = todayKey();
    const calendar = typeof appState !== 'undefined' && appState.calendar ? appState.calendar : {};
    const events = Array.isArray(calendar[key]) ? calendar[key] : [];
    let applied = 0;
    latestPlan.changes.forEach(c => {
      const index = Number(c.index) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= events.length) return;
      const event = events[index];
      if (!event || event.checked) return;
      const action = String(c.action || '').toLowerCase();
      if (action === 'move' || action === 'shorten' || action === 'keep') {
        if (c.new_time && /^\d{1,2}:\d{2}$/.test(String(c.new_time))) event.time = String(c.new_time).padStart(5,'0');
        if (c.new_title) event.title = String(c.new_title);
        if (action === 'shorten' && c.minutes) event.title = `${event.title}（${Math.max(1,Math.round(Number(c.minutes)))}分）`;
        applied++;
      } else if (action === 'postpone') {
        event.time = '';
        if (!String(event.title).endsWith('（延期）')) event.title = `${event.title}（延期）`;
        applied++;
      }
    });
    calendar[key] = events;
    if (typeof safeStorage !== 'undefined' && safeStorage?.set) safeStorage.set('tp_cal_v800', JSON.stringify(calendar));
    else localStorage.setItem('tp_cal_v800', JSON.stringify(calendar));
    if (typeof renderCalendar === 'function') { try { renderCalendar(); } catch (_) {} }
    if (typeof renderHome === 'function') { try { renderHome(); } catch (_) {} }
    const result = document.getElementById('tp-v88-result');
    if (result) result.innerHTML = `<div class="tp-v88-change tp-v88-success"><b>再計画を適用しました</b><br>${applied}件の予定を更新しました。</div>`;
    latestPlan = null;
  }

  async function reschedule() {
    const card = getCard(); if (!card) return;
    const input = card.querySelector('#tp-v88-input');
    const btn = card.querySelector('#tp-v88-btn');
    const result = card.querySelector('#tp-v88-result');
    const situation = input.value.trim();
    if (!situation) { input.focus(); return; }
    if (typeof requireAILogin === 'function' && !requireAILogin()) return;
    if (typeof invokeTimePilotAI !== 'function') { result.style.display='block'; result.textContent='AI機能を読み込めませんでした。'; return; }

    const ctx = buildContext();
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 残りの予定を再計算中...';
    result.style.display='block';
    result.innerHTML='<div class="tp-v88-change">現在の予定と変更内容をAIが分析しています。</div>';

    const eventText = ctx.events.length ? ctx.events.map(e => `${e.index+1}. ${e.time||'時間未設定'} / ${e.title} / ${e.completed?'完了':'未完了'}`).join('\n') : '今日の予定なし';
    const prompt = `あなたはTimePilotの動的スケジューリングAIです。予定が崩れたとき、残りの予定を現実的に再設計してください。単純に全予定を一律にずらすのではなく、重要度・時間固定の予定・未完了タスク・現在時刻を考慮して、短縮、移動、延期、維持を判断してください。睡眠や休息を削って帳尻を合わせないでください。まだ変更を確定せず、変更案だけをJSONで返してください。changesのindexは元の予定番号を必ず使用してください。\n現在時刻:${ctx.current}\n予定変更の状況:${situation}\n今日の予定:\n${eventText}\nJSON形式:{"summary":"全体方針を1〜2文","changes":[{"index":1,"action":"keep|move|shorten|postpone","new_time":"HH:MM","new_title":"タイトル","minutes":30,"reason":"理由"}],"priority_note":"最優先する予定や守る条件"}`;
    try {
      const data = await invokeTimePilotAI({mode:'chat', text:prompt});
      const parsed = safeJson(data?.reply || data?.content || '');
      if (!parsed || !Array.isArray(parsed.changes)) throw new Error('Invalid AI response');
      latestPlan = parsed;
      renderPlan(parsed);
    } catch (e) {
      console.error('TimePilot v8.8 reschedule error:', e);
      result.innerHTML = `<div class="tp-v88-change">${escapeHtml(e?.message==='LOGIN_REQUIRED'?'AI機能を利用するにはログインしてください。':'AIによる再計画に失敗しました。もう一度試してください。')}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> 残りの予定をAIで組み直す';
    }
  }

  function boot(){ getCard(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
