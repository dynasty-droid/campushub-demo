(() => {
  const supabase = window.campushub;
  const form = document.querySelector('#person-form');
  const accessType = document.querySelector('#access-type');
  const permissionWrap = document.querySelector('#permissions-wrap');
  const inviteChecks = [...permissionWrap.querySelectorAll('[data-permission]')];
  const inviteButton = document.querySelector('#invite-staff-button');
  const status = document.querySelector('#person-success');
  const peopleList = document.querySelector('#people-list');
  const permissionLabels = {
    can_announce: 'Announcements',
    can_update: 'Updates',
    can_share_links: 'Quick links',
    can_share_notes: 'Lecture notes',
    can_edit_timetable: 'Timetable and course details',
  };
  const primaryPermissions = ['can_announce', 'can_update', 'can_share_links'];
  let people = [];

  function message(text, isError = false) {
    status.textContent = text;
    status.classList.toggle('show', Boolean(text));
    status.style.background = isError ? '#fff0ef' : '';
    status.style.color = isError ? '#9a3c33' : '';
  }

  function setInviteOptions() {
    const type = accessType.value;
    const fullAdmin = type === 'full_admin';
    const agent = type === 'agent';
    permissionWrap.hidden = fullAdmin;
    document.querySelector('#permissions-title').textContent = agent ? 'AGENT PERMISSIONS' : 'ADMINISTRATOR PERMISSIONS';
    inviteChecks.forEach(check => {
      check.disabled = agent && primaryPermissions.includes(check.dataset.permission);
      if (agent && primaryPermissions.includes(check.dataset.permission)) check.checked = true;
      if (fullAdmin) check.checked = true;
    });
  }

  function selectedPermissions(container, fullAccess = false) {
    return Object.fromEntries(Object.keys(permissionLabels).map(key => [
      key,
      fullAccess || Boolean(container.querySelector(`[data-permission="${key}"]`)?.checked),
    ]));
  }

  async function invoke(body) {
    const { data, error } = await supabase.functions.invoke('invite-staff', { body });
    if (!error) return data;
    let detail = '';
    try { detail = (await error.context.json())?.error || ''; } catch { /* Keep the general message. */ }
    throw new Error(detail || 'CampusHub could not complete that request. Check your connection and try again.');
  }

  function roleName(person) {
    if (person.role === 'owner') return 'Main administrator';
    if (person.role === 'administrator' && person.full_access) return 'Full administrator';
    if (person.role === 'administrator') return 'Administrator';
    return 'Agent';
  }

  function permissionSummary(person) {
    if (person.role === 'owner' || (person.role === 'administrator' && person.full_access)) return 'Full control of the hub';
    const allowed = Object.keys(permissionLabels).filter(key => person[key]).map(key => permissionLabels[key]);
    return allowed.length ? allowed.join(' · ') : 'No additional permissions';
  }

  function buildEditor(person, record) {
    const editor = document.createElement('form');
    editor.className = 'staff-permission-editor';
    const roleLabel = document.createElement('label');
    roleLabel.className = 'field';
    roleLabel.textContent = 'Access type';
    const roleSelect = document.createElement('select');
    roleSelect.className = 'staff-role-select';
    [
      ['agent', 'Agent · content tools'],
      ['custom_admin', 'Administrator · selected responsibilities'],
      ['full_admin', 'Administrator · full hub access'],
    ].forEach(([value, title]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = title;
      roleSelect.append(option);
    });
    roleSelect.value = person.role === 'agent' ? 'agent' : person.full_access ? 'full_admin' : 'custom_admin';
    roleLabel.append(roleSelect);
    const grid = document.createElement('div');
    grid.className = 'permission-grid staff-edit-permissions';
    Object.entries(permissionLabels).forEach(([key, title]) => {
      const label = document.createElement('label');
      label.className = 'permission';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.permission = key;
      checkbox.checked = Boolean(person[key]);
      const text = document.createElement('span');
      text.textContent = title;
      label.append(checkbox, text);
      grid.append(label);
    });
    const buttons = document.createElement('div');
    buttons.className = 'actions';
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'button'; cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => editor.remove());
    const save = document.createElement('button');
    save.type = 'submit'; save.className = 'button primary'; save.textContent = 'Save access';
    buttons.append(cancel, save);
    const note = document.createElement('p');
    note.className = 'help';
    note.textContent = 'Only the main administrator can make these changes.';
    editor.append(roleLabel, grid, note, buttons);
    function configure() { grid.hidden = roleSelect.value === 'full_admin'; }
    roleSelect.addEventListener('change', configure);
    configure();
    editor.addEventListener('submit', async event => {
      event.preventDefault();
      const selectedRole = roleSelect.value;
      const fullAccess = selectedRole === 'full_admin';
      const nextRole = selectedRole === 'agent' ? 'agent' : 'administrator';
      const savePermissions = selectedPermissions(editor, fullAccess);
      if (nextRole === 'agent' && !Object.values(savePermissions).some(Boolean)) {
        window.alert('Select at least one permission for this agent.');
        return;
      }
      if (!window.confirm(`Save ${roleName({ role: nextRole, full_access: fullAccess })} access for ${person.display_name}?`)) return;
      save.disabled = true;
      try {
        await invoke({ action: 'update', userId: person.user_id, displayName: person.display_name, role: nextRole, fullAccess, permissions: savePermissions });
        await loadPeople();
      } catch (error) {
        window.alert(error.message);
        save.disabled = false;
      }
    });
    record.append(editor);
  }

  function renderPeople() {
    peopleList.replaceChildren();
    if (!people.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No access records were returned.';
      peopleList.append(empty);
      return;
    }
    people.forEach(person => {
      const record = document.createElement('article');
      record.className = 'record staff-record';
      const identity = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = person.user_id === window.campushubUser?.id ? `${person.display_name} · You` : person.display_name;
      const email = document.createElement('small');
      email.textContent = person.email || 'Gmail address unavailable';
      identity.append(name, email);
      const summary = document.createElement('span');
      summary.className = 'record-secondary';
      summary.textContent = permissionSummary(person);
      const badge = document.createElement('span');
      badge.className = person.email_confirmed ? 'role' : 'badge-live';
      badge.textContent = person.role === 'owner' ? 'OWNER' : person.email_confirmed ? roleName(person).toUpperCase() : 'INVITED';
      record.append(identity, summary, badge);

      if (person.role !== 'owner') {
        const actions = document.createElement('div');
        actions.className = 'staff-record-actions';
        const edit = document.createElement('button');
        edit.type = 'button'; edit.className = 'button'; edit.textContent = 'Edit access';
        edit.addEventListener('click', () => {
          if (record.querySelector('.staff-permission-editor')) return;
          buildEditor(person, record);
        });
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'button'; remove.textContent = 'Remove access';
        remove.addEventListener('click', async () => {
          if (!window.confirm(`Remove ${person.display_name}'s CampusHub staff access? Their account and student profile will remain.`)) return;
          remove.disabled = true;
          try {
            await invoke({ action: 'remove', userId: person.user_id });
            await loadPeople();
          } catch (error) {
            window.alert(error.message);
            remove.disabled = false;
          }
        });
        actions.append(edit, remove);
        record.append(actions);
      }
      peopleList.append(record);
    });
  }

  async function loadPeople() {
    peopleList.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'empty'; loading.textContent = 'Loading the access list…'; peopleList.append(loading);
    try {
      const data = await invoke({ action: 'list' });
      people = data.people || [];
      renderPeople();
      const agents = people.filter(person => person.role === 'agent').length;
      document.querySelector('#agent-count').textContent = String(agents);
    } catch (error) {
      peopleList.replaceChildren();
      const failure = document.createElement('div');
      failure.className = 'empty'; failure.textContent = error.message;
      peopleList.append(failure);
    }
  }

  function clearInviteForm() {
    form.reset();
    accessType.value = 'agent';
    setInviteOptions();
  }

  async function invite(event) {
    event.preventDefault();
    const displayName = document.querySelector('#person-name').value.trim();
    const email = document.querySelector('#person-email').value.trim().toLowerCase();
    if (!/^[a-z0-9._%+-]+@gmail\.com$/i.test(email)) {
      message('Enter a Gmail address ending in @gmail.com.', true);
      return;
    }
    const type = accessType.value;
    const fullAccess = type === 'full_admin';
    const role = type === 'agent' ? 'agent' : 'administrator';
    const permissions = selectedPermissions(permissionWrap, fullAccess);
    if (!fullAccess && !Object.values(permissions).some(Boolean)) {
      message('Select at least one permission before sending the invitation.', true);
      return;
    }
    const summary = fullAccess ? 'full administrator access' : Object.keys(permissionLabels).filter(key => permissions[key]).map(key => permissionLabels[key]).join(', ');
    if (!window.confirm(`Invite ${displayName} at ${email} as ${role === 'agent' ? 'an agent' : 'an administrator'} with ${summary}? Their access will apply after they sign in.`)) return;

    inviteButton.disabled = true;
    message('Sending the Gmail invitation…');
    try {
      const result = await invoke({ action: 'invite', displayName, email, role, fullAccess, permissions });
      message(result.message || 'Staff access is ready.');
      clearInviteForm();
      await loadPeople();
    } catch (error) {
      message(error.message, true);
    } finally {
      inviteButton.disabled = false;
    }
  }

  async function start() {
    const ready = await window.campushubAdminReady;
    if (!ready || window.campushubStaff?.role !== 'owner') return;
    accessType.addEventListener('change', setInviteOptions);
    form.addEventListener('submit', invite);
    document.querySelector('#refresh-people').addEventListener('click', loadPeople);
    setInviteOptions();
    await loadPeople();
  }

  start();
})();
