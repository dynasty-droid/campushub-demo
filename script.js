const toast = document.querySelector('.toast');
let toastTimer;

function showMessage(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

document.querySelectorAll('[data-message]').forEach((button) => {
  button.addEventListener('click', () => showMessage(button.dataset.message));
});

document.querySelector('.notification-button').addEventListener('click', () => {
  showMessage('You are all caught up on notifications.');
});

const weeklyClasses = {
  monday: [
    { start: '4:00–5:00 PM', unit: 'UCU 111', venue: 'AZ39' },
    { start: '5:00–7:00 PM', unit: 'CCM 101', venue: 'AZ 40' }
  ],
  tuesday: [
    { start: '11:00 AM–12:00 PM', unit: 'CCM 102', venue: '(e)' },
    { start: '1:00–2:00 PM', unit: 'CCM 104', venue: '(e)' }
  ],
  wednesday: [
    { start: '9:00–10:00 AM', unit: 'CCM 100', venue: '(e)' },
    { start: '11:00 AM–1:00 PM', unit: 'CCM 105', venue: 'OML3' },
    { start: '4:00–5:00 PM', unit: 'UCU 110', venue: 'AZ39' }
  ],
  thursday: [
    { start: '8:00–9:00 AM', unit: 'CCM 101', venue: '(e)' },
    { start: '9:00–11:00 AM', unit: 'CCM 102', venue: 'OML 6' },
    { start: '6:00–7:00 PM', unit: 'UCU 111', venue: '(e)' }
  ],
  friday: [
    { start: '7:00–9:00 AM', unit: 'CCM 104', venue: 'HHA2' },
    { start: '1:00–3:00 PM', unit: 'CCM 100', venue: 'OML2' },
    { start: '6:00–7:00 PM', unit: 'UCU 111', venue: '(e)' }
  ]
};

const dayLabels = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday' };

function renderSchedule(day) {
  const classes = weeklyClasses[day];
  document.querySelectorAll('[data-day]').forEach((button) => {
    button.classList.toggle('active', button.dataset.day === day);
  });
  document.querySelector('#schedule-day-label').textContent = dayLabels[day].toUpperCase();
  document.querySelector('#schedule-day-title').textContent = `${dayLabels[day]} classes`;
  document.querySelector('#schedule-count').textContent = `${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`;
  document.querySelector('#schedule-classes').innerHTML = classes.map((item) => `
    <article class="schedule-class-row">
      <div class="schedule-time"><strong>${item.start}</strong></div>
      <div class="schedule-marker" aria-hidden="true"></div>
      <div class="schedule-class-main"><span class="schedule-unit">${item.unit}</span><h3>${item.unit}</h3></div>
      <div class="schedule-venue ${item.venue === '(e)' ? 'online' : ''}">${item.venue}</div>
    </article>`).join('');
}

function showScreen(screen) {
  const screens = { home: '#home-screen', timetable: '#timetable-screen', profile: '#profile-screen' };
  Object.entries(screens).forEach(([name, selector]) => {
    document.querySelector(selector).hidden = name !== screen;
  });
  document.querySelectorAll('[data-screen]').forEach((button) => {
    button.classList.toggle('active', button.dataset.screen === screen);
    if (button.dataset.screen === screen) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const profileForm = document.querySelector('#profile-form');
const profileNameInput = document.querySelector('#profile-name-input');
const profileAdmissionInput = document.querySelector('#profile-admission-input');
const profilePhotoInput = document.querySelector('#profile-photo-input');
const profilePhotoPreview = document.querySelector('#profile-photo-preview');
let profilePhotoData = '';

function updateProfileSummary(name, admissionNumber, photo = profilePhotoData) {
  document.querySelector('#profile-display-name').textContent = name || 'Choose your name';
  document.querySelector('#profile-display-admission').textContent = admissionNumber || 'Not added';
  document.querySelector('#profile-avatar-initial').textContent = name ? name.trim().charAt(0).toUpperCase() : '?';
  profilePhotoPreview.src = photo || '';
  profilePhotoPreview.hidden = !photo;
  document.querySelector('#profile-avatar-initial').hidden = Boolean(photo);
}

try {
  const savedName = localStorage.getItem('campushubProfileName') || '';
  const savedAdmission = localStorage.getItem('campushubAdmissionNumber') || '';
  profilePhotoData = localStorage.getItem('campushubProfilePhoto') || '';
  profileNameInput.value = savedName;
  profileAdmissionInput.value = savedAdmission;
  updateProfileSummary(savedName, savedAdmission, profilePhotoData);
} catch {
  // Keep the profile usable if browser storage is disabled.
}

profileAdmissionInput.addEventListener('input', () => {
  const cursor = profileAdmissionInput.selectionStart;
  profileAdmissionInput.value = profileAdmissionInput.value.toUpperCase();
  if (cursor !== null) profileAdmissionInput.setSelectionRange(cursor, cursor);
});

profilePhotoInput.addEventListener('change', () => {
  const file = profilePhotoInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    document.querySelector('#profile-save-status').textContent = 'Please choose an image file.';
    profilePhotoInput.value = '';
    return;
  }
  document.querySelector('#profile-save-status').textContent = 'Preparing your photo…';
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      profilePhotoData = canvas.toDataURL('image/jpeg', 0.78);
      updateProfileSummary(profileNameInput.value.trim(), profileAdmissionInput.value.trim(), profilePhotoData);
      try {
        localStorage.setItem('campushubProfilePhoto', profilePhotoData);
        document.querySelector('#profile-save-status').textContent = 'Photo saved on this device. Save your profile details below.';
      } catch {
        document.querySelector('#profile-save-status').textContent = 'Photo selected. Save your profile to keep it on this device.';
      }
    };
    image.onerror = () => { document.querySelector('#profile-save-status').textContent = 'That image could not be opened. Please choose another.'; };
    image.src = reader.result;
  };
  reader.onerror = () => { document.querySelector('#profile-save-status').textContent = 'Could not read that image. Please try another.'; };
  reader.readAsDataURL(file);
});

profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = profileNameInput.value.trim();
  const admissionNumber = profileAdmissionInput.value.trim().toUpperCase();
  if (!name || !admissionNumber) return;
  if (!/^F109.+/.test(admissionNumber)) {
    profileAdmissionInput.setCustomValidity('Your admission number must start with F109. Keep the rest of it as issued.');
    profileAdmissionInput.reportValidity();
    document.querySelector('#profile-save-status').textContent = 'Please enter an admission number that starts with F109.';
    return;
  }
  profileAdmissionInput.setCustomValidity('');
  profileAdmissionInput.value = admissionNumber;
  updateProfileSummary(name, admissionNumber);
  try {
    localStorage.setItem('campushubProfileName', name);
    localStorage.setItem('campushubAdmissionNumber', admissionNumber);
    document.querySelector('#profile-save-status').textContent = 'Saved on this device.';
  } catch {
    document.querySelector('#profile-save-status').textContent = 'Your details are shown for this visit, but this browser could not save them.';
  }
});

document.querySelectorAll('[data-screen]').forEach((button) => {
  button.addEventListener('click', () => showScreen(button.dataset.screen));
});

document.querySelectorAll('[data-day]').forEach((button) => {
  button.addEventListener('click', () => renderSchedule(button.dataset.day));
});

function renderTodayClasses() {
  const timezone = 'Africa/Nairobi';
  const today = new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: timezone }).format(new Date()).toLowerCase();
  const todayDate = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone }).format(new Date());
  const classes = weeklyClasses[today] || [];
  document.querySelector('#today-date').textContent = todayDate.toUpperCase();

  const list = document.querySelector('#home-today-classes');
  if (!classes.length) {
    list.innerHTML = '<div class="today-empty"><span aria-hidden="true">✦</span><div><strong>No classes listed for today</strong><p>Your weekly timetable currently has classes from Monday to Friday.</p></div></div>';
    return;
  }

  list.innerHTML = classes.map((item) => `
    <article class="home-class-card">
      <div class="home-class-time">${item.start}</div>
      <div class="home-class-unit"><strong>${item.unit}</strong></div>
      <span class="home-class-venue ${item.venue === '(e)' ? 'online' : ''}">${item.venue}</span>
    </article>`).join('');
}

document.querySelectorAll('.horizontal-slides').forEach((track) => {
  const dots = track.nextElementSibling?.querySelectorAll('span');
  if (!dots?.length) return;
  track.addEventListener('scroll', () => {
    const activeIndex = track.scrollLeft > 12 ? 1 : 0;
    dots.forEach((dot, index) => dot.classList.toggle('active', index === activeIndex));
  }, { passive: true });
});

renderTodayClasses();
renderSchedule('monday');
