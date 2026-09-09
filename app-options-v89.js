/* TimePilot v8.9 - Expanded distraction app choices
 * Additive module: expands the existing app selector without changing the page layout.
 */
(() => {
  'use strict';

  const OPTIONS = [
    'Instagram',
    'TikTok',
    'YouTube',
    'X',
    'LINE',
    'Discord',
    'Snapchat',
    'Facebook',
    'Threads',
    'Pinterest',
    'Twitch',
    'Netflix',
    'その他',
    'なし'
  ];

  function apply() {
    const select = document.getElementById('input-app');
    if (!select || select.dataset.tp89Expanded === '1') return;

    const current = select.value;
    select.innerHTML = '';
    OPTIONS.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });

    select.value = OPTIONS.includes(current) ? current : 'なし';
    select.dataset.tp89Expanded = '1';
  }

  function boot() {
    apply();
    setInterval(apply, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
