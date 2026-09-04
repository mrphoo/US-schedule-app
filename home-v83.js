/* TimePilot v8.3 - Home & Calendar UX improvements */
(() => {
  'use strict';

  const STYLE_ID = 'tp-v83-style';
  const CARD_ID = 'tp-v83-overview';

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
      .cal-cell { touch-action: manipulation; transition: transform .12s, background .2s, border-color .2s; }
      .cal-cell:active { transform:scale(.97); }
      @media (max-width:420px) {
        .tp-v83-stats { gap:6px; }
        .tp-v83-stat { padding:11px 6px; }
        .tp-v83-value { font-size:18px; }
      }
    `;
    document.head.appendChild(style);
  }

  function formatDate() {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'long', day: 'numeric', weekday: 'short'
    }).format(new Date());
  }

  function getTasks() {
    const area = document.getElementById('home-checklist-area');
    if (!area) return { total: 0, done: 0, next: null };
    const items = [...area.querySelectorAll('.mission-item')];
    const total = items.length;
    const done = items.filter(el => el.classList.contains('checked')).length;
    const next = items.find(el => !el.classList.contains('checked'));
    if (!next) return { total, done, next: null };
    const time = next.querySelector('.mission-time')?.textContent?.trim() || '';
    const text = next.querySelector('.mission-text')?.textContent?.trim() || '次のタスク';
    return { total, done, next: { time, text } };
  }

  function ensureOverview() {
    const home = document.getElementById('page-home');
    const weather = document.getElementById('home-weather-text')?.closest('.glass-card');
    if (!home || !weather) return null;

    let card = document.getElementById(CARD_ID);
    if (!card) {
      card = document.createElement('div');
      card.id = CARD_ID;
      card.className = 'glass-card tp-v83-overview';
      card.innerHTML = `
        <div class="tp-v83-overview-head">
          <div class="tp-v83-overview-title">今日の概要</div>
          <div class="tp-v83-overview-date"></div>
        </div>
        <div class="tp-v83-stats">
          <div class="tp-v83-stat"><div class="tp-v83-value" data-stat="total">0</div><div class="tp-v83-label">タスク</div></div>
          <div class="tp-v83-stat"><div class="tp-v83-value" data-stat="done">0</div><div class="tp-v83-label">完了</div></div>
          <div class="tp-v83-stat"><div class="tp-v83-value" data-stat="rate">0%</div><div class="tp-v83-label">達成率</div></div>
        </div>
        <div class="tp-v83-next"><span>次にやる：</span><b data-stat="next">タスクを確認</b></div>
      `;
      weather.insertAdjacentElement('afterend', card);
    }
    return card;
  }

  function updateOverview() {
    const card = ensureOverview();
    if (!card) return;
    const tasks = getTasks();
    const rate = tasks.total ? Math.round((tasks.done / tasks.total) * 100) : 0;
    card.querySelector('.tp-v83-overview-date').textContent = formatDate();
    card.querySelector('[data-stat="total"]').textContent = tasks.total;
    card.querySelector('[data-stat="done"]').textContent = tasks.done;
    card.querySelector('[data-stat="rate"]').textContent = `${rate}%`;
    card.querySelector('[data-stat="next"]').textContent = tasks.next
      ? `${tasks.next.time ? tasks.next.time + '　' : ''}${tasks.next.text}`
      : (tasks.total ? '今日のタスク完了' : 'まず予定を作成');
  }

  function addCalendarTodayButton() {
    const header = document.querySelector('.cal-header-nav');
    if (!header || header.querySelector('.tp-v83-today-btn')) return;
    const button = document.createElement('button');
    button.className = 'tp-v83-today-btn';
    button.type = 'button';
    button.textContent = '今日';
    button.addEventListener('click', () => {
      const today = document.querySelector('.cal-cell.today');
      if (today) today.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    header.appendChild(button);
  }

  function boot() {
    injectStyles();
    updateOverview();
    addCalendarTodayButton();

    const area = document.getElementById('home-checklist-area');
    if (area) {
      new MutationObserver(updateOverview).observe(area, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    setInterval(() => {
      updateOverview();
      addCalendarTodayButton();
    }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
