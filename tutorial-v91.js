/* TimePilot v9.1 — Real UI coach tutorial
 * Shows a visible coach card and highlights the actual controls in the app.
 */
(function () {
  'use strict';

  const DONE_KEY = 'tp_tutorial_v910_completed';
  const VERSION_KEY = 'tp_tutorial_v910_version';
  const VERSION = '3';
  let stepIndex = 0;
  let overlay = null;
  let coach = null;
  let target = null;
  let timer = null;

  const steps = [
    {
      title: 'まずは今日の予定をAIに見せよう',
      text: 'TimePilotの中心機能です。今日の予定を入力したら、AIが「次に何をするか」を提案します。',
      target: () => findByText(['自分だけのAI戦略プランを生成', '今日をAI分析', 'AIで予定']),
      click: true
    },
    {
      title: '予定はカレンダーから管理',
      text: '予定の追加・確認・変更はカレンダーから行えます。実際のカレンダーを開いてみましょう。',
      target: () => findByText(['Calendar', 'カレンダー']),
      click: true
    },
    {
      title: '予定を1つ登録してみよう',
      text: 'ここが予定管理の入口です。予定を追加して、時間と内容を登録できます。',
      target: () => findByText(['予定を追加', '予定追加', '予定を登録', '追加']),
      click: true,
      optional: true
    },
    {
      title: '予定が崩れてもAIが組み直す',
      text: '予定より時間がかかった、急な予定が入った。そんなときは「AI予定リカバリー」で残りの予定を再設計できます。',
      target: () => document.getElementById('tp-v88-rescheduler') || findByText(['AI予定リカバリー', '残りの予定をAIで組み直す']),
      click: false,
      optional: true
    },
    {
      title: '実際の行動を記録する',
      text: '予定した時間と実際の行動を記録すると、TimePilotがあなたの行動パターンを分析できるようになります。',
      target: () => document.getElementById('tp-v85-execution') || findByText(['実行記録', '行動記録', '実績']),
      click: false,
      optional: true
    },
    {
      title: '使うほど自分向けになる',
      text: '行動データが増えるほど、集中しやすい時間帯や作業時間などを分析し、次のAI提案に活かせます。',
      target: () => document.getElementById('tp-v88-personal') || document.getElementById('tp-v89-learning') || findByText(['パーソナル分析', '個人分析', '学習', '分析']),
      click: false,
      optional: true
    },
    {
      title: '準備完了',
      text: '基本の流れは「予定を作る → 実行する → 記録する → AIが学ぶ」です。まずは普段どおり使ってみてください。',
      target: null,
      click: false
    }
  ];

  function safeGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }

  function findByText(words) {
    const selectors = 'button,a,[role="button"],input,select,textarea,.glass-card,.section-title,.nav-item,.bottom-nav-item';
    const els = [...document.querySelectorAll(selectors)].filter(el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    });
    let best = null;
    let score = -1;
    for (const el of els) {
      const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 140) continue;
      words.forEach((word, i) => {
        if (!text.includes(word)) return;
        let s = 100 - i * 10;
        if (el.matches('button,a,[role="button"],.nav-item,.bottom-nav-item')) s += 45;
        if (text === word) s += 30;
        if (s > score) { score = s; best = el; }
      });
    }
    return best;
  }

  function injectStyles() {
    if (document.getElementById('tp91-coach-style')) return;
    const style = document.createElement('style');
    style.id = 'tp91-coach-style';
    style.textContent = `
      #tp91-overlay{position:fixed!important;inset:0!important;z-index:2147483000!important;background:rgba(15,23,42,.62)!important;pointer-events:none!important;}
      #tp91-coach{position:fixed!important;z-index:2147483646!important;display:block!important;visibility:visible!important;opacity:1!important;width:min(400px,calc(100vw - 28px))!important;box-sizing:border-box!important;background:#fff!important;color:#111827!important;border:2px solid #7c3aed!important;border-radius:18px!important;padding:18px!important;box-shadow:0 18px 55px rgba(0,0,0,.4)!important;font-family:inherit!important;pointer-events:auto!important;}
      #tp91-coach .tp91-count{font-size:11px;font-weight:900;color:#6b7280;margin-bottom:5px}
      #tp91-coach h2{font-size:18px!important;line-height:1.35!important;margin:0 0 8px!important;font-weight:900!important;color:#111827!important}
      #tp91-coach p{font-size:13px!important;line-height:1.65!important;margin:0!important;color:#374151!important}
      #tp91-coach .tp91-hint{margin-top:11px;font-size:12px;font-weight:900;color:#7c3aed}
      #tp91-coach .tp91-actions{display:flex;justify-content:space-between;align-items:center;margin-top:14px;gap:8px}
      #tp91-coach button{border:0!important;cursor:pointer!important;font-family:inherit!important;font-weight:900!important}
      #tp91-skip{background:transparent!important;color:#6b7280!important;padding:8px!important}
      #tp91-next{background:#111827!important;color:#fff!important;border-radius:11px!important;padding:10px 17px!important;min-width:88px!important}
      .tp91-target{position:relative!important;z-index:2147483645!important;outline:4px solid #8b5cf6!important;outline-offset:3px!important;box-shadow:0 0 0 9999px rgba(15,23,42,.62),0 0 28px rgba(139,92,246,.9)!important;border-radius:12px!important;animation:tp91pulse 1.1s infinite!important;}
      @keyframes tp91pulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.22)}}
      #tp91-help{position:fixed!important;right:14px!important;bottom:14px!important;z-index:1000!important;border:0!important;border-radius:12px!important;padding:9px 12px!important;background:#111827!important;color:#fff!important;font-size:12px!important;font-weight:900!important;cursor:pointer!important;box-shadow:0 6px 20px rgba(0,0,0,.2)!important}
    `;
    document.head.appendChild(style);
  }

  function clearTarget() {
    if (target) target.classList.remove('tp91-target');
    target = null;
  }

  function placeCoach() {
    if (!coach) return;
    const width = Math.min(400, window.innerWidth - 28);
    coach.style.width = width + 'px';
    if (!target) {
      coach.style.left = ((window.innerWidth - width) / 2) + 'px';
      coach.style.top = Math.max(25, (window.innerHeight - coach.offsetHeight) / 2) + 'px';
      return;
    }
    const r = target.getBoundingClientRect();
    const h = coach.offsetHeight;
    const gap = 16;
    let left = Math.max(14, Math.min(window.innerWidth - width - 14, r.left + r.width / 2 - width / 2));
    let top = r.bottom + gap;
    if (top + h > window.innerHeight - 14) top = r.top - h - gap;
    if (top < 14) top = Math.max(14, (window.innerHeight - h) / 2);
    coach.style.left = left + 'px';
    coach.style.top = top + 'px';
  }

  function resolveTarget() {
    clearTarget();
    const step = steps[stepIndex];
    target = step.target ? step.target() : null;
    if (target) {
      target.classList.add('tp91-target');
      if (step.click) {
        target.scrollIntoView({ behavior:'smooth', block:'center', inline:'nearest' });
      }
    }
    updateCoach();
  }

  function updateCoach() {
    if (!coach) return;
    const step = steps[stepIndex];
    coach.querySelector('.tp91-count').textContent = `${stepIndex + 1} / ${steps.length}`;
    coach.querySelector('h2').textContent = step.title;
    coach.querySelector('p').textContent = step.text;
    coach.querySelector('.tp91-hint').textContent = target && step.click ? '光っている場所を実際に押してください' : step.optional ? 'この機能が表示されない場合は「次へ」で進めます' : '';
    coach.querySelector('#tp91-next').textContent = stepIndex === steps.length - 1 ? '始める' : '次へ';
    placeCoach();
  }

  function next() {
    if (stepIndex >= steps.length - 1) { close(true); return; }
    stepIndex += 1;
    updateCoach();
    setTimeout(resolveTarget, 100);
  }

  function close(done) {
    if (done) { safeSet(DONE_KEY, '1'); safeSet(VERSION_KEY, VERSION); }
    clearTarget();
    if (timer) clearInterval(timer);
    timer = null;
    if (overlay) overlay.remove();
    if (coach) coach.remove();
    overlay = null;
    coach = null;
  }

  function onClick(e) {
    if (!target) return;
    const clicked = e.target instanceof Element ? e.target.closest('button,a,[role="button"],input,select,textarea') : null;
    if (!clicked || !(clicked === target || target.contains(clicked))) return;
    if (!steps[stepIndex].click) return;
    setTimeout(() => { if (coach) next(); }, 500);
  }

  function open() {
    if (coach) return;
    injectStyles();
    stepIndex = 0;
    overlay = document.createElement('div');
    overlay.id = 'tp91-overlay';
    coach = document.createElement('div');
    coach.id = 'tp91-coach';
    coach.innerHTML = `<div class="tp91-count"></div><h2></h2><p></p><div class="tp91-hint"></div><div class="tp91-actions"><button id="tp91-skip" type="button">スキップ</button><button id="tp91-next" type="button">次へ</button></div>`;
    document.body.appendChild(overlay);
    document.body.appendChild(coach);
    coach.querySelector('#tp91-next').addEventListener('click', next);
    coach.querySelector('#tp91-skip').addEventListener('click', () => close(true));
    document.addEventListener('click', onClick, true);
    window.addEventListener('resize', placeCoach);
    window.addEventListener('scroll', placeCoach, true);
    updateCoach();
    resolveTarget();
    timer = setInterval(() => { if (coach) { resolveTarget(); } }, 1200);
  }

  function addHelp() {
    if (document.getElementById('tp91-help')) return;
    const b = document.createElement('button');
    b.id = 'tp91-help';
    b.type = 'button';
    b.textContent = '使い方を見る';
    b.addEventListener('click', open);
    document.body.appendChild(b);
  }

  function init() {
    addHelp();
    if (safeGet(DONE_KEY) !== '1' || safeGet(VERSION_KEY) !== VERSION) setTimeout(open, 700);
  }

  window.timePilotTutorial = { open };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
