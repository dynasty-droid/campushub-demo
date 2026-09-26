(() => {
  const supabase = window.campushub;
  const kindSelect = document.querySelector('#post-kind');
  const form = document.querySelector('#post-form');
  const success = document.querySelector('#post-success');
  const linkInput = document.querySelector('#post-link');
  const linkWrap = document.querySelector('#post-link-wrap');
  const activity = document.querySelector('#activity-list');
  const cancelEdit = document.querySelector('#cancel-post-edit');
  const submitButton = document.querySelector('#post-submit');
  const pages = [...document.querySelectorAll('.page')];
  let editingId = null;
  let posts = [];

  const labels = { announcement: 'Announcement', update: 'Update', quick_link: 'Quick link' };
  const icons = { announcement: '!', update: '↻', quick_link: '↗' };
  const permission = { announcement: 'can_announce', update: 'can_update', quick_link: 'can_share_links' };
  const permissionName = { announcement: 'announcements', update: 'updates', quick_link: 'quick_links' };
  const staff = () => window.campushubStaff;
  const canPost = (kind) => {
    const current = staff();
    return current && (current.role === 'owner' || (current.role === 'administrator' && current.full_access) || current[permission[kind]] === true);
  };

  function openPage(name) {
    if (name === 'people' && staff()?.role === 'agent') return;
    pages.forEach(page => page.classList.toggle('active', page.id === `${name}-page`));
    document.querySelectorAll('[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showMessage(message, isError = false) {
    success.textContent = message;
    success.classList.toggle('show', Boolean(message));
    success.style.background = isError ? '#fff0ef' : '';
    success.style.color = isError ? '#9a3c33' : '';
  }

  function updateKindUI() {
    const quick = kindSelect.value === 'quick_link';
    linkWrap.hidden = !quick;
    linkInput.required = quick;
    showMessage('');
  }

  function resetEditor() {
    editingId = null;
    form.reset();
    cancelEdit.hidden = true;
    submitButton.innerHTML = 'Publish to students <span aria-hidden="true">→</span>';
    form.querySelector('h2').textContent = 'New student post';
    updateKindUI();
  }

  function canManage(post) {
    const current = staff();
    if (!current) return false;
    const manageAll = current.role === 'owner' || (current.role === 'administrator' && current.full_access);
    return canPost(post.kind) && (manageAll || post.author_id === window.campushubUser?.id);
  }

  function renderPosts() {
    activity.replaceChildren();
    if (!posts.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Your shared posts will appear here.';
      activity.append(empty);
    }
    posts.forEach(post => {
      const item = document.createElement('article');
      item.className = 'activity';
      const icon = document.createElement('span');
      icon.className = 'activity-icon';
      icon.textContent = icons[post.kind] || '•';
      const copy = document.createElement('div');
      copy.style.flex = '1';
      const heading = document.createElement('strong');
      heading.textContent = `${labels[post.kind] || 'Post'}: ${post.title}`;
      const description = document.createElement('p');
      description.textContent = post.body || post.link_url || 'Shared with students.';
      const time = document.createElement('time');
      time.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(post.published_at));
      copy.append(heading, description, time);
      item.append(icon, copy);

      if (canManage(post)) {
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '6px';
        const edit = document.createElement('button');
        edit.type = 'button'; edit.className = 'button'; edit.textContent = 'Edit';
        edit.addEventListener('click', () => beginEdit(post));
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'button'; remove.textContent = 'Delete';
        remove.addEventListener('click', () => deletePost(post));
        controls.append(edit, remove);
        item.append(controls);
      }
      activity.append(item);
    });

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    document.querySelector('#published-count').textContent = posts.filter(post => new Date(post.published_at).getTime() >= weekAgo).length;
  }

  async function loadPosts() {
    const { data, error } = await supabase.from('campus_posts')
      .select('id,kind,title,body,link_url,author_id,published_at,created_at')
      .order('published_at', { ascending: false }).limit(50);
    if (error) {
      activity.textContent = 'Could not load shared posts. Please refresh and try again.';
      console.error('CampusHub posts could not be loaded:', error.message);
      return;
    }
    posts = data || [];
    renderPosts();
  }

  async function loadAgentCount() {
    if (staff()?.role !== 'owner') return;
    const { count, error } = await supabase.from('staff_access')
      .select('user_id', { count: 'exact', head: true }).eq('role', 'agent');
    if (!error) document.querySelector('#agent-count').textContent = count ?? 0;
  }

  function beginEdit(post) {
    editingId = post.id;
    kindSelect.value = post.kind;
    document.querySelector('#post-title').value = post.title;
    document.querySelector('#post-message').value = post.body || '';
    linkInput.value = post.link_url || '';
    cancelEdit.hidden = false;
    submitButton.textContent = 'Save changes';
    form.querySelector('h2').textContent = 'Edit student post';
    updateKindUI();
    openPage('publish');
    showMessage('Edit the details, then save your changes.');
    document.querySelector('#post-title').focus();
  }

  async function deletePost(post) {
    if (!window.confirm(`Delete “${post.title}”? Students will no longer see it.`)) return;
    const { error } = await supabase.from('campus_posts').delete().eq('id', post.id);
    if (error) {
      window.alert('The post could not be deleted. Your access may have changed.');
      console.error('CampusHub post delete failed:', error.message);
      return;
    }
    if (editingId === post.id) resetEditor();
    await loadPosts();
  }

  async function submitPost(event) {
    event.preventDefault();
    if (!canPost(kindSelect.value)) {
      showMessage('Your account does not have permission to publish this post type.', true);
      return;
    }
    const title = document.querySelector('#post-title').value.trim();
    const body = document.querySelector('#post-message').value.trim();
    const link = linkInput.value.trim();
    if (kindSelect.value === 'quick_link') {
      try {
        if (new URL(link).protocol !== 'https:') throw new Error('https required');
      } catch {
        showMessage('Please paste a complete secure link that starts with https://.', true);
        linkInput.focus();
        return;
      }
    }
    const values = { kind: kindSelect.value, title, body, link_url: kindSelect.value === 'quick_link' ? link : null };
    submitButton.disabled = true;
    showMessage(editingId ? 'Saving your changes…' : 'Sharing with students…');
    const query = editingId
      ? supabase.from('campus_posts').update(values).eq('id', editingId)
      : supabase.from('campus_posts').insert({ ...values, author_id: window.campushubUser.id });
    const { error } = await query;
    submitButton.disabled = false;
    if (error) {
      console.error('CampusHub post save failed:', error.message);
      const reason = error.code === '42501' ? 'Your account is not allowed to share this type of post.' : 'The post could not be saved. Check your connection and try again.';
      showMessage(reason, true);
      return;
    }
    const message = editingId ? 'Your changes have been saved.' : 'Published. Students can see this post on Home now.';
    resetEditor();
    showMessage(message);
    await loadPosts();
  }

  async function start() {
    const ready = await window.campushubAdminReady;
    if (!ready) return;
    document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => openPage(button.dataset.page)));
    document.querySelectorAll('[data-goto]').forEach(button => button.addEventListener('click', () => {
      openPage(button.dataset.goto);
      if (button.dataset.kind) { kindSelect.value = button.dataset.kind; updateKindUI(); }
    }));
    if (staff().role === 'agent') {
      [...kindSelect.options].forEach(option => { if (!canPost(option.value)) option.remove(); });
    } else if (staff().role === 'administrator' && !staff().full_access) {
      [...kindSelect.options].forEach(option => { if (!canPost(option.value)) option.remove(); });
    }
    kindSelect.addEventListener('change', updateKindUI);
    form.addEventListener('submit', submitPost);
    form.addEventListener('reset', () => setTimeout(() => { editingId = null; cancelEdit.hidden = true; submitButton.innerHTML = 'Publish to students <span aria-hidden="true">→</span>'; form.querySelector('h2').textContent = 'New student post'; updateKindUI(); }, 0));
    cancelEdit.addEventListener('click', resetEditor);
    updateKindUI();
    await loadPosts();
    await loadAgentCount();
    supabase.channel('campushub-admin-posts').on('postgres_changes', { event: '*', schema: 'public', table: 'campus_posts' }, loadPosts).subscribe();
  }

  start();
})();
