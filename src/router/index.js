import { store } from '../store/index.js';
import * as views from '../views/index.js';

export const router = {
  currentPage: 'home',
  params: {},

  navigate(page, params = {}) {
    this.currentPage = page;
    this.params = params;

    // Update URL hash with params for shareable/refreshable URLs
    const queryString = new URLSearchParams(params).toString();
    const newHash = queryString ? `#${page}?${queryString}` : `#${page}`;
    window.location.hash = newHash;

    window.scrollTo(0, 0);
    this.render();
    this.updateNav();
  },

  checkHash() {
    const hash = window.location.hash;
    if (hash === '#/author') {
      if (store.currentUser) this.navigate('author-dashboard');
      else this.navigate('author-login');
    }
  },

  updateNav() {
    const userMenu = document.getElementById('user-menu');
    const readerMenu = document.getElementById('reader-menu');
    const searchContainer = document.getElementById('nav-search-container');
    const notificationBell = document.getElementById('notification-bell');
    const loginAccessBar = document.getElementById('login-access-bar');
    const mainContent = document.getElementById('app');

    if (store.currentUser) {
      // Author is logged in
      userMenu.classList.remove('hidden');
      readerMenu.classList.add('hidden');
      if (loginAccessBar) loginAccessBar.classList.add('hidden');
      if (mainContent) mainContent.style.paddingBottom = '0';
      document.getElementById('user-name').textContent = store.currentUser.name;
      document.getElementById('user-initial').textContent = store.currentUser.name.charAt(0);
    } else if (store.currentReader) {
      // Reader is logged in
      readerMenu.classList.remove('hidden');
      userMenu.classList.add('hidden');
      if (loginAccessBar) loginAccessBar.classList.add('hidden');
      if (mainContent) mainContent.style.paddingBottom = '0';
      document.getElementById('reader-name').textContent = store.currentReader.name;
      document.getElementById('reader-initial').textContent = store.currentReader.name.charAt(0);
    } else {
      // No one is logged in - show fixed bottom login bar
      userMenu.classList.add('hidden');
      readerMenu.classList.add('hidden');
      if (loginAccessBar) loginAccessBar.classList.remove('hidden');
      if (mainContent) mainContent.style.paddingBottom = '4rem';
    }

    if (store.currentUser || store.currentReader) {
      if (notificationBell) {
        notificationBell.classList.remove('hidden');
      }
    } else {
      if (notificationBell) {
        notificationBell.classList.add('hidden');
      }
    }

    if (['home', 'search'].includes(this.currentPage)) searchContainer.classList.remove('hidden');
    else searchContainer.classList.add('hidden');
  },

  async render() {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="text-center py-20"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i></div>';
    try {
      let view;
      switch (this.currentPage) {
        case 'home':
          view = await views.home();
          break;
        case 'work-detail':
          view = await views.workDetail(this.params.id);
          break;
        case 'read':
          view = await views.read(this.params.id, this.params.chapterIndex);
          break;
        case 'author-profile':
          view = await views.authorProfile(this.params.id);
          break;
        case 'author-login':
          view = await views.authorLogin();
          break;
        case 'author-dashboard':
          if (!store.currentUser) {
            this.navigate('author-login');
            return;
          }
          view = await views.authorDashboard();
          break;
        case 'add-work':
          if (!store.currentUser) {
            this.navigate('author-login');
            return;
          }
          view = await views.addWork();
          break;
        case 'manage-work':
          if (!store.currentUser) {
            this.navigate('author-login');
            return;
          }
          view = await views.manageWork(this.params.id);
          break;
        case 'edit-chapter':
          if (!store.currentUser) {
            this.navigate('author-login');
            return;
          }
          view = await views.editChapter(this.params.id, this.params.chapterIndex);
          break;
        case 'search':
          view = await views.searchResults(this.params.query);
          break;
        case 'reader-login':
          view = await views.readerLogin();
          break;
        case 'reader-signup':
          view = await views.readerSignup();
          break;
        case 'reader-dashboard':
          if (!store.currentReader) {
            this.navigate('reader-login');
            return;
          }
          view = await views.readerDashboard();
          break;
        case 'book-ratings':
          if (!store.currentUser) {
            this.navigate('author-login');
            return;
          }
          view = await views.bookRatings(this.params.id);
          break;
        case 'book-reviews':
          if (!store.currentUser) {
            this.navigate('author-login');
            return;
          }
          view = await views.bookReviews(this.params.bookId);
          break;
        case 'author-forgot-password':
          view = await views.authorForgotPassword();
          break;
        case 'author-reset-password':
          view = await views.authorResetPassword();
          break;
        case 'reader-forgot-password':
          view = await views.readerForgotPassword();
          break;
        case 'reader-reset-password':
          view = await views.readerResetPassword();
          break;
        default:
          view = await views.home();
      }
      app.innerHTML = '';
      app.appendChild(view);
    } catch (err) {
      console.error(err);
      app.innerHTML = `<div class="text-center py-20 text-red-600">${err.message}</div>`;
    }
  }
};
