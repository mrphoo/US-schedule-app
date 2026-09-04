// ========================================
// TimePilot Authentication UI
// Login-related UI only. App layout is untouched.
// ========================================

(function () {
    const STYLE_ID = 'timepilot-auth-ui-style';

    function installAuthUI() {
        if (document.getElementById('timepilot-auth-ui')) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #timepilot-auth-ui {
                position: fixed;
                top: 12px;
                right: 12px;
                z-index: 2200;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            #auth-login-button,
            #auth-user-area {
                border: 1px solid var(--glass-border, rgba(255,255,255,.12));
                background: var(--glass-bg, rgba(30,41,59,.78));
                color: var(--text-main, #f8fafc);
                backdrop-filter: blur(18px);
                -webkit-backdrop-filter: blur(18px);
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,.18);
            }
            #auth-login-button {
                padding: 9px 13px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 800;
            }
            #auth-user-area {
                display: none;
                align-items: center;
                gap: 8px;
                padding: 6px 7px 6px 10px;
                max-width: min(260px, calc(100vw - 24px));
            }
            #auth-user-email {
                max-width: 160px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 11px;
                font-weight: 700;
                color: var(--text-muted, #94a3b8);
            }
            #auth-logout-button {
                border: 0;
                border-radius: 8px;
                padding: 7px 9px;
                background: rgba(239,68,68,.14);
                color: var(--color-phone, #ef4444);
                font-size: 11px;
                font-weight: 800;
                cursor: pointer;
            }
            #auth-modal {
                position: fixed;
                inset: 0;
                z-index: 2300;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(0,0,0,.62);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
            }
            #auth-modal.show { display: flex; }
            .tp-auth-card {
                width: min(390px, 100%);
                padding: 26px;
                border: 1px solid var(--glass-border, rgba(255,255,255,.12));
                border-radius: 24px;
                background: var(--bg-base, #0f172a);
                color: var(--text-main, #f8fafc);
                box-shadow: 0 24px 80px rgba(0,0,0,.38);
            }
            .tp-auth-brand {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 6px;
                font-size: 20px;
                font-weight: 900;
            }
            .tp-auth-subtitle {
                margin-bottom: 20px;
                color: var(--text-muted, #94a3b8);
                font-size: 12px;
            }
            .tp-auth-label {
                display: block;
                margin: 12px 0 7px;
                font-size: 12px;
                font-weight: 800;
            }
            #auth-email, #auth-password, #auth-email-reset, #auth-new-password, #auth-new-password-confirm {
                width: 100%;
                padding: 12px 14px;
                border-radius: 12px;
                border: 1px solid var(--glass-border, rgba(255,255,255,.12));
                background: rgba(255,255,255,.06);
                color: var(--text-main, #f8fafc);
                outline: none;
                font-size: 14px;
            }
            .tp-auth-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 9px;
                margin-top: 18px;
            }
            #auth-submit, #auth-signup, #auth-reset-request, #auth-password-update {
                border: 0;
                border-radius: 12px;
                padding: 12px;
                font-size: 13px;
                font-weight: 800;
                cursor: pointer;
            }
            #auth-submit, #auth-password-update { background: linear-gradient(135deg, var(--color-ai,#a855f7), var(--color-study,#3b82f6)); color: white; }
            #auth-signup, #auth-reset-request { background: rgba(128,128,128,.14); color: var(--text-main,#f8fafc); border: 1px solid var(--glass-border, rgba(255,255,255,.12)); }
            #auth-submit:disabled, #auth-signup:disabled, #auth-reset-request:disabled, #auth-password-update:disabled { opacity: .55; cursor: wait; }
            #auth-message {
                min-height: 18px;
                margin-top: 13px;
                font-size: 11px;
                line-height: 1.5;
                text-align: center;
            }
            .tp-auth-link {
                display: block;
                width: 100%;
                margin-top: 12px;
                border: 0;
                background: transparent;
                color: var(--color-study, #3b82f6);
                cursor: pointer;
                font-size: 11px;
                font-weight: 700;
            }
            #auth-close-button {
                width: 100%;
                margin-top: 8px;
                padding: 9px;
                border: 0;
                background: transparent;
                color: var(--text-muted,#94a3b8);
                cursor: pointer;
                font-size: 12px;
            }
            .tp-auth-reset-only { display: none; }
            .tp-auth-reset-request-only { display: none; }
            .tp-auth-login-only { display: block; }
            @media (max-width: 600px) {
                #timepilot-auth-ui { top: 8px; right: 8px; }
                #auth-user-email { max-width: 110px; }
            }
        `;
        document.head.appendChild(style);

        const root = document.createElement('div');
        root.id = 'timepilot-auth-ui';
        root.innerHTML = `
            <button id="auth-login-button" type="button" onclick="openAuthModal()">
                <i class="fa-solid fa-user"></i> ログイン
            </button>
            <div id="auth-user-area">
                <i class="fa-solid fa-circle-user" style="color:var(--color-study)"></i>
                <span id="auth-user-email"></span>
                <button id="auth-logout-button" type="button" onclick="signOut()">ログアウト</button>
            </div>
        `;
        document.body.appendChild(root);

        const modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.innerHTML = `
            <div class="tp-auth-card" role="dialog" aria-modal="true" aria-labelledby="tp-auth-title">
                <div class="tp-auth-brand" id="tp-auth-title">
                    <i class="fa-solid fa-shield-halved" style="color:var(--color-ai)"></i>
                    <span id="auth-modal-title">TimePilot Account</span>
                </div>
                <div class="tp-auth-subtitle" id="auth-modal-subtitle">予定や学習データをあなたのアカウントで管理</div>

                <div class="tp-auth-login-only">
                    <label class="tp-auth-label" for="auth-email">メールアドレス</label>
                    <input id="auth-email" type="email" autocomplete="email" placeholder="you@example.com">
                    <label class="tp-auth-label" for="auth-password">パスワード</label>
                    <input id="auth-password" type="password" autocomplete="current-password" placeholder="6文字以上">
                    <div class="tp-auth-actions">
                        <button id="auth-submit" type="button" onclick="signIn()">ログイン</button>
                        <button id="auth-signup" type="button" onclick="signUp()">新規登録</button>
                    </div>
                    <button class="tp-auth-link" type="button" onclick="showPasswordResetRequestMode()">パスワードを忘れた場合</button>
                </div>

                <div class="tp-auth-reset-request-only">
                    <label class="tp-auth-label" for="auth-email-reset">メールアドレス</label>
                    <input id="auth-email-reset" type="email" autocomplete="email" placeholder="you@example.com">
                    <div class="tp-auth-actions">
                        <button id="auth-reset-request" type="button" onclick="requestPasswordResetFromUI()">再設定メールを送る</button>
                    </div>
                    <button class="tp-auth-link" type="button" onclick="showLoginMode()">ログイン画面に戻る</button>
                </div>

                <div class="tp-auth-reset-only">
                    <label class="tp-auth-label" for="auth-new-password">新しいパスワード</label>
                    <input id="auth-new-password" type="password" autocomplete="new-password" placeholder="6文字以上">
                    <label class="tp-auth-label" for="auth-new-password-confirm">新しいパスワード（確認）</label>
                    <input id="auth-new-password-confirm" type="password" autocomplete="new-password" placeholder="もう一度入力">
                    <div class="tp-auth-actions">
                        <button id="auth-password-update" type="button" onclick="updatePassword()">パスワードを変更</button>
                    </div>
                </div>

                <div id="auth-message" aria-live="polite"></div>
                <button id="auth-close-button" type="button" onclick="closeAuthModal()">閉じる</button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', function (event) {
            if (event.target === modal && !modal.classList.contains('reset-mode')) closeAuthModal();
        });

        document.getElementById('auth-password').addEventListener('keydown', function (event) {
            if (event.key === 'Enter') signIn();
        });
        document.getElementById('auth-new-password-confirm').addEventListener('keydown', function (event) {
            if (event.key === 'Enter') updatePassword();
        });

        if (typeof updateAuthUI === 'function') updateAuthUI(currentUser);
    }

    window.showLoginMode = function () {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        modal.classList.remove('reset-mode');
        document.querySelector('.tp-auth-login-only').style.display = 'block';
        document.querySelector('.tp-auth-reset-request-only').style.display = 'none';
        document.querySelector('.tp-auth-reset-only').style.display = 'none';
        document.getElementById('auth-modal-title').innerText = 'TimePilot Account';
        document.getElementById('auth-modal-subtitle').innerText = '予定や学習データをあなたのアカウントで管理';
        showAuthMessage('');
    };

    window.showPasswordResetRequestMode = function () {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        modal.classList.remove('reset-mode');
        document.querySelector('.tp-auth-login-only').style.display = 'none';
        document.querySelector('.tp-auth-reset-request-only').style.display = 'block';
        document.querySelector('.tp-auth-reset-only').style.display = 'none';
        document.getElementById('auth-modal-title').innerText = 'パスワード再設定';
        document.getElementById('auth-modal-subtitle').innerText = '登録メールアドレスに再設定用メールを送ります';
        document.getElementById('auth-email-reset').value = document.getElementById('auth-email').value;
        showAuthMessage('');
        document.getElementById('auth-email-reset').focus();
    };

    window.requestPasswordResetFromUI = function () {
        const source = document.getElementById('auth-email-reset');
        const target = document.getElementById('auth-email');
        if (target) target.value = source?.value || '';
        requestPasswordReset();
    };

    window.showPasswordResetMode = function () {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        modal.classList.add('reset-mode');
        document.querySelector('.tp-auth-login-only').style.display = 'none';
        document.querySelector('.tp-auth-reset-request-only').style.display = 'none';
        document.querySelector('.tp-auth-reset-only').style.display = 'block';
        document.getElementById('auth-modal-title').innerText = '新しいパスワード';
        document.getElementById('auth-modal-subtitle').innerText = '新しいパスワードを設定してください';
        showAuthMessage('');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installAuthUI, { once: true });
    } else {
        installAuthUI();
    }
})();
