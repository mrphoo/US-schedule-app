/* TimePilot v9.1 — First-use interactive tutorial
 * Additive module: does not modify existing app logic.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'tp_tutorial_v910_completed';
    const PROFILE_KEY = 'tp_tutorial_v910_version';
    const VERSION = '1';

    const steps = [
        {
            title: 'TimePilotへようこそ',
            text: 'TimePilotは、予定を作るだけでなく、実際の行動をもとに時間の使い方を改善していくアプリです。まずは基本的な使い方を確認しましょう。'
        },
        {
            title: '① 予定を登録する',
            text: 'まずは今日やることを登録します。時間と内容を入力するだけでOKです。予定を具体的にするほど、AIがより適切な提案をしやすくなります。'
        },
        {
            title: '② AIに予定を作ってもらう',
            text: 'AI機能では、予定ややることをもとに、その日のスケジュールを提案できます。AIを使う機能はログイン後に利用できます。'
        },
        {
            title: '③ 予定が崩れても大丈夫',
            text: '「数学に30分多くかかった」「急な予定が入った」など、予定の変更をAIに伝えると、残りの予定を状況に合わせて組み直せます。'
        },
        {
            title: '④ 実際の行動を記録する',
            text: 'タスクを完了したり、実際にかかった時間を記録することで、TimePilotがあなたの時間の使い方を分析するためのデータがたまります。'
        },
        {
            title: '⑤ 使うほど自分向けに',
            text: '集中しやすい時間帯や作業にかかる時間など、実際の行動データをもとに、今後の予定や集中方法をより自分に合う形へ改善していきます。'
        },
        {
            title: '準備完了',
            text: '基本操作はこれでOKです。まずは今日の予定を1つ登録して、TimePilotを使ってみましょう。チュートリアルは設定からいつでも見直せます。'
        }
    ];

    let index = 0;
    let overlay = null;

    function injectStyles() {
        if (document.getElementById('tp91-tutorial-style')) return;
        const style = document.createElement('style');
        style.id = 'tp91-tutorial-style';
        style.textContent = `
            #tp91-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(2,6,23,.72);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px)}
            #tp91-card{width:min(520px,100%);background:#fff;color:#0f172a;border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.35);overflow:hidden;font-family:inherit}
            #tp91-top{padding:24px 24px 10px}
            #tp91-badge{font-size:12px;font-weight:800;letter-spacing:.04em;color:#64748b;margin-bottom:8px}
            #tp91-title{font-size:23px;font-weight:900;line-height:1.3;margin:0 0 12px}
            #tp91-text{font-size:15px;line-height:1.75;color:#475569;margin:0;white-space:pre-wrap}
            #tp91-progress{display:flex;gap:5px;padding:16px 24px 4px}
            .tp91-dot{height:4px;flex:1;border-radius:99px;background:#e2e8f0}
            .tp91-dot.active{background:#0f172a}
            #tp91-actions{display:flex;justify-content:space-between;align-items:center;padding:18px 24px 24px;gap:10px}
            #tp91-skip{border:0;background:transparent;color:#64748b;font-weight:700;padding:10px;cursor:pointer}
            #tp91-next{border:0;background:#0f172a;color:#fff;border-radius:12px;padding:12px 20px;font-weight:800;cursor:pointer;min-width:110px}
            #tp91-settings{position:fixed;right:14px;bottom:14px;z-index:1000;border:0;border-radius:12px;padding:9px 12px;background:rgba(15,23,42,.9);color:#fff;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.18)}
            @media(max-width:520px){#tp91-overlay{padding:12px}#tp91-top{padding:20px 18px 8px}#tp91-title{font-size:20px}#tp91-progress{padding-left:18px;padding-right:18px}#tp91-actions{padding:14px 18px 18px}}
        `;
        document.head.appendChild(style);
    }

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }

    function safeSet(key, value) {
        try { localStorage.setItem(key, value); } catch (_) {}
    }

    function closeTutorial(markComplete) {
        if (markComplete) {
            safeSet(STORAGE_KEY, '1');
            safeSet(PROFILE_KEY, VERSION);
        }
        if (overlay) overlay.remove();
        overlay = null;
        document.body.style.overflow = '';
    }

    function render() {
        if (!overlay) return;
        const step = steps[index];
        overlay.querySelector('#tp91-badge').textContent = `${index + 1} / ${steps.length}`;
        overlay.querySelector('#tp91-title').textContent = step.title;
        overlay.querySelector('#tp91-text').textContent = step.text;
        overlay.querySelectorAll('.tp91-dot').forEach((dot, i) => dot.classList.toggle('active', i <= index));
        overlay.querySelector('#tp91-next').textContent = index === steps.length - 1 ? '始める' : '次へ';
        overlay.querySelector('#tp91-skip').textContent = index === steps.length - 1 ? '閉じる' : 'スキップ';
    }

    function openTutorial() {
        if (overlay) return;
        injectStyles();
        index = 0;
        overlay = document.createElement('div');
        overlay.id = 'tp91-overlay';
        overlay.innerHTML = `
            <div id="tp91-card" role="dialog" aria-modal="true" aria-labelledby="tp91-title">
                <div id="tp91-top">
                    <div id="tp91-badge"></div>
                    <h2 id="tp91-title"></h2>
                    <p id="tp91-text"></p>
                </div>
                <div id="tp91-progress" aria-hidden="true">
                    ${steps.map(() => '<span class="tp91-dot"></span>').join('')}
                </div>
                <div id="tp91-actions">
                    <button id="tp91-skip" type="button">スキップ</button>
                    <button id="tp91-next" type="button">次へ</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        overlay.querySelector('#tp91-next').addEventListener('click', () => {
            if (index >= steps.length - 1) closeTutorial(true);
            else { index += 1; render(); }
        });
        overlay.querySelector('#tp91-skip').addEventListener('click', () => closeTutorial(true));
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeTutorial(true);
        });
        document.addEventListener('keydown', onKeydown);
        render();
    }

    function onKeydown(event) {
        if (!overlay) return;
        if (event.key === 'Escape') closeTutorial(true);
        if (event.key === 'ArrowRight' || event.key === 'Enter') {
            const next = overlay.querySelector('#tp91-next');
            if (next) next.click();
        }
    }

    function addHelpButton() {
        if (document.getElementById('tp91-settings')) return;
        const button = document.createElement('button');
        button.id = 'tp91-settings';
        button.type = 'button';
        button.textContent = '使い方を見る';
        button.title = 'TimePilotの使い方をもう一度見る';
        button.addEventListener('click', openTutorial);
        document.body.appendChild(button);
    }

    function init() {
        addHelpButton();
        if (safeGet(STORAGE_KEY) !== '1') {
            setTimeout(openTutorial, 650);
        }
    }

    window.timePilotTutorial = { open: openTutorial };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
