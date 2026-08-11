const STORAGE_KEY = 'forum-form-state-v1';

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
  posts: [
    {
      id: crypto.randomUUID(),
      title: 'A quieter network is still a network',
      body: 'A good feed can reward attention without demanding performance. Small choices about identity make the space feel more human and less exposed.',
      tag: 'Discussion',
      authorLabel: 'Anonymous',
      authorMeta: 'Posted 18 minutes ago',
      votes: 142,
      comments: 19,
    },
    {
      id: crypto.randomUUID(),
      title: 'Minimalist profiles make trust easier to calibrate',
      body: 'Sometimes a handle is enough. Sometimes a little more context helps the conversation move forward without turning the whole thing into a personal broadcast.',
      tag: 'Update',
      authorLabel: 'quietatlas',
      authorMeta: 'Design / Europe',
      votes: 87,
      comments: 11,
    },
  ],
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
  postList: document.getElementById('postList'),
  openLoginBtn: document.getElementById('openLoginBtn'),
  newPostBtn: document.getElementById('newPostBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  resetDemoBtn: document.getElementById('resetDemoBtn'),
};

function seedState() {
  return structuredClone(defaultState);
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
      posts: Array.isArray(parsed.posts) ? parsed.posts : seedState().posts,
    };
  } catch {
    return seedState();
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function identityLabel(identity) {
  if (identity === 'full') return 'Profile details visible';
  if (identity === 'handle') return 'Handle visible';
  return 'Anonymous';
}

function profileDisplayName() {
  if (state.user.displayName.trim()) return state.user.displayName.trim();
  if (state.user.handle.trim()) return state.user.handle.trim();
  return 'Anonymous Reader';
}

function profileSecondaryLabel() {
  if (!state.user.loggedIn) return 'Not signed in';
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
  if (!state.user.loggedIn) {
    return {
      label: 'Anonymous',
      meta: 'Signed out mode',
    };
  }

  if (identity === 'full') {
    const name = profileDisplayName();
    const metaParts = [state.user.location.trim(), state.user.bio.trim().slice(0, 42)].filter(Boolean);
    return {
      label: name,
      meta: metaParts.length ? metaParts.join(' · ') : 'Profile details shared',
    };
  }

  if (identity === 'handle') {
    return {
      label: state.user.handle.trim() || 'Member',
      meta: 'Handle visible',
    };
  }

  return {
    label: 'Anonymous',
    meta: 'Anonymous post',
  };
}

function renderProfile() {
  const displayName = profileDisplayName();
  elements.profileName.textContent = displayName;
  elements.profileHandle.textContent = profileSecondaryLabel();
  elements.avatarRing.textContent = displayName.charAt(0).toUpperCase();
  elements.identityBadge.textContent = identityLabel(state.user.identity);
  elements.composerIdentity.textContent = identityLabel(elements.postIdentity.value);
  elements.authSummary.textContent = state.user.loggedIn
    ? `Logged in locally as ${state.user.email}. Your profile controls how much identity appears publicly.`
    : 'You are browsing locally without an account.';

  elements.displayName.value = state.user.displayName;
  elements.handle.value = state.user.handle;
  elements.bio.value = state.user.bio;
  elements.location.value = state.user.location;

  document.querySelectorAll('input[name="identity"]').forEach((input) => {
    input.checked = input.value === state.user.identity;
  });

  elements.postIdentity.value = state.user.identity;
}

function renderPosts() {
  elements.postList.innerHTML = state.posts
    .map(
      (post) => `
        <article class="post">
          <div class="post-head">
            <div>
              <div class="post-kicker"><span class="vote-pill">${post.tag}</span><span>${post.authorMeta}</span></div>
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
            <button class="ghost-button" type="button">Keep calm</button>
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
    state.user.displayName = 'Quiet Member';
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
    title,
    body,
    tag: elements.postTag.value,
    authorLabel: author.label,
    authorMeta: author.meta,
    votes: 0,
    comments: 0,
  });

  elements.postForm.reset();
  elements.postIdentity.value = state.user.identity;
  elements.composerIdentity.textContent = identityLabel(state.user.identity);
  state.user.identity = elements.postIdentity.value;
  syncState();
});

syncState();