(() => {
  const config = window.CAMPUSHUB_CONFIG;
  const key = config?.publishableKey?.trim();
  const placeholder = !key || /PASTE|YOUR_KEY|REPLACE/i.test(key);

  if (!window.supabase?.createClient || !config?.url || placeholder) {
    window.campushubSetupNeeded = true;
    return;
  }

  window.campushub = window.supabase.createClient(config.url, key);
})();
