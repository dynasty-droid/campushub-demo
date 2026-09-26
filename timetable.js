const timetable = {
  monday: [
    { start: '4:00 PM', end: '5:00 PM', unit: 'UCU 111', name: 'UCU 111', venue: 'AZ 39' },
    { start: '5:00 PM', end: '7:00 PM', unit: 'CCM 101', name: 'CCM 101', venue: 'AZ 40' }
  ],
  tuesday: [
    { start: '11:00 AM', end: '12:00 PM', unit: 'CCM 102', name: 'CCM 102', venue: '(e)' },
    { start: '1:00 PM', end: '2:00 PM', unit: 'CCM 104', name: 'CCM 104', venue: '(e)' }
  ],
  wednesday: [
    { start: '9:00 AM', end: '10:00 AM', unit: 'CCM 100', name: 'CCM 100', venue: '(e)' },
    { start: '11:00 AM', end: '1:00 PM', unit: 'CCM 105', name: 'CCM 105', venue: 'OML 3' },
    { start: '4:00 PM', end: '5:00 PM', unit: 'UCU 110', name: 'UCU 110', venue: 'AZ 39' }
  ],
  thursday: [
    { start: '8:00 AM', end: '9:00 AM', unit: 'CCM 101', name: 'CCM 101', venue: '(e)' },
    { start: '9:00 AM', end: '11:00 AM', unit: 'CCM 102', name: 'CCM 102', venue: 'OML 6' },
    { start: '6:00 PM', end: '7:00 PM', unit: 'UCU 111', name: 'UCU 111', venue: '(e)' }
  ],
  friday: [
    { start: '7:00 AM', end: '9:00 AM', unit: 'CCM 104', name: 'CCM 104', venue: 'HHA2' },
    { start: '1:00 PM', end: '3:00 PM', unit: 'CCM 100', name: 'CCM 100', venue: 'OML2' },
    { start: '6:00 PM', end: '7:00 PM', unit: 'UCU 111', name: 'UCU 111', venue: '(e)' }
  ]
};

const dayNames = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday' };
const classList = document.querySelector('#class-list');

function renderDay(day) {
  const classes = timetable[day];
  document.querySelectorAll('[data-day]').forEach((button) => {
    const selected = button.dataset.day === day;
    button.classList.toggle('active', selected);
    if (button.classList.contains('day-tab')) {
      if (selected) button.setAttribute('aria-current', 'date');
      else button.removeAttribute('aria-current');
    }
  });
  document.querySelector('#selected-label').textContent = dayNames[day].toUpperCase();
  document.querySelector('#selected-title').textContent = `${dayNames[day]} classes`;
  document.querySelector('#class-count').textContent = `${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`;

  classList.innerHTML = classes.map((item) => `
    <article class="class-row">
      <div class="class-time"><strong>${item.start}</strong><span>Ends ${item.end}</span></div>
      <div class="class-marker" aria-hidden="true"></div>
      <div class="class-main"><span class="unit-code">${item.unit}</span><h3>${item.name}</h3></div>
      <div class="venue ${item.venue === '(e)' ? 'online' : ''}">${item.venue}</div>
    </article>`).join('');
}

document.querySelectorAll('[data-day]').forEach((button) => {
  button.addEventListener('click', () => renderDay(button.dataset.day));
});

renderDay('monday');
