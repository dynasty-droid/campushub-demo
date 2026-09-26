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

document.querySelector('.save-event').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const saved = button.getAttribute('aria-pressed') === 'true';
  button.setAttribute('aria-pressed', String(!saved));
  button.textContent = saved ? '♡' : '♥';
  showMessage(saved ? 'Event removed from saved events.' : 'Event saved.');
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
  const isTimetable = screen === 'timetable';
  document.querySelector('#home-screen').hidden = isTimetable;
  document.querySelector('#timetable-screen').hidden = !isTimetable;
  document.querySelectorAll('.bottom-nav [data-screen]').forEach((button) => {
    button.classList.toggle('active', button.dataset.screen === screen);
    if (button.dataset.screen === screen) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-screen]').forEach((button) => {
  button.addEventListener('click', () => showScreen(button.dataset.screen));
});

document.querySelectorAll('[data-day]').forEach((button) => {
  button.addEventListener('click', () => renderSchedule(button.dataset.day));
});

renderSchedule('monday');
