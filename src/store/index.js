// Data Store (API Integrated)
export const store = {
  lists: JSON.parse(localStorage.getItem('ink_lists')) || { favorites: [], wantToRead: [] },
  currentUser: JSON.parse(localStorage.getItem('ink_current_user')) || null,
  currentReader: JSON.parse(localStorage.getItem('ink_current_reader')) || null,
  darkMode: JSON.parse(localStorage.getItem('ink_dark_mode')) || false,
  follows: [],
  bookmarks: [],
  readingHistory: [],

  saveLocal() {
    localStorage.setItem('ink_lists', JSON.stringify(this.lists));
    localStorage.setItem('ink_current_user', JSON.stringify(this.currentUser));
    localStorage.setItem('ink_current_reader', JSON.stringify(this.currentReader));
    localStorage.setItem('ink_dark_mode', JSON.stringify(this.darkMode));
  },

  async init() {
    if (this.darkMode) document.body.classList.add('dark-mode');
    if (this.currentUser) await this.loadUserData();
    if (this.currentReader) await this.loadReaderData();
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

  async loadReaderData() {
    if (!this.currentReader) return;
    try {
      this.bookmarks = await this.readerApiFetch('/api/interactions/bookmarks');
      this.readingHistory = await this.readerApiFetch('/api/interactions/history');
      this.follows = await this.readerApiFetch('/api/interactions/following');
    } catch (e) {
      console.error('Failed to load reader data', e);
    }
  },

  async apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('ink_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
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
    } catch (err) {
      // Handle network errors
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        throw new Error('Unable to connect to server. Please ensure the server is running.');
      }
      throw err;
    }
  },

  async readerApiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('ink_reader_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(path, { headers: { ...headers, ...(options.headers || {}) }, ...options });

      if (res.status === 401 || res.status === 403) {
        this.currentReader = null;
        localStorage.removeItem('ink_reader_token');
        this.saveLocal();
        if (window.router) window.router.navigate('reader-login');
        throw new Error('Session expired or access denied.');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API Error');
      return data;
    } catch (err) {
      // Handle network errors
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        throw new Error('Unable to connect to server. Please ensure the server is running.');
      }
      throw err;
    }
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
  },

  // Reader authentication
  async readerSignup({ name, email, password, bio, avatar }) {
    const data = await this.readerApiFetch('/api/readers', { method: 'POST', body: JSON.stringify({ name, email, password, bio, avatar }) });
    this.currentReader = data.user;
    localStorage.setItem('ink_reader_token', data.token);
    this.saveLocal();
    await this.loadReaderData();
    return data;
  },

  async readerLogin({ email, password }) {
    const data = await this.readerApiFetch('/api/readers/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    this.currentReader = data.user;
    localStorage.setItem('ink_reader_token', data.token);
    this.saveLocal();
    await this.loadReaderData();
    return data;
  },

  async getReaderProfile(id) {
    return this.readerApiFetch(`/api/readers/${id}`);
  },

  // Reader interactions
  async readerToggleBookmark(bookId, chapterIndex = null) {
    const res = await this.readerApiFetch('/api/interactions/bookmarks', { method: 'POST', body: JSON.stringify({ bookId, chapterIndex }) });
    await this.loadReaderData();
    return res;
  },

  async getReaderBookmarks() {
    return this.readerApiFetch('/api/interactions/bookmarks');
  },

  async readerAddToHistory(bookId, chapterIndex = null) {
    await this.readerApiFetch('/api/interactions/history', { method: 'POST', body: JSON.stringify({ bookId, chapterIndex }) });
    await this.loadReaderData();
  },

  async getReaderHistory() {
    return this.readerApiFetch('/api/interactions/history');
  },

  async readerToggleFollow(authorId) {
    const res = await this.readerApiFetch(`/api/interactions/follow/${authorId}`, { method: 'POST' });
    await this.loadReaderData();
    return res;
  },

  async getReaderFollowing() {
    return this.readerApiFetch('/api/interactions/following');
  },

  async isFollowingAuthor(authorId) {
    try {
      const res = await this.readerApiFetch(`/api/interactions/is-following/${authorId}`);
      return res.isFollowing;
    } catch (e) {
      return false;
    }
  },

  async hasBookmarkForBook(bookId) {
    try {
      const res = await this.readerApiFetch(`/api/interactions/has-bookmark/${bookId}`);
      return res;
    } catch (e) {
      return { hasBookmark: false };
    }
  },

  async rateBook(bookId, rating) {
    return this.readerApiFetch('/api/interactions/ratings', { method: 'POST', body: JSON.stringify({ bookId, rating }) });
  },

  async getUserRatingForBook(bookId) {
    try {
      const res = await this.readerApiFetch(`/api/interactions/ratings/${bookId}`);
      return res.rating;
    } catch (e) {
      return null;
    }
  },

  async deleteRating(bookId) {
    return this.readerApiFetch(`/api/interactions/ratings/${bookId}`, { method: 'DELETE' });
  },

  async getBookAverageRating(bookId) {
    const res = await fetch(`/api/books/${bookId}/ratings`);
    return res.json();
  },

  async getBookDetailedRatings(bookId) {
    return this.apiFetch(`/api/books/${bookId}/ratings/detailed`);
  },

  async getAuthorStatistics() {
    return this.apiFetch('/api/authors/statistics/me');
  }
};
