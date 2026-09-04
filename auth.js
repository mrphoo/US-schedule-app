// ========================================
// TimePilot Authentication
// ========================================

let currentUser = null;

// ----------------------------------------
// 初期化
// ----------------------------------------
async function initAuth() {
    try {
        const {
            data: { session }
        } = await supabaseClient.auth.getSession();

        currentUser = session?.user ?? null;

        updateAuthUI(currentUser);

    } catch (error) {
        console.error('Auth initialization error:', error);
    }

    // ログイン状態の変化を監視
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user ?? null;

        updateAuthUI(currentUser);

        console.log('Auth event:', event);
    });
}


// ----------------------------------------
// 新規登録
// ----------------------------------------
async function signUp() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        showAuthMessage('メールアドレスとパスワードを入力してください。', true);
        return;
    }

    if (password.length < 6) {
        showAuthMessage('パスワードは6文字以上にしてください。', true);
        return;
    }

    setAuthLoading(true);

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    setAuthLoading(false);

    if (error) {
        console.error(error);
        showAuthMessage(error.message, true);
        return;
    }

    // メール確認が有効な場合
    if (data.user && !data.session) {
        showAuthMessage(
            '登録しました。確認メールを確認してください。'
        );
        return;
    }

    showAuthMessage('アカウントを作成しました。');

    closeAuthModal();
}


// ----------------------------------------
// ログイン
// ----------------------------------------
async function signIn() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        showAuthMessage('メールアドレスとパスワードを入力してください。', true);
        return;
    }

    setAuthLoading(true);

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

    setAuthLoading(false);

    if (error) {
        console.error(error);
        showAuthMessage(
            'ログインできませんでした。メールアドレスまたはパスワードを確認してください。',
            true
        );
        return;
    }

    currentUser = data.user;

    updateAuthUI(currentUser);
    closeAuthModal();
}


// ----------------------------------------
// ログアウト
// ----------------------------------------
async function signOut() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error('Sign out error:', error);
        return;
    }

    currentUser = null;

    updateAuthUI(null);

    alert('ログアウトしました。');
}


// ----------------------------------------
// UI更新
// ----------------------------------------
function updateAuthUI(user) {
    const loginButton =
        document.getElementById('auth-login-button');

    const userArea =
        document.getElementById('auth-user-area');

    const userEmail =
        document.getElementById('auth-user-email');

    if (!loginButton || !userArea) return;

    if (user) {
        loginButton.style.display = 'none';
        userArea.style.display = 'flex';

        if (userEmail) {
            userEmail.innerText = user.email || 'ログイン中';
        }

    } else {
        loginButton.style.display = 'block';
        userArea.style.display = 'none';

        if (userEmail) {
            userEmail.innerText = '';
        }
    }
}


// ----------------------------------------
// モーダル
// ----------------------------------------
function openAuthModal() {
    const modal = document.getElementById('auth-modal');

    if (!modal) return;

    modal.classList.add('show');

    const email =
        document.getElementById('auth-email');

    if (email) email.focus();
}


function closeAuthModal() {
    const modal = document.getElementById('auth-modal');

    if (!modal) return;

    modal.classList.remove('show');

    const password =
        document.getElementById('auth-password');

    if (password) password.value = '';

    showAuthMessage('');
}


// ----------------------------------------
// メッセージ
// ----------------------------------------
function showAuthMessage(message, isError = false) {
    const element =
        document.getElementById('auth-message');

    if (!element) return;

    element.innerText = message;

    if (isError) {
        element.style.color = 'var(--color-phone)';
    } else {
        element.style.color = 'var(--color-study)';
    }
}


// ----------------------------------------
// Loading
// ----------------------------------------
function setAuthLoading(loading) {
    const loginButton =
        document.getElementById('auth-submit');

    const signupButton =
        document.getElementById('auth-signup');

    if (!loginButton || !signupButton) return;

    loginButton.disabled = loading;
    signupButton.disabled = loading;

    loginButton.innerText =
        loading ? '処理中...' : 'ログイン';

    signupButton.innerText =
        loading ? '処理中...' : '新規登録';
}


// ----------------------------------------
// ページ読み込み
// ----------------------------------------
window.addEventListener('DOMContentLoaded', () => {
    initAuth();
});
