/* TimePilot v9.0 - Authentication Hardening
 * Additive security layer: stronger password policy, validation UX,
 * password visibility controls, caps-lock warning, and safer email handling.
 */
(() => {
  'use strict';

  const MIN_PASSWORD = 8;
  const originalSignUp = window.signUp;
  const originalSignIn = window.signIn;
  const originalUpdatePassword = window.updatePassword;
  const originalRequestPasswordReset = window.requestPasswordReset;

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const passwordScore = (value) => {
    const p = String(value || '');
    let score = 0;
    if (p.length >= MIN_PASSWORD) score++;
    if (/[a-z]/.test(p)) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  function strongEnough(password) {
    const p = String(password || '');
    return p.length >= MIN_PASSWORD && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);
  }

  function validationMessage(password) {
    const p = String(password || '');
    if (p.length < MIN_PASSWORD) return `パスワードは${MIN_PASSWORD}文字以上にしてください。`;
    if (!/[a-z]/.test(p)) return '小文字を1文字以上含めてください。';
    if (!/[A-Z]/.test(p)) return '大文字を1文字以上含めてください。';
    if (!/\d/.test(p)) return '数字を1文字以上含めてください。';
    return '';
  }

  function setEmailFields() {
    ['auth-email', 'auth-email-reset'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = normalizeEmail(el.value);
    });
  }

  function ensureStyle() {
    if (document.getElementById('tp-auth-hardening-style')) return;
    const style = document.createElement('style');
    style.id = 'tp-auth-hardening-style';
    style.textContent = `
      .tp-auth-password-wrap{position:relative;display:flex;align-items:center}
      .tp-auth-password-wrap input{padding-right:44px!important}
      .tp-auth-password-toggle{position:absolute;right:9px;border:0;background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;padding:7px;font-size:13px}
      .tp-auth-strength{margin-top:7px}
      .tp-auth-strength-track{height:5px;border-radius:4px;background:rgba(128,128,128,.2);overflow:hidden}
      .tp-auth-strength-fill{height:100%;width:0;transition:width .2s}
      .tp-auth-strength-text{font-size:10px;color:var(--text-muted,#94a3b8);margin-top:4px}
      .tp-auth-caps{display:none;font-size:10px;color:var(--color-phone,#ef4444);margin-top:5px}
      .tp-auth-security-note{font-size:10px;color:var(--text-muted,#94a3b8);line-height:1.5;margin-top:8px}
    `;
    document.head.appendChild(style);
  }

  function addPasswordControls(inputId, showStrength) {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.tpHardening === 'true') return;
    input.dataset.tpHardening = 'true';

    const wrap = document.createElement('div');
    wrap.className = 'tp-auth-password-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tp-auth-password-toggle';
    toggle.setAttribute('aria-label', 'パスワードを表示');
    toggle.innerHTML = '<i class="fa-solid fa-eye"></i>';
    toggle.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      toggle.setAttribute('aria-label', visible ? 'パスワードを表示' : 'パスワードを隠す');
      toggle.innerHTML = visible ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    });
    wrap.appendChild(toggle);

    input.addEventListener('keydown', (event) => {
      if (event.getModifierState && event.getModifierState('CapsLock')) {
        caps.style.display = 'block';
      } else {
        caps.style.display = 'none';
      }
    });
    input.addEventListener('keyup', (event) => {
      caps.style.display = event.getModifierState && event.getModifierState('CapsLock') ? 'block' : 'none';
    });

    const caps = document.createElement('div');
    caps.className = 'tp-auth-caps';
    caps.textContent = 'Caps Lockがオンになっています。';
    wrap.insertAdjacentElement('afterend', caps);

    if (showStrength) {
      const box = document.createElement('div');
      box.className = 'tp-auth-strength';
      box.innerHTML = '<div class="tp-auth-strength-track"><div class="tp-auth-strength-fill"></div></div><div class="tp-auth-strength-text">8文字以上・大文字・小文字・数字を推奨</div>';
      caps.insertAdjacentElement('afterend', box);
      const fill = box.querySelector('.tp-auth-strength-fill');
      const text = box.querySelector('.tp-auth-strength-text');
      input.addEventListener('input', () => {
        const score = passwordScore(input.value);
        fill.style.width = `${Math.min(100, score * 20)}%`;
        text.textContent = score >= 4 ? '強いパスワードです' : score >= 3 ? 'もう少し強化できます' : '8文字以上・大文字・小文字・数字を含めてください';
      });
    }
  }

  function harden() {
    ensureStyle();
    addPasswordControls('auth-password', false);
    addPasswordControls('auth-new-password', true);
    addPasswordControls('auth-new-password-confirm', false);

    ['auth-email', 'auth-email-reset'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.dataset.tpEmailHardening !== 'true') {
        el.dataset.tpEmailHardening = 'true';
        el.addEventListener('blur', () => { el.value = normalizeEmail(el.value); });
      }
    });
  }

  window.signUp = async function () {
    const input = document.getElementById('auth-password');
    const email = document.getElementById('auth-email');
    const password = input?.value || '';
    if (email) email.value = normalizeEmail(email.value);
    const reason = validationMessage(password);
    if (reason) {
      showAuthMessage(reason, true);
      return;
    }
    return typeof originalSignUp === 'function' ? originalSignUp() : undefined;
  };

  window.signIn = async function () {
    const email = document.getElementById('auth-email');
    if (email) email.value = normalizeEmail(email.value);
    return typeof originalSignIn === 'function' ? originalSignIn() : undefined;
  };

  window.updatePassword = async function () {
    const input = document.getElementById('auth-new-password');
    const password = input?.value || '';
    const reason = validationMessage(password);
    if (reason) {
      showAuthMessage(reason, true);
      return;
    }
    return typeof originalUpdatePassword === 'function' ? originalUpdatePassword() : undefined;
  };

  window.requestPasswordReset = async function () {
    setEmailFields();
    return typeof originalRequestPasswordReset === 'function' ? originalRequestPasswordReset() : undefined;
  };

  function boot() {
    harden();
    setTimeout(harden, 500);
    setTimeout(harden, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
