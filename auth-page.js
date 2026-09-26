(() => {
  const signInForm = document.querySelector('#signin-form');
  const signUpForm = document.querySelector('#signup-form');
  const signInTab = document.querySelector('#signin-tab');
  const signUpTab = document.querySelector('#signup-tab');
  const status = document.querySelector('#auth-status');
  const setupMessage = document.querySelector('#setup-message');
  const resendButton = document.querySelector('#resend-confirmation');
  const setupReason = new URLSearchParams(window.location.search).get('setup');

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  function switchMode(mode) {
    const isSignIn = mode === 'signin';
    signInForm.hidden = !isSignIn;
    signUpForm.hidden = isSignIn;
    signInTab.classList.toggle('active', isSignIn);
    signUpTab.classList.toggle('active', !isSignIn);
    signInTab.setAttribute('aria-selected', String(isSignIn));
    signUpTab.setAttribute('aria-selected', String(!isSignIn));
    document.querySelector('#form-eyebrow').textContent = isSignIn ? 'WELCOME BACK' : 'JOIN YOUR CLASS';
    document.querySelector('#form-title').textContent = isSignIn ? 'Sign in to CampusHub' : 'Create your student account';
    document.querySelector('#form-intro').textContent = isSignIn
      ? 'Use the email address and password for your CampusHub account.'
      : 'Use your own details. Admission numbers must begin with F109.';
    setStatus('');
  }

  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
  }

  function isDuplicateAdmissionError(error) {
    return error?.code === '23505' || /student_profiles_admission_number_key|duplicate key/i.test(error?.message || '');
  }

  async function continueIntoCampusHub(user) {
    const client = window.campushub;
    const { data: staff, error: staffError } = await client
      .from('staff_access').select('role').eq('user_id', user.id).maybeSingle();
    if (staffError) throw staffError;

    if (staff && ['owner', 'administrator'].includes(staff.role)) {
      window.location.replace('admin.html');
      return;
    }

    const { data: existingProfile, error: profileReadError } = await client
      .from('student_profiles').select('user_id').eq('user_id', user.id).maybeSingle();
    if (profileReadError) throw profileReadError;

    const metadata = user.user_metadata || {};
    const username = metadata.campushub_username;
    const admissionNumber = metadata.campushub_admission_number;
    if (!existingProfile && username && admissionNumber) {
      const { error: profileCreateError } = await client.from('student_profiles').upsert({
        user_id: user.id,
        username,
        admission_number: admissionNumber.toUpperCase()
      }, { onConflict: 'user_id' });
      if (profileCreateError) {
        if (isDuplicateAdmissionError(profileCreateError)) {
          await client.auth.signOut();
          throw new Error('That admission number is already linked to another student. Please contact the administrator to correct it.');
        }
        throw profileCreateError;
      }
    } else if (!existingProfile) {
      await client.auth.signOut();
      throw new Error('This account does not have a CampusHub student profile or staff access yet.');
    }

    window.location.replace('index.html');
  }

  async function handleSignIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(form, true);
    setStatus('Signing you in…');
    try {
      const { data, error } = await window.campushub.auth.signInWithPassword({
        email: String(values.get('email')).trim(),
        password: String(values.get('password'))
      });
      if (error) throw error;
      await continueIntoCampusHub(data.user);
    } catch (error) {
      setStatus(error.message || 'We could not sign you in. Check your email and password, then try again.', true);
    } finally {
      setBusy(form, false);
    }
  }

  async function handleSignUp(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const username = String(values.get('username')).trim();
    const admissionNumber = String(values.get('admissionNumber')).trim().toUpperCase();
    const email = String(values.get('email')).trim();
    const password = String(values.get('password'));

    if (!/^F109.+/.test(admissionNumber)) {
      setStatus('Your admission number must begin with F109.', true);
      return;
    }

    setBusy(form, true);
    setStatus('Creating your account…');
    try {
      const { data, error } = await window.campushub.auth.signUp({
        email,
        password,
        options: {
          data: {
            campushub_username: username,
            campushub_admission_number: admissionNumber
          }
        }
      });
      if (error) throw error;

      if (data.session && data.user) {
        await continueIntoCampusHub(data.user);
      } else {
        switchMode('signin');
        resendButton.dataset.email = email;
        resendButton.hidden = false;
        setStatus('Account created. Check your email and follow the confirmation link. Sign in here if you are asked.');
      }
    } catch (error) {
      if (isDuplicateAdmissionError(error)) {
        setStatus('That admission number is already in use. Check the number or contact the administrator.', true);
      } else {
        setStatus(error.message || 'We could not create your account. Please review your details and try again.', true);
      }
    } finally {
      setBusy(form, false);
    }
  }

  async function resendConfirmation() {
    const emailInput = signUpForm.hidden ? signInForm.elements.email : signUpForm.elements.email;
    const email = resendButton.dataset.email || emailInput.value.trim();
    if (!email) return;
    resendButton.disabled = true;
    setStatus('Requesting another confirmation email…');
    try {
      const { error } = await window.campushub.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setStatus('If Supabase can send to this address, a new confirmation email is on its way. Check your inbox and spam folder.');
    } catch (error) {
      setStatus(error.message || 'Supabase could not resend the email. Check the project email settings.', true);
    } finally {
      resendButton.disabled = false;
    }
  }

  signInTab.addEventListener('click', () => switchMode('signin'));
  signUpTab.addEventListener('click', () => switchMode('signup'));
  signInForm.addEventListener('submit', handleSignIn);
  signUpForm.addEventListener('submit', handleSignUp);
  resendButton.addEventListener('click', resendConfirmation);
  for (const emailInput of [signInForm.elements.email, signUpForm.elements.email]) {
    emailInput.addEventListener('input', () => {
      resendButton.dataset.email = emailInput.value.trim();
      resendButton.hidden = !emailInput.value.trim();
    });
  }

  if (setupReason === 'access') setStatus('This account does not have administrator access yet. The owner access row must be added in Supabase first.', true);
  if (setupReason === 'profile') setStatus('We could not finish this student profile. Check the admission number or contact the administrator.', true);
  if (setupReason === 'connection') setStatus('CampusHub could not reach the project. Check the publishable key and connection settings.', true);

  if (window.campushubSetupNeeded || !window.campushub) {
    setupMessage.hidden = false;
    for (const form of [signInForm, signUpForm]) {
      form.querySelectorAll('input, button').forEach((control) => { control.disabled = true; });
    }
    setStatus('After adding the publishable key, this sign-in page will connect to your project.');
    return;
  }

  window.campushub.auth.getSession().then(({ data, error }) => {
    if (!error && data.session) continueIntoCampusHub(data.session.user).catch((err) => setStatus(err.message, true));
  });
})();
