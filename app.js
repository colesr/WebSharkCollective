const STORAGE_KEY = 'websharkcollective-state-v2';

const defaultState = {
  user: {
    email: '',
    loggedIn: false,
    displayName: '',
    handle: '',
    bio: '',
    location: '',
    identity: 'anonymous',
  },
  sortBy: 'newest',
  posts: [],
};

const elements = {
  identityChoices: document.getElementById('identityChoices'),
  identityBadge: document.getElementById('identityBadge'),
  composerIdentity: document.getElementById('composerIdentity'),
  profileName: document.getElementById('profileName'),
  profileHandle: document.getElementById('profileHandle'),
  avatarRing: document.getElementById('avatarRing'),
  authSummary: document.getElementById('authSummary'),
  profileForm: document.getElementById('profileForm'),
  displayName: document.getElementById('displayName'),
  handle: document.getElementById('handle'),
  bio: document.getElementById('bio'),
  location: document.getElementById('location'),
  loginDialog: document.getElementById('loginDialog'),
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  postForm: document.getElementById('postForm'),
  postTitle: document.getElementById('postTitle'),
  postBody: document.getElementById('postBody'),
  postTag: document.getElementById('postTag'),
  postIdentity: document.getElementById('postIdentity'),
  sortPosts: document.getElementById('sortPosts'),
  postList: document.getElementById('postList'),
  openLoginBtn: document.getElementById('openLoginBtn'),
  newPostBtn: document.getElementById('newPostBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  resetDemoBtn: document.getElementById('resetDemoBtn'),
};

function seedState() {
  return structuredClone(defaultState);
}

function normalizePost(post) {
  return {
    id: post.id ?? crypto.randomUUID(),
    createdAt: post.createdAt ?? Date.now(),
    title: String(post.title ?? ''),
    body: String(post.body ?? ''),
    tag: String(post.tag ?? 'Discussion'),
    authorLabel: String(post.authorLabel ?? 'Anonymous'),
    authorMeta: String(post.authorMeta ?? 'Anonymous post'),
    votes: Number.isFinite(post.votes) ? post.votes : 0,
    comments: Number.isFinite(post.comments) ? post.comments : 0,
    replies: Array.isArray(post.replies)
      ? post.replies.map((reply) => ({
          id: reply.id ?? crypto.randomUUID(),
          author: String(reply.author ?? 'Anonymous'),
          body: String(reply.body ?? ''),
          createdAt: reply.createdAt ?? Date.now(),
        }))
      : [],
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return seedState();
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...seedState(),
      ...parsed,
      user: {
        ...seedState().user,
        ...(parsed.user ?? {}),
      },
      sortBy: parsed.sortBy ?? seedState().sortBy,
      posts: Array.isArray(parsed.posts) ? parsed.posts.map(normalizePost) : seedState().posts,
    };
  } catch {
    return seedState();
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sortPosts(posts) {
  const items = [...posts];
  if (state.sortBy === 'top') {
    return items.sort((left, right) => right.votes - left.votes);
  }
  if (state.sortBy === 'discussion') {
    return items.sort((left, right) => (right.comments ?? 0) - (left.comments ?? 0));
  }
  return items.sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0));
}

function identityLabel(identity) {
  if (identity === 'full') return 'Profile details visible';
  if (identity === 'handle') return 'Handle visible';
  return 'Anonymous';
}

function profileDisplayName() {
  if (state.user.displayName.trim()) return state.user.displayName.trim();
  if (state.user.handle.trim()) return state.user.handle.trim();
  return 'Anonymous';
}

function profileSecondaryLabel() {
  if (!state.user.loggedIn) return 'Local-only mode';
  if (state.user.identity === 'full') {
    const pieces = [state.user.handle.trim(), state.user.location.trim()].filter(Boolean);
    return pieces.length ? pieces.join(' · ') : 'Profile details shared';
  }
  if (state.user.identity === 'handle') {
    return state.user.handle.trim() || 'Handle active';
  }
  return 'Identity hidden on posts';
}

function postAuthorFor(identity) {
  if (identity === 'full') {
    const name = state.user.displayName.trim() || state.user.handle.trim() || 'Anonymous';
    const metaParts = [state.user.location.trim(), state.user.bio.trim().slice(0, 42)].filter(Boolean);
    return {
      label: name,
      meta: metaParts.length ? metaParts.join(' · ') : 'Profile details shared',
    };
  }

  if (identity === 'handle') {
    return {
      label: state.user.handle.trim() || state.user.displayName.trim() || 'Member',
      meta: 'Handle visible',
    };
  }

  return {
    label: 'Anonymous',
    meta: 'Anonymous post',
  };
}

function commenterLabel() {
  if (state.user.identity === 'full') {
    return state.user.displayName.trim() || state.user.handle.trim() || 'Anonymous';
  }
  if (state.user.identity === 'handle') {
    return state.user.handle.trim() || state.user.displayName.trim() || 'Member';
  }
  return 'Anonymous';
}

function renderProfile() {
  const displayName = profileDisplayName();
  elements.profileName.textContent = displayName;
  elements.profileHandle.textContent = profileSecondaryLabel();
  elements.avatarRing.textContent = displayName.charAt(0).toUpperCase();
  elements.identityBadge.textContent = identityLabel(state.user.identity);
  elements.composerIdentity.textContent = identityLabel(elements.postIdentity.value);
  elements.authSummary.textContent = state.user.loggedIn
    ? `Local login active as ${state.user.email}. Posting and commenting stay available with or without login.`
    : 'Local login is optional. You can post and comment without signing in.';
  elements.openLoginBtn.textContent = state.user.loggedIn ? 'Local login active' : 'Local login';

  elements.displayName.value = state.user.displayName;
  elements.handle.value = state.user.handle;
  elements.bio.value = state.user.bio;
  elements.location.value = state.user.location;

  document.querySelectorAll('input[name="identity"]').forEach((input) => {
    input.checked = input.value === state.user.identity;
  });

  elements.postIdentity.value = state.user.identity;
  elements.sortPosts.value = state.sortBy;
}

function renderPosts() {
  if (!state.posts.length) {
    elements.postList.innerHTML = `
      <article class="empty-state">
        <h3>No posts yet</h3>
        <p>Start the first conversation in WebSharkCollective.</p>
      </article>
    `;
    return;
  }

  elements.postList.innerHTML = sortPosts(state.posts)
    .map(
      (post) => `
        <article class="post">
          <div class="post-head">
            <div>
              <div class="post-kicker"><span class="vote-pill">${escapeHtml(post.tag)}</span><span>${escapeHtml(post.authorMeta)}</span></div>
              <h3 class="post-title">${escapeHtml(post.title)}</h3>
            </div>
            <span class="status-pill">${escapeHtml(post.authorLabel)}</span>
          </div>
          <p class="post-body">${escapeHtml(post.body)}</p>
          <div class="post-actions">
            <div class="post-meta">
              <span>${post.votes} upvotes</span>
              <span>${post.comments} comments</span>
            </div>
            <button class="ghost-button js-toggle-comments" type="button" data-post-id="${post.id}">Comments</button>
          </div>
          <div class="comment-thread hidden" id="comments-${post.id}">
            <div class="comment-list">
              ${(post.replies ?? []).map((reply) => `
                <article class="comment">
                  <strong>${escapeHtml(reply.author)}</strong>
                  <p>${escapeHtml(reply.body)}</p>
                </article>
              `).join('')}
            </div>
            <form class="comment-form" data-post-id="${post.id}">
              <input type="text" name="comment" maxlength="180" placeholder="Add a thoughtful comment" />
              <button class="primary-button" type="submit">Reply</button>
            </form>
          </div>
        </article>
      `,
    )
    .join('');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function syncState() {
  saveState();
  renderProfile();
  renderPosts();
}

elements.identityChoices.addEventListener('change', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.name === 'identity') {
    state.user.identity = event.target.value;
    syncState();
  }
});

elements.profileForm.addEventListener('input', () => {
  state.user.displayName = elements.displayName.value;
  state.user.handle = elements.handle.value;
  state.user.bio = elements.bio.value;
  state.user.location = elements.location.value;
  syncState();
});

elements.postIdentity.addEventListener('change', () => {
  elements.composerIdentity.textContent = identityLabel(elements.postIdentity.value);
});

elements.sortPosts.addEventListener('change', () => {
  state.sortBy = elements.sortPosts.value;
  syncState();
});

elements.postList.addEventListener('click', (event) => {
  const button = event.target.closest('.js-toggle-comments');
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const postId = button.dataset.postId;
  const thread = document.getElementById(`comments-${postId}`);
  if (thread) {
    thread.classList.toggle('hidden');
  }
});

elements.postList.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.classList.contains('comment-form')) {
    return;
  }

  event.preventDefault();
  const postId = form.dataset.postId;
  const input = form.elements.namedItem('comment');
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const body = input.value.trim();
  if (!postId || !body) {
    return;
  }

  const post = state.posts.find((item) => item.id === postId);
  if (!post) {
    return;
  }

  const author = commenterLabel();

  post.replies = post.replies ?? [];
  post.replies.unshift({
    id: crypto.randomUUID(),
    author,
    body,
    createdAt: Date.now(),
  });
  post.comments = (post.comments ?? 0) + 1;
  input.value = '';
  syncState();
});

elements.openLoginBtn.addEventListener('click', () => elements.loginDialog.showModal());
elements.newPostBtn.addEventListener('click', () => elements.postTitle.focus());
elements.logoutBtn.addEventListener('click', () => {
  state.user.loggedIn = false;
  state.user.email = '';
  syncState();
});

elements.resetDemoBtn.addEventListener('click', () => {
  state = seedState();
  localStorage.removeItem(STORAGE_KEY);
  syncState();
});

elements.loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.user.loggedIn = true;
  state.user.email = elements.loginEmail.value.trim();
  if (!state.user.displayName.trim()) {
    state.user.displayName = 'Member';
  }
  if (!state.user.handle.trim()) {
    const slug = state.user.email.split('@')[0]?.replace(/[^a-z0-9]+/gi, '').toLowerCase() || 'member';
    state.user.handle = `@${slug}`;
  }
  syncState();
  elements.loginDialog.close();
  elements.loginForm.reset();
  elements.postIdentity.focus();
});

elements.postForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = elements.postTitle.value.trim();
  const body = elements.postBody.value.trim();

  if (!title || !body) {
    return;
  }

  const author = postAuthorFor(elements.postIdentity.value);
  state.posts.unshift({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    title,
    body,
    tag: elements.postTag.value,
    authorLabel: author.label,
    authorMeta: author.meta,
    votes: 0,
    comments: 0,
    replies: [],
  });

  elements.postForm.reset();
  elements.postIdentity.value = state.user.identity;
  elements.composerIdentity.textContent = identityLabel(state.user.identity);
  state.user.identity = elements.postIdentity.value;
  syncState();
});

syncState();