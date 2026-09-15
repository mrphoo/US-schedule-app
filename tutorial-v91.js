/* TimePilot v9.1 — interactive onboarding
 * The app remains touchable. The tutorial only highlights the control being explained.
 */
(function () {
  'use strict';

  const DONE_KEY = 'tp_tutorial_v910_completed';
  const VERSION_KEY = 'tp_tutorial_v910_version';
  const VERSION = '4';
  let stepIndex = 0;
  let coach = null;
  let target = null;
  let timer = null;
  let bound = false;
  let waitingForAction = false;

  const steps = [
    {
      title: 'まずは予定をAIに見せよう',
      text: 'Homeで今日やることと時間を入力できます。まずはこのボタンを押して、AIのプラン作成を体験します。',
      target: () => document.querySelector('#page-home .btn-primary'),
      click: true,
      allowNext: true
    },
    {
      title: '予定はカレンダーで管理',
      text: '予定の追加・確認・変更はここから。実際にカレンダーを開いてみましょう。',
      target: () => findNav('Calendar', 'カレンダー'),
      click: true
    },
    {
      title: '今日の日付をタップ',
      text: 'カレンダーでは日付をタップすると、その日の予定を開けます。今日は「15」の枠を押してみましょう。',
      target: () => document.querySelector('#calendar-grid .cal-cell.today') || findCalendarToday(),
      click: true
    },
    {
      title: '予定を入力してみよう',
      text: '下の入力欄に予定名を入れられます。実際にタップして入力してみてください。',
      target: () => document.getElementById('event-title'),
      click: true,
      allowNext: true
    },
    {
      title: '時間を決める',
      text: '左側の時間欄で予定の開始時刻を決めます。普段の予定と同じように操作できます。',
      target: () => document.getElementById('event-time'),
      click: true,
      allowNext: true
    },
    {
      title: '予定を登録',
      text: '入力できたら「予定を登録」を押してください。登録した予定はカレンダーとHomeに反映されます。',
      target: () => findByText(['予定を登録']),
      click: true
    },
    {
      title: 'これで基本操作はOK',
      text: '予定を作る → 実行する → 記録する → AIが学ぶ。この流れで使うほど、あなた向けの提案に近づいていきます。',
      target: () => findNav('Home', 'ホーム'),
      click: false,
      allowNext: true
    }
  ];

  function safeGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  }

  function findByText(words) {
    const selectors = 'button,a,[role="button"],input,select,textarea';
    const els = [...document.querySelectorAll(selectors)].filter(visible);
    for (const word of words) {
      const exact = els.find(el => {
        const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        return text === word;
      });
      if (exact) return exact;
      const partial = els.find(el => {
        const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        return text.includes(word);
      });
      if (partial) return partial;
    }
    return null;
  }

  function findNav(...words) {
    const els = [...document.querySelectorAll('.nav-item')].filter(visible);
    return els.find(el => words.some(w => (el.innerText || '').includes(w))) || null;
  }

  function findCalendarToday() {
    const cells = [...document.querySelectorAll('#calendar-grid .cal-cell')].filter(visible);
    return cells.find(el => el.classList.contains('today')) || null;
  }

  function injectStyles() {
    if (document.getElementById('tp91-interactive-style')) return;
    const style = document.createElement('style');
    style.id = 'tp91-interactive-style';
    style.textContent = `
      #tp91-coach{position:fixed!important;left:50%!important;top:72px!important;transform:translateX(-50%)!important;z-index:2147483646!important;width:min(430px,calc(100vw - 24px))!important;box-sizing:border-box!important;background:#fff!important;color:#111827!important;border:2px solid #7c3aed!important;border-radius:18px!important;padding:16px 18px!important;box-shadow:0 12px 40px rgba(0,0,0,.28)!important;font-family:inherit!important;pointer-events:auto!important;}
      #tp91-coach .tp91-count{font-size:11px;font-weight:900;color:#6b7280;margin-bottom:5px}
      #tp91-coach h2{font-size:18px!important;line-height:1.35!important;margin:0 0 7px!important;font-weight:900!important;color:#111827!important}
      #tp91-coach p{font-size:13px!important;line-height:1.6!important;margin:0!important;color:#374151!important}
      #tp91-coach .tp91-hint{margin-top:9px;font-size:12px;font-weight:900;color:#7c3aed;min-height:18px}
      #tp91-coach .tp91-actions{display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:8px}
      #tp91-coach button{border:0!important;cursor:pointer!important;font-family:inherit!important;font-weight:900!important}
      #tp91-skip{background:transparent!important;color:#6b7280!important;padding:8px!important}
      #tp91-next{background:#111827!important;color:#fff!important;border-radius:11px!important;padding:10px 17px!important;min-width:88px!important}
      .tp91-target{position:relative!important;z-index:2147483645!important;outline:4px solid #8b5cf6!important;outline-offset:4px!important;box-shadow:0 0 0 5px rgba(139,92,246,.18),0 0 24px rgba(139,92,246,.75)!important;border-radius:12px!important;animation:tp91pulse 1s infinite!important;}
      @keyframes tp91pulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.16)}}
      #tp91-help{position:fixed!important;right:14px!important;bottom:14px!important;z-index:2147483640!important;border:0!important;border-radius:12px!important;padding:9px 12px!important;background:#111827!important;color:#fff!important;font-size:12px!important;font-weight:900!important;cursor:pointer!important;box-shadow:0 6px 20px rgba(0,0,0,.2)!important}
      @media(max-width:600px){#tp91-coach{top:58px!important;padding:14px!important}#tp91-coach h2{font-size:16px!important}#tp91-coach p{font-size:12px!important}}
    `;
    document.head.appendChild(style);
  }

  function clearTarget() {
    if (target) target.classList.remove('tp91-target');
    target = null;
  }

  function resolveTarget() {
    clearTarget();
    const step = steps[stepIndex];
    target = step.target ? step.target() : null;
    waitingForAction = !!(target && step.click);
    if (target) {
      target.classList.add('tp91-target');
      if (step.click && !['INPUT','SELECT','TEXTAREA'].includes(target.tagName)) {
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
    coach.querySelector('.tp91-hint').textContent = target && step.click
      ? '紫色で光っている場所を実際に操作してください'
      : step.allowNext ? '操作を試したら「次へ」で進めます' : '';
    coach.querySelector('#tp91-next').textContent = stepIndex === steps.length - 1 ? '始める' : '次へ';
    coach.querySelector('#tp91-next').style.display = (waitingForAction && !step.allowNext) ? 'none' : 'block';
  }

  function next() {
    const step = steps[stepIndex];
    if (waitingForAction && !step.allowNext) return;
    if (stepIndex >= steps.length - 1) { close(true); return; }
    stepIndex += 1;
    resolveTarget();
  }

  function close(done) {
    if (done) { safeSet(DONE_KEY, '1'); safeSet(VERSION_KEY, VERSION); }
    clearTarget();
    if (timer) clearInterval(timer);
    timer = null;
    if (bound) {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('input', onInput, true);
      bound = false;
    }
    if (coach) coach.remove();
    coach = null;
  }

  function onClick(e) {
    if (!coach || !target) return;
    const step = steps[stepIndex];
    if (!step.click) return;
    const el = e.target instanceof Element ? e.target : null;
    if (!el || !(el === target || target.contains(el))) return;
    setTimeout(() => {
      if (!coach) return;
      waitingForAction = false;
      next();
    }, 250);
  }

  function onInput(e) {
    if (!coach || !target) return;
    if (e.target !== target) return;
    if (steps[stepIndex].allowNext) updateCoach();
  }

  function open() {
    if (coach) return;
    injectStyles();
    stepIndex = 0;
    coach = document.createElement('div');
    coach.id = 'tp91-coach';
    coach.innerHTML = `<div class="tp91-count"></div><h2></h2><p></p><div class="tp91-hint"></div><div class="tp91-actions"><button id="tp91-skip" type="button">スキップ</button><button id="tp91-next" type="button">次へ</button></div>`;
    document.body.appendChild(coach);
    coach.querySelector('#tp91-next').addEventListener('click', next);
    coach.querySelector('#tp91-skip').addEventListener('click', () => close(true));
    document.addEventListener('click', onClick, true);
    document.addEventListener('input', onInput, true);
    bound = true;
    resolveTarget();
    timer = setInterval(() => { if (coach) resolveTarget(); }, 1000);
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
