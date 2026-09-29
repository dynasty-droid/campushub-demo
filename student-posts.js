(() => {
  const supabase = window.campushub;
  const announcementTrack = document.querySelector('.horizontal-slides:not(.update-slides)');
  const updateTrack = document.querySelector('.update-slides');
  const slideTemplate = announcementTrack?.querySelector('.announcement-slide');
  const quickSection = document.querySelector('.quick-links-section');
  const quickTemplate = quickSection?.querySelector('.quick-link-preview');
  const quickDots = (track, count) => {
    const dots = track?.nextElementSibling;
    if (!dots) return;
    dots.replaceChildren();
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('span');
      if (i === 0) dot.className = 'active';
      dots.append(dot);
    }
  };

  function emptySlide(track, className, title, detail) {
    const card = document.createElement('article');
    card.className = `info-slide ${className}`;
    const heading = document.createElement('h3');
    heading.textContent = title;
    const text = document.createElement('p');
    text.textContent = detail;
    card.append(heading, text);
    track.replaceChildren(card);
    quickDots(track, 1);
  }

  function renderPosts(posts) {
    const announcements = posts.filter(post => post.kind === 'announcement');
    const updates = posts.filter(post => post.kind === 'update');
    const links = posts.filter(post => post.kind === 'quick_link');

    if (announcements.length) {
      const cards = announcements.map(post => makeSlide(post, 'announcement-slide', 'ANNOUNCEMENT'));
      announcementTrack.replaceChildren(...cards);
      quickDots(announcementTrack, cards.length);
    } else {
      emptySlide(announcementTrack, 'announcement-slide', 'No announcements yet', 'New class announcements shared by the administrator or an approved agent will appear here.');
    }

    if (updates.length) {
      const cards = updates.map(post => makeSlide(post, 'update-slide', 'CAMPUS UPDATE'));
      updateTrack.replaceChildren(...cards);
      quickDots(updateTrack, cards.length);
    } else {
      emptySlide(updateTrack, 'update-slide', 'No updates yet', 'Important student updates will appear here when they are shared.');
    }

    quickSection.querySelectorAll('.quick-link-preview').forEach(card => card.remove());
    if (!links.length) {
      const empty = document.createElement('article');
      empty.className = 'quick-link-preview quick-links-empty';
      const copy = document.createElement('div');
      copy.className = 'quick-link-copy';
      const title = document.createElement('h3');
      title.textContent = 'No class links shared yet';
      const text = document.createElement('p');
      text.textContent = 'When your administrator or an approved agent shares a class link, it will appear here.';
      copy.append(title, text);
      empty.append(copy);
      quickSection.append(empty);
      return;
    }
    links.forEach(post => {
      const card = quickTemplate.cloneNode(true);
      card.dataset.postId = post.id;
      card.querySelector('.preview-tag')?.remove();
      const title = card.querySelector('h3');
      const text = card.querySelector('p');
      title.textContent = post.title;
      text.textContent = post.body || 'Open the class link below.';
      const anchor = document.createElement('a');
      anchor.className = 'shared-class-link';
      anchor.textContent = 'Open class link ↗';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      try {
        const url = new URL(post.link_url);
        if (url.protocol !== 'https:') throw new Error('Only secure links are accepted');
        anchor.href = url.href;
      } catch {
        anchor.textContent = 'This link is unavailable';
        anchor.setAttribute('aria-disabled', 'true');
      }
      text.after(anchor);
      quickSection.append(card);
      window.wireCampusHubEngagement?.(card);
    });
  }

  function makeSlide(post, className, tag) {
    const card = slideTemplate.cloneNode(true);
    card.dataset.postId = post.id;
    card.classList.remove('announcement-slide', 'update-slide');
    card.classList.add(className, 'engagement-card');
    card.querySelector('.slide-tag').textContent = tag;
    card.querySelector('.preview-tag')?.remove();
    card.querySelector('h3').textContent = post.title;
    card.querySelector('p').textContent = post.body || '';
    window.wireCampusHubEngagement?.(card);
    return card;
  }

  async function loadPosts() {
    const { data, error } = await supabase.from('campus_posts')
      .select('id,kind,title,body,link_url,published_at')
      .lte('published_at', new Date().toISOString())
      .in('kind', ['announcement', 'update', 'quick_link'])
      .order('published_at', { ascending: false }).limit(50);
    if (error) {
      console.error('CampusHub student posts could not be loaded:', error.message);
      emptySlide(announcementTrack, 'announcement-slide', 'Posts are temporarily unavailable', 'Refresh this page in a moment to try again.');
      return;
    }
    renderPosts(data || []);
  }

  window.campushubAppReady?.then(ready => {
    if (!ready) return;
    loadPosts();
    supabase.channel('campushub-student-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_posts' }, loadPosts)
      .subscribe();
  });
})();
