(() => {
  const key = window.CAMPUSHUB_CONFIG?.publishableKey?.trim();
  const notConfigured = !window.campushub || !key || /PASTE|YOUR_KEY|REPLACE/i.test(key);
  if (notConfigured) {
    window.location.replace('auth.html?setup=1');
    return;
  }

  window.campushub.auth.getSession().then(async ({ data, error }) => {
    if (error || !data.session) {
      window.location.replace('auth.html');
      return;
    }
    const { data: staff, error: staffError } = await window.campushub
      .from('staff_access').select('role').eq('user_id', data.session.user.id).maybeSingle();
    if (staffError || !staff || !['owner', 'administrator'].includes(staff.role)) {
      await window.campushub.auth.signOut();
      window.location.replace('auth.html?setup=access');
      return;
    }
    document.documentElement.dataset.campushubReady = 'true';
    document.body.dataset.authState = 'ready';
    const chip = document.querySelector('.admin-chip');
    if (chip) chip.lastChild.textContent = staff.role === 'owner' ? 'Main administrator' : 'Administrator';
    const signOut = document.createElement('button');
    signOut.type = 'button';
    signOut.className = 'admin-signout';
    signOut.textContent = 'Sign out';
    signOut.addEventListener('click', async () => {
      await window.campushub.auth.signOut();
      window.location.replace('auth.html');
    });
    document.querySelector('.topbar').append(signOut);
  });
})();
