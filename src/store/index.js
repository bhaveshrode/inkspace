// Data Store (API Integrated)
export const store = {
  lists: JSON.parse(localStorage.getItem('ink_lists')) || { favorites: [], wantToRead: [] },
  currentUser: JSON.parse(localStorage.getItem('ink_current_user')) || null,
  darkMode: JSON.parse(localStorage.getItem('ink_dark_mode')) || false,
  follows: [],
  bookmarks: [],
  readingHistory: [],

  saveLocal() {
    localStorage.setItem('ink_lists', JSON.stringify(this.lists));
    localStorage.setItem('ink_current_user', JSON.stringify(this.currentUser));
    localStorage.setItem('ink_dark_mode', JSON.stringify(this.darkMode));
  },

  async init() {
    if (this.darkMode) document.body.classList.add('dark-mode');
    if (this.currentUser) await this.loadUserData();
  },

  async loadUserData() {
    if (!this.currentUser) return;
    try {
      this.follows = await this.apiFetch(`/api/users/${this.currentUser.id}/follows`);
      this.bookmarks = await this.apiFetch(`/api/users/${this.currentUser.id}/bookmarks`);
      this.readingHistory = await this.apiFetch(`/api/users/${this.currentUser.id}/reading`);
    } catch (e) {
      console.error('Failed to load user data', e);
    }
  },

  async apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('ink_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(path, { headers: { ...headers, ...(options.headers || {}) }, ...options });

    if (res.status === 401 || res.status === 403) {
      this.currentUser = null;
      localStorage.removeItem('ink_token');
      this.saveLocal();
      if (window.router) window.router.navigate('author-login');
      throw new Error('Session expired or access denied.');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
  },

  async getAuthors() {
    return this.apiFetch('/api/authors');
  },
  async getAuthorById(id) {
    return this.apiFetch(`/api/authors/${id}`);
  },
  async login(email, password) {
    return this.apiFetch('/api/authors/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  async signup(name, email, password) {
    return this.apiFetch('/api/authors', { method: 'POST', body: JSON.stringify({ name, email, password }) });
  },

  _mapWork(w) {
    return w ? { ...w, authorId: w.author_id, createdAt: w.created_at } : null;
  },

  async getWorks() {
    const works = await this.apiFetch('/api/books');
    return works.map(w => this._mapWork(w));
  },
  async getWorkById(id) {
    const work = await this.apiFetch(`/api/books/${id}`);
    return this._mapWork(work);
  },
  async createWork(work) {
    const created = await this.apiFetch('/api/books', { method: 'POST', body: JSON.stringify(work) });
    return this._mapWork(created);
  },
  async updateWork(id, fields) {
    const updated = await this.apiFetch(`/api/books/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
    return this._mapWork(updated);
  },
  async deleteWork(id) {
    return this.apiFetch(`/api/books/${id}`, { method: 'DELETE' });
  },

  async createChapter(bookId, chap) {
    return this.apiFetch(`/api/books/${bookId}/chapters`, { method: 'POST', body: JSON.stringify(chap) });
  },
  async updateChapter(bookId, idx, chap) {
    return this.apiFetch(`/api/books/${bookId}/chapters/${idx}`, { method: 'PUT', body: JSON.stringify(chap) });
  },
  async deleteChapter(bookId, idx) {
    return this.apiFetch(`/api/books/${bookId}/chapters/${idx}`, { method: 'DELETE' });
  },

  async getComments(bookId) {
    return this.apiFetch(`/api/books/${bookId}/comments`);
  },
  async addComment(bookId, user, text) {
    return this.apiFetch(`/api/books/${bookId}/comments`, { method: 'POST', body: JSON.stringify({ user, text }) });
  },

  async toggleFollow(followerId, authorId) {
    const res = await this.apiFetch('/api/follows', { method: 'POST', body: JSON.stringify({ followerId, authorId }) });
    await this.loadUserData();
    return res;
  },
  async toggleBookmark(userId, bookId, chapterIndex) {
    const res = await this.apiFetch('/api/bookmarks', { method: 'POST', body: JSON.stringify({ userId, bookId, chapterIndex }) });
    await this.loadUserData();
    return res;
  },
  async addReading(userId, bookId, chapterIndex) {
    await this.apiFetch('/api/reading', { method: 'POST', body: JSON.stringify({ userId, bookId, chapterIndex }) });
    await this.loadUserData();
  }
};
