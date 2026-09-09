/* TimePilot v9.0 - Account Cloud Sync
 * Guest mode stays available. When authenticated, important app data is
 * backed up to Supabase and restored after logout/re-login or on another device.
 */
(() => {
  'use strict';

  const TABLE = 'user_app_data';
  const SYNC_KEYS = [
    'tp_exp_v800',
    'tp_cal_v800',
    'tp_pref_v800',
    'tp_city_v800',
    'tp_theme_v800',
    'tp_tut_v800',
    'tp_execution_v850',
    'tp_personal_profile_v880',
    'tp_personal_feedback_v880',
    'tp_personal_insight_v880',
    'tp_adaptive_profile_v890'
  ];

  let syncing = false;
  let syncTimer = null;
  let ready = false;

  const read = (key) => {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) return value;
    } catch (_) {}
    try { return safeStorage?.memory?.[key] ?? null; } catch (_) { return null; }
  };

  const write = (key, value) => {
    try { safeStorage.set(key, value); }
    catch (_) {
      try { localStorage.setItem(key, value); } catch (_) {}
    }
  };

  const parse = (value, fallback) => {
    try { return value == null ? fallback : JSON.parse(value); }
    catch (_) { return fallback; }
  };

  function hasLocalData() {
    return SYNC_KEYS.some(key => {
      const value = read(key);
      return value !== null && value !== '' && value !== '{}' && value !== '[]' && value !== '0';
    });
  }

  function snapshot() {
    const data = {};
    SYNC_KEYS.forEach(key => {
      const value = read(key);
      if (value !== null) data[key] = value;
    });
    return data;
  }

  function mergeCalendar(localValue, cloudValue) {
    const local = parse(localValue, {}), cloud = parse(cloudValue, {});
    const out = { ...(cloud && typeof cloud === 'object' ? cloud : {}) };
    Object.entries(local && typeof local === 'object' ? local : {}).forEach(([date, events]) => {
      const existing = Array.isArray(out[date]) ? out[date] : [];
      const incoming = Array.isArray(events) ? events : [];
      const merged = [...existing];
      incoming.forEach(event => {
        const duplicate = merged.some(item =>
          item && event && item.time === event.time && item.title === event.title
        );
        if (!duplicate) merged.push(event);
      });
      merged.sort((a, b) => String(a?.time || '').localeCompare(String(b?.time || '')));
      if (merged.length) out[date] = merged;
    });
    return JSON.stringify(out);
  }

  function mergeExecution(localValue, cloudValue) {
    const local = parse(localValue, []), cloud = parse(cloudValue, []);
    const all = [...(Array.isArray(cloud) ? cloud : []), ...(Array.isArray(local) ? local : [])];
    const seen = new Set();
    const out = [];
    all.forEach(item => {
      const key = JSON.stringify([item?.date, item?.title, item?.minutes, item?.time, item?.type]);
      if (!seen.has(key)) { seen.add(key); out.push(item); }
    });
    return JSON.stringify(out.slice(-100));
  }

  function mergeValues(localData, cloudData) {
    const merged = { ...(cloudData || {}) };
    merged.tp_cal_v800 = mergeCalendar(localData?.tp_cal_v800, cloudData?.tp_cal_v800);
    merged.tp_execution_v850 = mergeExecution(localData?.tp_execution_v850, cloudData?.tp_execution_v850);

    const localExp = Number(localData?.tp_exp_v800 || 0);
    const cloudExp = Number(cloudData?.tp_exp_v800 || 0);
    merged.tp_exp_v800 = String(Math.max(localExp, cloudExp));

    ['tp_pref_v800','tp_city_v800','tp_theme_v800'].forEach(key => {
      if (localData?.[key] != null && localData[key] !== '') merged[key] = localData[key];
    });

    if (localData?.tp_tut_v800 === 'true' || cloudData?.tp_tut_v800 === 'true') merged.tp_tut_v800 = 'true';

    ['tp_personal_profile_v880','tp_personal_feedback_v880','tp_personal_insight_v880','tp_adaptive_profile_v890'].forEach(key => {
      if (!merged[key] && localData?.[key]) merged[key] = localData[key];
    });
    return merged;
  }

  async function getUser() {
    try {
      if (typeof supabaseClient === 'undefined') return null;
      const { data } = await supabaseClient.auth.getUser();
      return data?.user || null;
    } catch (_) { return null; }
  }

  async function upload() {
    if (syncing) return;
    const user = await getUser();
    if (!user) return;
    syncing = true;
    try {
      const data = snapshot();
      const { error } = await supabaseClient
        .from(TABLE)
        .upsert({ user_id: user.id, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) console.warn('[TimePilot] cloud sync failed:', error.message);
    } catch (error) {
      console.warn('[TimePilot] cloud sync error:', error);
    } finally {
      syncing = false;
    }
  }

  function scheduleUpload() {
    if (!ready || syncing) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(upload, 900);
  }

  async function restoreOrMigrate() {
    const user = await getUser();
    if (!user) return;
    try {
      const { data: row, error } = await supabaseClient
        .from(TABLE)
        .select('data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;

      const localData = snapshot();
      const cloudData = row?.data && typeof row.data === 'object' ? row.data : {};

      // First login: keep the user's existing guest data and upload it.
      // Returning user: merge local changes with the cloud copy.
      if (!row) {
        if (hasLocalData()) await upload();
        return;
      }

      const merged = mergeValues(localData, cloudData);
      syncing = true;
      try {
        Object.entries(merged).forEach(([key, value]) => write(key, value));
      } finally {
        syncing = false;
      }
      await upload();

      try {
        if (typeof appState !== 'undefined') {
          appState.exp = Number(read('tp_exp_v800') || 0);
          appState.calendar = parse(read('tp_cal_v800'), {});
          appState.pref = read('tp_pref_v800') || appState.pref;
          appState.city = read('tp_city_v800') || appState.city;
          appState.theme = read('tp_theme_v800') || appState.theme;
          appState.tutorialDone = read('tp_tut_v800') === 'true';
          if (typeof updateLevelUI === 'function') updateLevelUI();
          if (typeof renderCalendar === 'function') renderCalendar();
          if (typeof renderHomeChecklist === 'function') renderHomeChecklist();
          if (typeof updateAnalysis === 'function') updateAnalysis();
        }
      } catch (_) {}
    } catch (error) {
      console.warn('[TimePilot] restore failed; local data kept:', error);
    }
  }

  function patchStorage() {
    if (typeof safeStorage === 'undefined' || safeStorage.__tpCloudPatched) return;
    const originalSet = safeStorage.set.bind(safeStorage);
    safeStorage.set = function(key, value) {
      const result = originalSet(key, value);
      if (SYNC_KEYS.includes(key) && !syncing) scheduleUpload();
      return result;
    };
    safeStorage.__tpCloudPatched = true;
  }

  async function boot() {
    patchStorage();
    ready = true;
    if (typeof supabaseClient !== 'undefined') {
      await restoreOrMigrate();
      try {
        supabaseClient.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            setTimeout(restoreOrMigrate, 50);
          }
          // SIGNED_OUT intentionally does not clear local data.
        });
      } catch (_) {}
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
