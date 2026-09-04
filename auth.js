// ========================================
// TimePilot Authentication
// Supabase Auth v2
// ========================================

let currentUser = null;
let authReady = false;

// ----------------------------------------
// 初期化
// ----------------------------------------
async function initAuth() {
    try {
        const {
            data: { session }
        } = await supabaseClient.auth.getSession();

        currentUser = session?.user ?? null;
        authReady = true;
        updateAuthUI(currentUser);

    } catch (error) {
        console.error('Auth initialization error:', error);
        authReady = true;
        showAuthMessage('認証の初期化に失敗しました。ページを再読み込みしてください。', true);
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user ?? null;
        updateAuthUI(currentUser);

        if (event === 'PASSWORD_RECOVERY') {
            openPasswordResetModal();
        }
    });
}

// ----------------------------------------
// 新規登録
// ----------------------------------------
async function signUp() {
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;

    if (!email || !password) {
        showAuthMessage('メールアドレスとパスワードを入力してください。', true);
        return;
    }

    if (password.length < 6) {
        showAuthMessage('パスワードは6文字以上にしてください。', true);
        return;
    }

    setAuthLoading(true);

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        if (data.user && !data.session) {
            showAuthMessage('登録しました。確認メールを確認してからログインしてください。');
            return;
        }

        showAuthMessage('アカウントを作成しました。');
        closeAuthModal();
    } catch (error) {
        console.error('Sign up error:', error);
        showAuthMessage(authErrorMessage(error), true);
    } finally {
        setAuthLoading(false);
    }
}

// ----------------------------------------
// ログイン
// ----------------------------------------
async function signIn() {
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;

    if (!email || !password) {
        showAuthMessage('メールアドレスとパスワードを入力してください。', true);
        return;
    }

    setAuthLoading(true);

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        currentUser = data.user;
        updateAuthUI(currentUser);
        closeAuthModal();
    } catch (error) {
        console.error('Sign in error:', error);
        showAuthMessage('ログインできませんでした。メールアドレスまたはパスワードを確認してください。', true);
    } finally {
        setAuthLoading(false);
    }
}

// ----------------------------------------
// パスワード再設定メール
// ----------------------------------------
async function requestPasswordReset() {
    const email = document.getElementById('auth-email')?.value.trim();

    if (!email) {
        showAuthMessage('登録しているメールアドレスを入力してください。', true);
        return;
    }

    setAuthLoading(true);

    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) throw error;

        showAuthMessage('パスワード再設定メールを送信しました。メールを確認してください。');
    } catch (error) {
        console.error('Password reset request error:', error);
        showAuthMessage('再設定メールを送信できませんでした。メールアドレスを確認してください。', true);
    } finally {
        setAuthLoading(false);
    }
}

// ----------------------------------------
// 新しいパスワードを保存
// ----------------------------------------
async function updatePassword() {
    const password = document.getElementById('auth-new-password')?.value;
    const confirmation = document.getElementById('auth-new-password-confirm')?.value;

    if (!password || !confirmation) {
        showAuthMessage('新しいパスワードを入力してください。', true);
        return;
    }

    if (password.length < 6) {
        showAuthMessage('パスワードは6文字以上にしてください。', true);
        return;
    }

    if (password !== confirmation) {
        showAuthMessage('パスワードが一致していません。', true);
        return;
    }

    setAuthLoading(true);

    try {
        const { data, error } = await supabaseClient.auth.updateUser({ password });
        if (error) throw error;

        currentUser = data.user;
        updateAuthUI(currentUser);
        showAuthMessage('パスワードを変更しました。');

        setTimeout(() => closeAuthModal(), 700);
    } catch (error) {
        console.error('Password update error:', error);
        showAuthMessage('パスワードを変更できませんでした。もう一度お試しください。', true);
    } finally {
        setAuthLoading(false);
    }
}

// ----------------------------------------
// ログアウト
// ----------------------------------------
async function signOut() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        currentUser = null;
        updateAuthUI(null);
    } catch (error) {
        console.error('Sign out error:', error);
        alert('ログアウトできませんでした。もう一度お試しください。');
    }
}

// ----------------------------------------
// UI更新
// ----------------------------------------
function updateAuthUI(user) {
    const loginButton = document.getElementById('auth-login-button');
    const userArea = document.getElementById('auth-user-area');
    const userEmail = document.getElementById('auth-user-email');

    if (!loginButton || !userArea) return;

    if (user) {
        loginButton.style.display = 'none';
        userArea.style.display = 'flex';
        if (userEmail) userEmail.innerText = user.email || 'ログイン中';
    } else {
        loginButton.style.display = 'block';
        userArea.style.display = 'none';
        if (userEmail) userEmail.innerText = '';
    }
}

// ----------------------------------------
// モーダル
// ----------------------------------------
function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    showLoginMode();
    modal.classList.add('show');
    document.getElementById('auth-email')?.focus();
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    modal.classList.remove('show');
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-new-password').value = '';
    document.getElementById('auth-new-password-confirm').value = '';
    showAuthMessage('');
    showLoginMode();
}

function openPasswordResetModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    showPasswordResetMode();
    modal.classList.add('show');
    document.getElementById('auth-new-password')?.focus();
}

// ----------------------------------------
// メッセージ
// ----------------------------------------
function showAuthMessage(message, isError = false) {
    const element = document.getElementById('auth-message');
    if (!element) return;

    element.innerText = message;
    element.style.color = isError ? 'var(--color-phone)' : 'var(--color-study)';
}

function authErrorMessage(error) {
    const message = String(error?.message || '');
    if (/invalid.*email|email.*invalid/i.test(message)) return 'メールアドレスの形式を確認してください。';
    if (/password.*6|at least 6/i.test(message)) return 'パスワードは6文字以上にしてください。';
    if (/already registered|user already exists/i.test(message)) return 'このメールアドレスはすでに登録されています。';
    return 'アカウントを作成できませんでした。入力内容を確認してください。';
}

// ----------------------------------------
// Loading
// ----------------------------------------
function setAuthLoading(loading) {
    const buttons = [
        document.getElementById('auth-submit'),
        document.getElementById('auth-signup'),
        document.getElementById('auth-reset-request'),
        document.getElementById('auth-password-update')
    ].filter(Boolean);

    buttons.forEach(button => button.disabled = loading);

    const submit = document.getElementById('auth-submit');
    const signup = document.getElementById('auth-signup');
    const resetRequest = document.getElementById('auth-reset-request');
    const passwordUpdate = document.getElementById('auth-password-update');

    if (submit) submit.innerText = loading ? '処理中...' : 'ログイン';
    if (signup) signup.innerText = loading ? '処理中...' : '新規登録';
    if (resetRequest) resetRequest.innerText = loading ? '送信中...' : '再設定メールを送る';
    if (passwordUpdate) passwordUpdate.innerText = loading ? '保存中...' : 'パスワードを変更';
}

window.addEventListener('DOMContentLoaded', initAuth);
