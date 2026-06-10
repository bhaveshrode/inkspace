import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { showToast } from '../components/toast.js';

export async function readerLogin() {
  const container = document.createElement('div');
  container.className = 'fade-in min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 px-4';

  container.innerHTML = `
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <i class="fa-solid fa-book-reader text-5xl text-indigo-600 mb-4"></i>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">Reader Login</h1>
        <p class="text-slate-600 dark:text-slate-400">Sign in to access your reading library</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        <form id="reader-login-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
            <input type="email" id="email" required
                   class="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition">
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</label>
            <input type="password" id="password" required
                   class="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition">
          </div>

          <button type="submit"
                  class="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition shadow-lg hover:shadow-xl">
            Sign In
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-slate-600 dark:text-slate-400">
            Don't have an account?
            <a href="#" id="signup-link" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Sign up</a>
          </p>
        </div>
      </div>

      <div class="mt-6 text-center">
        <a href="#" id="author-link" class="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
          <i class="fa-solid fa-pen mr-1"></i>
          Are you an author? Login here
        </a>
      </div>
    </div>
  `;

  const form = container.querySelector('#reader-login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Check if author is already logged in
    if (store.currentUser) {
      showToast('Please logout from author account first', 'error');
      return;
    }

    const email = container.querySelector('#email').value;
    const password = container.querySelector('#password').value;

    try {
      await store.readerLogin({ email, password });
      showToast('Welcome back!');
      router.navigate('reader-dashboard');
      if (window.initializeNotificationBell) {
        window.initializeNotificationBell();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  container.querySelector('#signup-link').addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('reader-signup');
  });

  container.querySelector('#author-link').addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('author-login');
  });

  return container;
}
