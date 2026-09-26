(() => {
  const config = window.CAMPUSHUB_CONFIG;
  const key = config?.publishableKey?.trim();
  const notConfigured = !window.campushub || !key || /PASTE|YOUR_KEY|REPLACE/i.test(key);

  if (notConfigured) {
    window.location.replace('auth.html?setup=1');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('preview') === '1') sessionStorage.setItem('campushubStaffPreview', '1');
  const previewRequested = sessionStorage.getItem('campushubStaffPreview') === '1';

  function showPreviewBanner() {
    const bar = document.createElement('div');
    bar.id = 'staff-preview-banner';
    bar.style.cssText = 'position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:center;gap:10px;padding:9px 14px;background:#10213f;color:#fff;font:600 11px Inter,\'Segoe UI\',Arial,sans-serif;text-align:center';
    bar.innerHTML = 'You\'re previewing CampusHub as a student. <a id="exit-preview-link" href="admin.html" style="color:#fff;text-decoration:underline;font-weight:700">Exit preview</a>';
    document.body.prepend(bar);
    document.getElementById('exit-preview-link').addEventListener('click', () => {
      sessionStorage.removeItem('campushubStaffPreview');
    });
  }

  window.campushubAppReady = window.campushub.auth.getSession().then(async ({ data, error }) => {
    if (error || !data.session) {
      window.location.replace('auth.html');
      return false;
    }

    const user = data.session.user;
    const { data: staff, error: staffError } = await window.campushub
      .from('staff_access').select('role, display_name').eq('user_id', user.id).maybeSingle();
    if (staffError) {
      window.location.replace('auth.html?setup=connection');
      return false;
    }
    const isStaff = staff && ['owner', 'administrator', 'agent'].includes(staff.role);
    if (isStaff && !previewRequested) {
      window.location.replace('admin.html');
      return false;
    }

    let { data: profile, error: profileError } = await window.campushub
      .from('student_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (profileError) {
      window.location.replace('auth.html?setup=connection');
      return false;
    }

    if (!profile && isStaff) {
      // Staff previewing the student view get a clearly-labeled placeholder
      // profile instead of a real student record.
      const previewAdmission = `F109-PREVIEW-${user.id.slice(0, 8).toUpperCase()}`;
      const baseName = (staff.display_name || 'Administrator').slice(0, 28).trim();
      const result = await window.campushub.from('student_profiles').upsert({
        user_id: user.id,
        username: `${baseName} (Preview)`,
        admission_number: previewAdmission
      }, { onConflict: 'user_id' }).select().single();
      if (result.error) {
        window.location.replace('admin.html');
        return false;
      }
      profile = result.data;
    } else if (!profile) {
      const metadata = user.user_metadata || {};
      const username = metadata.campushub_username;
      const admissionNumber = metadata.campushub_admission_number;
      if (!username || !admissionNumber) {
        await window.campushub.auth.signOut();
        window.location.replace('auth.html?setup=profile');
        return false;
      }
      const result = await window.campushub.from('student_profiles').upsert({
        user_id: user.id,
        username,
        admission_number: admissionNumber.toUpperCase()
      }, { onConflict: 'user_id' }).select().single();
      if (result.error) {
        await window.campushub.auth.signOut();
        window.location.replace('auth.html?setup=profile');
        return false;
      }
      profile = result.data;
    }

    window.campushubUser = user;
    window.campushubProfile = profile;
    document.documentElement.dataset.campushubReady = 'true';
    document.body.dataset.authState = 'ready';
    if (isStaff && previewRequested) showPreviewBanner();
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
    return true;
  });
})();
