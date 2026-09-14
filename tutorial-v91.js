/* TimePilot v9.1 — Interactive first-use tutorial
 * Guides the user on the real app UI instead of showing a separate manual.
 * Additive module: does not modify existing app logic.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'tp_tutorial_v910_completed';
    const VERSION_KEY = 'tp_tutorial_v910_version';
    const VERSION = '2';

    const steps = [
        {
            title: 'TimePilotへようこそ',
            text: 'このチュートリアルでは、実際の画面を使ってTimePilotの基本操作を体験します。まずは予定を1つ登録してみましょう。',
            target: () => findTarget(['予定を追加', '予定追加', '予定を登録', '予定を作成', '追加']),
            action: 'click'
        },
        {
            title: '① 予定を登録する',
            text: 'ここから予定を登録できます。時間と内容を入力して保存してみましょう。入力画面が開いたら、実際に予定を1つ作ってみてください。',
            target: () => findTarget(['保存', '登録', '予定を保存', '追加']),
            action: 'click',
            optional: true
        },
        {
            title: '② AIに予定を作ってもらう',
            text: '予定を自分で組むだけでなく、AIにその日のスケジュールを考えてもらえます。AI機能はログインすると利用できます。',
            target: () => findTarget(['AI予定', 'AIプラン', 'AIで予定', 'AIスケジュール', 'AIに予定']),
            action: 'click',
            optional: true
        },
        {
            title: '③ 予定が崩れても大丈夫',
            text: '急な予定や作業時間のズレが起きたら、AI予定リカバリー。残りの予定を状況に合わせて組み直せます。',
            target: () => findTarget(['AI予定リカバリー', '予定リカバリー', 'リカバリー', '予定を組み直す']),
            action: 'click',
            optional: true
        },
        {
            title: '④ 実際の行動を記録する',
            text: '予定を実行したら、完了や実際の時間を記録します。このデータが、あなた専用のAIを作る材料になります。',
            target: () => findTarget(['実行記録', '行動記録', '記録する', '実績', '完了']),
            action: 'click',
            optional: true
        },
        {
            title: '⑤ 使うほど自分向けに',
            text: '実際の行動データがたまるほど、集中しやすい時間帯や作業時間などを分析できます。AIはその情報を次の提案に活用します。',
            target: () => findTarget(['パーソナル分析', '個人分析', '学習', 'AI分析', '分析']),
            action: 'click',
            optional: true
        },
        {
            title: '準備完了',
            text: '基本の流れは、予定を作る → 実行する → 記録する → AIが学ぶ、です。まずは今日の予定を1つ登録して使ってみましょう。',
            target: null
        }
    ];

    let index = 0;
    let overlay = null;
    let tooltip = null;
    let currentTarget = null;
    let refreshTimer = null;

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }

    function safeSet(key, value) {
        try { localStorage.setItem(key, value); } catch (_) {}
    }

    function injectStyles() {
        if (document.getElementById('tp91-tutorial-style')) return;
        const style = document.createElement('style');
        style.id = 'tp91-tutorial-style';
        style.textContent = `
            #tp91-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(2,6,23,.54);pointer-events:none}
            #tp91-tooltip{position:fixed;z-index:2147483002;width:min(390px,calc(100vw - 28px));background:var(--bg-base,#0f172a);color:var(--text-main,#f8fafc);border:1px solid var(--glass-border,rgba(255,255,255,.14));border-radius:18px;padding:18px;box-shadow:0 18px 60px rgba(0,0,0,.45);font-family:inherit;pointer-events:auto}
            #tp91-tooltip .tp91-count{font-size:11px;font-weight:900;color:var(--text-muted,#94a3b8);margin-bottom:5px}
            #tp91-tooltip h2{font-size:18px;line-height:1.35;margin:0 0 8px;font-weight:900}
            #tp91-tooltip p{font-size:13px;line-height:1.65;margin:0;color:var(--text-muted,#94a3b8)}
            #tp91-tooltip .tp91-hint{margin-top:10px;font-size:12px;font-weight:800;color:#a855f7}
            #tp91-tooltip .tp91-actions{display:flex;justify-content:space-between;align-items:center;margin-top:14px;gap:8px}
            #tp91-tooltip button{border:0;cursor:pointer;font-family:inherit;font-weight:800}
            #tp91-skip{background:transparent;color:var(--text-muted,#94a3b8);padding:8px}
            #tp91-next{background:#fff;color:#0f172a;border-radius:10px;padding:10px 16px;min-width:86px}
            body.light-theme #tp91-next{background:#0f172a;color:#fff}
            .tp91-spotlight{position:relative!important;z-index:2147483001!important;box-shadow:0 0 0 4px rgba(168,85,247,.95),0 0 0 9999px rgba(2,6,23,.54),0 0 28px rgba(168,85,247,.55)!important;border-radius:12px!important}
            .tp91-pulse{animation:tp91pulse 1.2s infinite ease-in-out}
            @keyframes tp91pulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.2)}}
            #tp91-help{position:fixed;right:14px;bottom:14px;z-index:1000;border:0;border-radius:12px;padding:9px 12px;background:rgba(15,23,42,.92);color:#fff;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.18)}
            @media(max-width:520px){#tp91-tooltip{padding:15px;border-radius:16px}#tp91-tooltip h2{font-size:17px}}
        `;
        document.head.appendChild(style);
    }

    function visible(el) {
        if (!el || el === tooltip || el === overlay) return false;
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    }

    function findTarget(words) {
        const candidates = Array.from(document.querySelectorAll('button,a,[role="button"],label,.glass-card,.section-title'))
            .filter(visible);
        let best = null;
        let bestScore = -1;
        candidates.forEach(el => {
            const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text || text.length > 100) return;
            words.forEach((word, wi) => {
                if (!text.includes(word)) return;
                let score = 100 - wi * 8;
                if (el.matches('button,a,[role="button"]')) score += 35;
                if (text === word) score += 25;
                if (score > bestScore) { best = el; bestScore = score; }
            });
        });
        return best;
    }

    function clearTarget() {
        if (currentTarget) {
            currentTarget.classList.remove('tp91-spotlight', 'tp91-pulse');
        }
        currentTarget = null;
    }

    function positionTooltip() {
        if (!tooltip) return;
        const gap = 14;
        const tw = Math.min(390, window.innerWidth - 28);
        tooltip.style.width = tw + 'px';
        const target = currentTarget;
        if (!target || !visible(target)) {
            tooltip.style.left = ((window.innerWidth - tw) / 2) + 'px';
            tooltip.style.top = Math.max(24, (window.innerHeight - tooltip.offsetHeight) / 2) + 'px';
            return;
        }
        const r = target.getBoundingClientRect();
        let left = Math.max(14, Math.min(window.innerWidth - tw - 14, r.left + r.width / 2 - tw / 2));
        let top;
        const tooltipH = tooltip.offsetHeight;
        if (r.bottom + gap + tooltipH <= window.innerHeight) top = r.bottom + gap;
        else if (r.top - gap - tooltipH >= 0) top = r.top - gap - tooltipH;
        else top = Math.max(14, Math.min(window.innerHeight - tooltipH - 14, window.innerHeight / 2 - tooltipH / 2));
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    function resolveTarget() {
        clearTarget();
        const resolver = steps[index].target;
        currentTarget = typeof resolver === 'function' ? resolver() : null;
        if (currentTarget) currentTarget.classList.add('tp91-spotlight', 'tp91-pulse');
        positionTooltip();
        updateHint();
    }

    function updateHint() {
        if (!tooltip) return;
        const hint = tooltip.querySelector('.tp91-hint');
        if (!hint) return;
        if (currentTarget && steps[index].action === 'click') {
            hint.textContent = '画面の光っている場所をタップしてください';
        } else if (steps[index].optional) {
            hint.textContent = 'この機能が表示されない場合は「次へ」で進めます';
        } else {
            hint.textContent = '';
        }
    }

    function render() {
        if (!tooltip) return;
        const step = steps[index];
        tooltip.querySelector('.tp91-count').textContent = `${index + 1} / ${steps.length}`;
        tooltip.querySelector('h2').textContent = step.title;
        tooltip.querySelector('p').textContent = step.text;
        tooltip.querySelector('#tp91-next').textContent = index === steps.length - 1 ? '始める' : '次へ';
        resolveTarget();
    }

    function cleanup() {
        clearTarget();
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = null;
        document.removeEventListener('click', onDocumentClick, true);
        window.removeEventListener('resize', positionTooltip);
        window.removeEventListener('scroll', positionTooltip, true);
        if (overlay) overlay.remove();
        if (tooltip) tooltip.remove();
        overlay = null;
        tooltip = null;
        document.body.style.overflow = '';
    }

    function closeTutorial(markComplete) {
        if (markComplete) {
            safeSet(STORAGE_KEY, '1');
            safeSet(VERSION_KEY, VERSION);
        }
        cleanup();
    }

    function nextStep() {
        if (index >= steps.length - 1) {
            closeTutorial(true);
            return;
        }
        index += 1;
        render();
    }

    function onDocumentClick(event) {
        if (!currentTarget || !visible(currentTarget)) return;
        const clicked = event.target instanceof Element ? event.target.closest('button,a,[role="button"],input,select,textarea') : null;
        if (!clicked) return;
        if (clicked === currentTarget || currentTarget.contains(clicked)) {
            setTimeout(() => {
                if (!overlay) return;
                nextStep();
            }, 450);
        }
    }

    function openTutorial() {
        if (overlay) return;
        injectStyles();
        index = 0;
        overlay = document.createElement('div');
        overlay.id = 'tp91-overlay';
        tooltip = document.createElement('div');
        tooltip.id = 'tp91-tooltip';
        tooltip.setAttribute('role', 'dialog');
        tooltip.setAttribute('aria-modal', 'false');
        tooltip.innerHTML = `
            <div class="tp91-count"></div>
            <h2></h2>
            <p></p>
            <div class="tp91-hint"></div>
            <div class="tp91-actions">
                <button id="tp91-skip" type="button">スキップ</button>
                <button id="tp91-next" type="button">次へ</button>
            </div>`;
        document.body.appendChild(overlay);
        document.body.appendChild(tooltip);
        document.body.style.overflow = '';

        tooltip.querySelector('#tp91-next').addEventListener('click', nextStep);
        tooltip.querySelector('#tp91-skip').addEventListener('click', () => closeTutorial(true));
        document.addEventListener('click', onDocumentClick, true);
        window.addEventListener('resize', positionTooltip);
        window.addEventListener('scroll', positionTooltip, true);
        refreshTimer = setInterval(() => {
            if (!overlay) return;
            const before = currentTarget;
            const resolver = steps[index].target;
            const found = typeof resolver === 'function' ? resolver() : null;
            if (found !== before) resolveTarget();
            else positionTooltip();
        }, 900);
        render();
    }

    function addHelpButton() {
        if (document.getElementById('tp91-help')) return;
        const button = document.createElement('button');
        button.id = 'tp91-help';
        button.type = 'button';
        button.textContent = '使い方を見る';
        button.title = 'TimePilotの使い方をもう一度見る';
        button.addEventListener('click', openTutorial);
        document.body.appendChild(button);
    }

    function init() {
        addHelpButton();
        if (safeGet(STORAGE_KEY) !== '1') setTimeout(openTutorial, 650);
    }

    window.timePilotTutorial = { open: openTutorial };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
