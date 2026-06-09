import { store } from './store/index.js';
import { router } from './router/index.js';
import { showToast } from './components/toast.js';

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => console.log('SW registration skipped'));
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'block';
  });
}

// Global utility functions
window.installPWA = function () {
  if (window.deferredPrompt) {
    window.deferredPrompt.prompt();
    window.deferredPrompt.userChoice.then(() => { window.deferredPrompt = null; });
  }
};

window.toggleGlobalDarkMode = function () {
  store.darkMode = !store.darkMode;
  document.body.classList.toggle('dark-mode');
  store.saveLocal();
};

window.toggleList = function (listName, workId) {
  const list = store.lists[listName];
  const idx = list.indexOf(workId);
  if (idx > -1) list.splice(idx, 1);
  else list.push(workId);
  store.saveLocal();
  router.render();
};

window.toggleFollow = async function (authorId) {
  if (!store.currentUser) {
    showToast('Please login first', 'error');
    return;
  }
  try {
    await store.toggleFollow(store.currentUser.id, authorId);
    router.render();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.logout = function () {
  store.currentUser = null;
  localStorage.removeItem('ink_token');
  store.saveLocal();
  showToast('Logged out', 'success');
  router.navigate('home');
};

window.showToast = showToast;

// Global search handler
window.handleSearch = function (e) {
  e.preventDefault();
  const query = document.querySelector('[name="search"]').value;
  if (query) router.navigate('search', { query });
};

// Make router globally available
window.router = router;

// Initialize app
(async () => {
  await store.init();
  router.checkHash();
  router.render();
})();
