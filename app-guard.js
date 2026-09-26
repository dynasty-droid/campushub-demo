(() => {
  const config = window.CAMPUSHUB_CONFIG;
  const key = config?.publishableKey?.trim();
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

    const user = data.session.user;
    const { data: staff, error: staffError } = await window.campushub
      .from('staff_access').select('role').eq('user_id', user.id).maybeSingle();
    if (staffError) {
      window.location.replace('auth.html?setup=connection');
      return;
    }
    if (staff && ['owner', 'administrator'].includes(staff.role)) {
      window.location.replace('admin.html');
      return;
    }

    let { data: profile, error: profileError } = await window.campushub
      .from('student_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (profileError) {
      window.location.replace('auth.html?setup=connection');
      return;
    }

    if (!profile) {
      const metadata = user.user_metadata || {};
      const username = metadata.campushub_username;
      const admissionNumber = metadata.campushub_admission_number;
      if (!username || !admissionNumber) {
        await window.campushub.auth.signOut();
        window.location.replace('auth.html?setup=profile');
        return;
      }
      const result = await window.campushub.from('student_profiles').upsert({
        user_id: user.id,
        username,
        admission_number: admissionNumber.toUpperCase()
      }, { onConflict: 'user_id' }).select().single();
      if (result.error) {
        await window.campushub.auth.signOut();
        window.location.replace('auth.html?setup=profile');
        return;
      }
      profile = result.data;
    }

    window.campushubUser = user;
    window.campushubProfile = profile;
    document.documentElement.dataset.campushubReady = 'true';
    document.body.dataset.authState = 'ready';
    const name = profile.username;
    document.querySelector('#profile-name-input').value = name;
    document.querySelector('#profile-admission-input').value = profile.admission_number;
    document.querySelector('#profile-display-name').textContent = name;
    document.querySelector('#profile-display-admission').textContent = profile.admission_number;
    document.querySelector('#profile-avatar-initial').textContent = name.trim().charAt(0).toUpperCase();
    document.querySelector('#campushub-signout').addEventListener('click', async () => {
      await window.campushub.auth.signOut();
      window.location.replace('auth.html');
    });
  });
})();
