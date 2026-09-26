(() => {
  const config = window.CAMPUSHUB_CONFIG;
  const key = config?.publishableKey?.trim();
  if (!window.campushub || !key || /PASTE|YOUR_KEY|REPLACE/i.test(key)) {
    window.location.replace('auth.html?setup=1');
    return;
  }

  window.campushubAdminReady = (async () => {
    const { data, error } = await window.campushub.auth.getSession();
    if (error || !data.session) {
      window.location.replace('auth.html');
      return false;
    }

    const user = data.session.user;
    const result = await window.campushub.from('staff_access')
      .select('user_id,display_name,role,full_access,can_announce,can_update,can_share_links,can_share_notes,can_edit_timetable')
      .eq('user_id', user.id).maybeSingle();
    if (result.error) {
      window.location.replace('auth.html?setup=connection');
      return false;
    }
    if (!result.data || !['owner', 'administrator', 'agent'].includes(result.data.role)) {
      window.location.replace('index.html');
      return false;
    }

    window.campushubUser = user;
    window.campushubStaff = result.data;
    document.documentElement.dataset.campushubReady = 'true';
    document.body.dataset.authState = 'ready';
    const chip = document.querySelector('.admin-chip');
    if (chip) {
      const avatar = chip.querySelector('.admin-avatar');
      if (avatar) avatar.textContent = (result.data.display_name || 'A').trim().charAt(0).toUpperCase();
      chip.lastChild.textContent = result.data.role === 'owner' ? 'Main administrator' : result.data.display_name || 'Approved staff';
    }

    if (result.data.role !== 'owner') {
      document.querySelector('[data-page="people"]')?.remove();
      document.querySelector('[data-goto="people"]')?.remove();
      document.querySelector('#people-page')?.remove();
    }

    const signOut = document.createElement('button');
    signOut.type = 'button';
    signOut.className = 'admin-signout';
    signOut.textContent = 'Sign out';
    signOut.addEventListener('click', async () => {
      await window.campushub.auth.signOut();
      window.location.replace('auth.html');
    });
    chip?.append(signOut);
    return true;
  })();
})();
