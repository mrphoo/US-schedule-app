/* TimePilot v8.9 - Adaptive Learning Metrics
 * Additive module: turns execution history into a small, explainable learning model.
 */
(() => {
  'use strict';

  const KEY = 'tp_adaptive_profile_v890';
  const CARD_ID = 'tp-v89-learning';
  const STYLE_ID = 'tp-v89-style';

  const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function records() {
    const r = load('tp_execution_v850', []);
    return Array.isArray(r) ? r.slice(-100) : [];
  }

  function buildProfile() {
    const rs = records(), tasks = {}, hours = {}, errors = [];
    rs.forEach(r => {
      const raw = String(r.title || '').trim();
      const plannedMatch = raw.match(/（(\d+)分）/);
      const title = raw.replace(/\s*（\d+分）/g, '').replace(/\s*（延期）/g, '').trim().slice(0, 30);
      const actual = Number(r.minutes) || 0;
      if (title && actual > 0) {
        const t = tasks[title] || {count:0,total:0,values:[]};
        t.count++; t.total += actual; t.values.push(actual); tasks[title] = t;
        if (plannedMatch) errors.push({planned:Number(plannedMatch[1]), actual});
      }
      const h = String(r.time || '').slice(0,2);
      if (/^\d\d$/.test(h) && actual > 0) hours[h] = (hours[h] || 0) + actual;
    });

    const task_profiles = Object.entries(tasks).map(([title,t]) => {
      const avg = t.total / t.count;
      const variance = t.values.reduce((s,v) => s + Math.pow(v-avg,2), 0) / t.count;
      return {title, count:t.count, avg_minutes:Math.round(avg), consistency:Math.max(0,Math.round(100-(Math.sqrt(variance)/Math.max(avg,1))*100))};
    }).sort((a,b)=>b.count-a.count || b.avg_minutes-a.avg_minutes).slice(0,8);

    const best = Object.entries(hours).sort((a,b)=>b[1]-a[1])[0];
    const avgError = errors.length ? Math.round(errors.reduce((s,e)=>s+Math.abs(e.actual-e.planned),0)/errors.length) : null;
    const accuracy = errors.length ? Math.max(0,Math.round(100-(avgError/Math.max(1,errors.reduce((s,e)=>s+e.planned,0)/errors.length))*100)) : null;

    return {
      sample_size: rs.length,
      task_profiles,
      best_hour: best ? `${best[0]}時台` : null,
      prediction: {samples:errors.length, avg_error_minutes:avgError, accuracy_percent:accuracy},
      updated_at:new Date().toISOString()
    };
  }

  function render() {
    const home=document.getElementById('page-home'); if(!home) return;
    let card=document.getElementById(CARD_ID);
    if(!card){
      card=document.createElement('div'); card.id=CARD_ID; card.className='glass-card';
      const anchor=document.getElementById('tp-v88-personal') || document.getElementById('tp-v88-rescheduler') || document.getElementById('tp-v86-reflection');
      if(anchor) anchor.insertAdjacentElement('afterend',card); else home.appendChild(card);
    }
    const p=buildProfile(); save(KEY,p); window.timePilotAdaptiveContext=p;
    if(p.sample_size===0){ card.style.display='none'; return; }
    card.style.display='block';
    const top=p.task_profiles[0];
    card.innerHTML=`<div class="tp89-head"><div class="tp89-icon"><i class="fa-solid fa-chart-line"></i></div><div><div class="tp89-title">AI学習データ</div><div class="tp89-sub">実際の行動から、次の計画を調整するためのデータ</div></div></div><div class="tp89-grid"><div><b>${p.sample_size}</b><span>実行記録</span></div><div><b>${esc(p.best_hour||'学習中')}</b><span>実行が多い時間帯</span></div><div><b>${top?esc(top.avg_minutes)+'分':'—'}</b><span>${top?'「'+esc(top.title)+'」平均':'タスク平均'}</span></div><div><b>${p.prediction.accuracy_percent==null?'—':p.prediction.accuracy_percent+'%'}</b><span>時間予測精度</span></div></div>${p.prediction.samples?`<div class="tp89-note">予測との差は平均 ${p.prediction.avg_error_minutes}分。次回はこの誤差を考慮して計画します。</div>`:'<div class="tp89-note">「○○（30分）」のように予定時間を含めて実行すると、AIの時間予測も学習できます。</div>'}`;
  }

  function style(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`#${CARD_ID}{margin-bottom:20px}.tp89-head{display:flex;align-items:center;gap:11px;margin-bottom:12px}.tp89-icon{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(59,130,246,.12);color:var(--color-study);font-size:17px}.tp89-title{font-size:15px;font-weight:900;line-height:1.35;font-family:inherit}.tp89-sub{font-size:10px;color:var(--text-muted);margin-top:3px}.tp89-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tp89-grid>div{padding:10px 11px;border:1px solid var(--glass-border);border-radius:11px;background:rgba(255,255,255,.03)}.tp89-grid b{display:block;font-size:15px;line-height:1.3}.tp89-grid span{display:block;font-size:9px;color:var(--text-muted);margin-top:3px}.tp89-note{font-size:10px;color:var(--text-muted);line-height:1.5;margin-top:9px}`;document.head.appendChild(s);
  }

  function boot(){style();render();setInterval(render,3000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
