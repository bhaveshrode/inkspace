// Data Store (API Integrated)
export const store = {
  lists: JSON.parse(localStorage.getItem('ink_lists')) || { favorites: [], wantToRead: [] },
  currentUser: JSON.parse(localStorage.getItem('ink_current_user')) || null,
  currentReader: JSON.parse(localStorage.getItem('ink_current_reader')) || null,
  darkMode: JSON.parse(localStorage.getItem('ink_dark_mode')) || false,
  follows: [],
  bookmarks: [],
  readingHistory: [],
  notifications: [],
  unreadNotificationCount: 0,
  notificationPollingInterval: null,

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
      this.follows = await this.apiFetch(`/api/users/${this.currentUser.id}/follows`, { silent: true });
      this.bookmarks = await this.apiFetch(`/api/users/${this.currentUser.id}/bookmarks`, { silent: true });
      this.readingHistory = await this.apiFetch(`/api/users/${this.currentUser.id}/reading`, { silent: true });
    } catch (e) {
      console.error('Failed to load user data', e);
    }
  },

  async loadReaderData() {
    if (!this.currentReader) return;
    try {
      this.bookmarks = await this.readerApiFetch('/api/interactions/bookmarks', { silent: true });
      this.readingHistory = await this.readerApiFetch('/api/interactions/history', { silent: true });
      this.follows = await this.readerApiFetch('/api/interactions/following', { silent: true });
    } catch (e) {
      console.error('Failed to load reader data', e);
    }
  },

  async apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('ink_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const silent = options.silent || false;

    try {
      const res = await fetch(path, { headers: { ...headers, ...(options.headers || {}) }, ...options });

      if (res.status === 401 || res.status === 403) {
        this.currentUser = null;
        localStorage.removeItem('ink_token');
        this.saveLocal();
        if (window.router && !silent) window.router.navigate('author-login');
        // Don't throw error if silent mode (used during initialization)
        if (silent) return null;
        throw new Error('Session expired or access denied.');
      }

      // Handle rate limiting (429 Too Many Requests)
      if (res.status === 429) {
        const data = await res.json();
        throw new Error(data.error || 'Too many requests. Please try again later.');
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
    const silent = options.silent || false;

    try {
      const res = await fetch(path, { headers: { ...headers, ...(options.headers || {}) }, ...options });

      if (res.status === 401 || res.status === 403) {
        this.currentReader = null;
        localStorage.removeItem('ink_reader_token');
        this.saveLocal();
        if (window.router && !silent) window.router.navigate('reader-login');
        // Don't throw error if silent mode (used during initialization)
        if (silent) return null;
        throw new Error('Session expired or access denied.');
      }

      // Handle rate limiting (429 Too Many Requests)
      if (res.status === 429) {
        const data = await res.json();
        throw new Error(data.error || 'Too many requests. Please try again later.');
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
  async updateAuthorProfile(profileData) {
    const data = await this.apiFetch('/api/authors/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    this.currentUser = { ...this.currentUser, ...data };
    this.saveLocal();
    return data;
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

  // Discovery methods
  async getTrendingBooks() {
    const books = await this.apiFetch('/api/books/discover/trending');
    return books.map(b => this._mapWork(b));
  },
  async getHighestRatedBooks() {
    const books = await this.apiFetch('/api/books/discover/highest-rated');
    return books.map(b => this._mapWork(b));
  },
  async getRecentlyUpdatedBooks() {
    const books = await this.apiFetch('/api/books/discover/recently-updated');
    return books.map(b => this._mapWork(b));
  },
  async getCompletedBooks() {
    const books = await this.apiFetch('/api/books/discover/completed');
    return books.map(b => this._mapWork(b));
  },
  async getMostFollowedAuthors() {
    return this.apiFetch('/api/authors/discover/most-followed');
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
  },

  // Reviews API
  async getReviews(bookId) {
    return this.readerApiFetch(`/api/interactions/reviews/${bookId}`);
  },

  async getUserReview(bookId) {
    try {
      return await this.readerApiFetch(`/api/interactions/reviews/${bookId}/user`);
    } catch (e) {
      return null;
    }
  },

  async submitReview(bookId, { rating, title, reviewText }) {
    return this.readerApiFetch('/api/interactions/reviews', {
      method: 'POST',
      body: JSON.stringify({ bookId, rating, title, reviewText })
    });
  },

  async deleteReview(bookId) {
    return this.readerApiFetch(`/api/interactions/reviews/${bookId}`, {
      method: 'DELETE'
    });
  },

  async markReviewHelpful(reviewId) {
    try {
      const result = await this.readerApiFetch(`/api/interactions/reviews/${reviewId}/helpful`, {
        method: 'POST'
      });
      return { success: true, ...result };
    } catch (err) {
      // If 409 conflict, user already voted
      if (err.message.includes('409') || err.message.includes('Already')) {
        return { success: false, alreadyVoted: true, message: 'You have already marked this review as helpful' };
      }
      throw err;
    }
  },

  async getReviewStats(bookId) {
    const res = await fetch(`/api/interactions/reviews/${bookId}/stats`);
    return res.json();
  },

  async getReaderHelpfulVotes(bookId) {
    try {
      const res = await this.readerApiFetch(`/api/interactions/reviews/${bookId}/helpful-votes`);
      return res.votes || [];
    } catch (e) {
      return [];
    }
  },

  async getBookDetailedReviews(bookId) {
    return this.apiFetch(`/api/books/${bookId}/reviews/detailed`);
  },

  // Comments API (enhanced)
  async getCommentsForBook(bookId) {
    try {
      const res = await fetch(`/api/interactions/comments/${bookId}`);
      if (!res.ok) {
        console.error(`Failed to fetch comments: ${res.status}`);
        return [];
      }
      const data = await res.json();
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching comments:', err);
      return [];
    }
  },

  async addCommentAsReader(bookId, text) {
    return this.readerApiFetch('/api/interactions/comments', {
      method: 'POST',
      body: JSON.stringify({ bookId, text })
    });
  },

  async deleteComment(commentId) {
    return this.readerApiFetch(`/api/interactions/comments/${commentId}`, {
      method: 'DELETE'
    });
  },

  async getBookDetailedComments(bookId) {
    return this.apiFetch(`/api/books/${bookId}/comments/detailed`);
  },

  // Author reviews and comments
  async getAuthorReviews() {
    return this.apiFetch('/api/authors/reviews/me');
  },

  async getAuthorComments() {
    return this.apiFetch('/api/authors/comments/me');
  },

  // Author reply to reviews
  async replyToReview(bookId, reviewId, replyText) {
    return this.apiFetch(`/api/books/${bookId}/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ replyText })
    });
  },

  async deleteReviewReply(bookId, reviewId) {
    return this.apiFetch(`/api/books/${bookId}/reviews/${reviewId}/reply`, {
      method: 'DELETE'
    });
  },

  // Author reply to comments
  async replyToComment(bookId, commentId, replyText) {
    return this.apiFetch(`/api/books/${bookId}/comments/${commentId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ replyText })
    });
  },

  async deleteCommentReply(bookId, commentId) {
    return this.apiFetch(`/api/books/${bookId}/comments/${commentId}/reply`, {
      method: 'DELETE'
    });
  },

  // Review Replies (Threaded Conversations)
  async getReviewReplies(reviewId) {
    const res = await fetch(`/api/interactions/reviews/${reviewId}/replies`);
    if (!res.ok) throw new Error('Failed to fetch review replies');
    return res.json();
  },

  async addReviewReply(reviewId, text, bookId = null) {
    // Auto-detect if author or reader
    if (this.currentUser && bookId) {
      // Author reply
      return this.apiFetch(`/api/books/${bookId}/reviews/${reviewId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
    } else if (this.currentReader) {
      // Reader reply
      return this.readerApiFetch(`/api/interactions/reviews/${reviewId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
    } else {
      throw new Error('Not authenticated');
    }
  },

  async deleteReviewReply(reviewId, replyId, bookId = null) {
    // Auto-detect if author or reader
    if (this.currentUser && bookId) {
      // Author delete
      return this.apiFetch(`/api/books/${bookId}/reviews/${reviewId}/replies/${replyId}`, {
        method: 'DELETE'
      });
    } else if (this.currentReader) {
      // Reader delete
      return this.readerApiFetch(`/api/interactions/reviews/${reviewId}/replies/${replyId}`, {
        method: 'DELETE'
      });
    } else {
      throw new Error('Not authenticated');
    }
  },

  // Comment Replies (Threaded Conversations)
  async getCommentReplies(commentId) {
    const res = await fetch(`/api/interactions/comments/${commentId}/replies`);
    if (!res.ok) throw new Error('Failed to fetch comment replies');
    return res.json();
  },

  async addCommentReply(commentId, text, bookId = null) {
    // Auto-detect if author or reader
    if (this.currentUser && bookId) {
      // Author reply
      return this.apiFetch(`/api/books/${bookId}/comments/${commentId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
    } else if (this.currentReader) {
      // Reader reply
      return this.readerApiFetch(`/api/interactions/comments/${commentId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
    } else {
      throw new Error('Not authenticated');
    }
  },

  async deleteCommentReply(commentId, replyId, bookId = null) {
    // Auto-detect if author or reader
    if (this.currentUser && bookId) {
      // Author delete
      return this.apiFetch(`/api/books/${bookId}/comments/${commentId}/replies/${replyId}`, {
        method: 'DELETE'
      });
    } else if (this.currentReader) {
      // Reader delete
      return this.readerApiFetch(`/api/interactions/comments/${commentId}/replies/${replyId}`, {
        method: 'DELETE'
      });
    } else {
      throw new Error('Not authenticated');
    }
  },

  // Notification methods
  async fetchNotifications(limit = 20, offset = 0) {
    try {
      // Use the appropriate fetch method based on who's logged in
      const fetchMethod = this.currentReader ? this.readerApiFetch.bind(this) : this.apiFetch.bind(this);
      const data = await fetchMethod(`/api/notifications?limit=${limit}&offset=${offset}`);
      this.notifications = data;
      return data;
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      return [];
    }
  },

  async fetchUnreadCount() {
    try {
      const fetchMethod = this.currentReader ? this.readerApiFetch.bind(this) : this.apiFetch.bind(this);
      const data = await fetchMethod('/api/notifications/unread-count');
      this.unreadNotificationCount = data.count;
      this.updateNotificationBadge();
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  async markNotificationAsRead(notificationId) {
    try {
      const fetchMethod = this.currentReader ? this.readerApiFetch.bind(this) : this.apiFetch.bind(this);
      await fetchMethod(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      await this.fetchUnreadCount();
      await this.fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  async markAllNotificationsAsRead() {
    try {
      const fetchMethod = this.currentReader ? this.readerApiFetch.bind(this) : this.apiFetch.bind(this);
      await fetchMethod('/api/notifications/mark-all-read', {
        method: 'POST'
      });
      await this.fetchUnreadCount();
      await this.fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  async deleteNotification(notificationId) {
    try {
      const fetchMethod = this.currentReader ? this.readerApiFetch.bind(this) : this.apiFetch.bind(this);
      await fetchMethod(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      await this.fetchNotifications();
      await this.fetchUnreadCount();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  },

  startNotificationPolling() {
    // Clear any existing interval
    if (this.notificationPollingInterval) {
      clearInterval(this.notificationPollingInterval);
    }

    // Only poll if user is logged in
    if (this.currentUser || this.currentReader) {
      // Fetch immediately
      this.fetchUnreadCount();

      // Then poll every 30 seconds
      this.notificationPollingInterval = setInterval(() => {
        if (this.currentUser || this.currentReader) {
          this.fetchUnreadCount();
        } else {
          this.stopNotificationPolling();
        }
      }, 30000); // 30 seconds
    }
  },

  stopNotificationPolling() {
    if (this.notificationPollingInterval) {
      clearInterval(this.notificationPollingInterval);
      this.notificationPollingInterval = null;
    }
    this.unreadNotificationCount = 0;
    this.notifications = [];
    this.updateNotificationBadge();
  },

  updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
      badge.textContent = this.unreadNotificationCount;
      badge.classList.toggle('hidden', this.unreadNotificationCount === 0);
    }
  },

  // Password Reset Methods - Authors
  async requestAuthorPasswordReset(email) {
    const res = await fetch('/api/authors/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to request password reset');
    return data;
  },

  async validateAuthorResetToken(token) {
    const res = await fetch(`/api/authors/password-reset/validate/${token}`);
    const data = await res.json();
    return data.valid;
  },

  async resetAuthorPassword(token, password) {
    const res = await fetch('/api/authors/password-reset/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset password');
    return data;
  },

  // Password Reset Methods - Readers
  async requestReaderPasswordReset(email) {
    const res = await fetch('/api/readers/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to request password reset');
    return data;
  },

  async validateReaderResetToken(token) {
    const res = await fetch(`/api/readers/password-reset/validate/${token}`);
    const data = await res.json();
    return data.valid;
  },

  async resetReaderPassword(token, password) {
    const res = await fetch('/api/readers/password-reset/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset password');
    return data;
  }
};
