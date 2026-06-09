import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { showToast } from '../components/toast.js';

export async function readerSignup() {
  const container = document.createElement('div');
  container.className = 'fade-in min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 px-4 py-12';

  container.innerHTML = `
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <i class="fa-solid fa-book-reader text-5xl text-indigo-600 mb-4"></i>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Reader Account</h1>
        <p class="text-slate-600 dark:text-slate-400">Join InkSpace and start your reading journey</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        <form id="reader-signup-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
            <input type="text" id="name" required
                   class="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition">
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
            <input type="email" id="email" required
                   class="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition">
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</label>
            <input type="password" id="password" required
                   class="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition">
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bio (Optional)</label>
            <textarea id="bio" rows="2"
                      class="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="Tell us about yourself..."></textarea>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Avatar URL (Optional)</label>
            <input type="url" id="avatar"
                   class="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                   placeholder="https://example.com/avatar.jpg">
          </div>

          <button type="submit"
                  class="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition shadow-lg hover:shadow-xl">
            Create Account
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-slate-600 dark:text-slate-400">
            Already have an account?
            <a href="#" id="login-link" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#reader-signup-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = container.querySelector('#name').value;
    const email = container.querySelector('#email').value;
    const password = container.querySelector('#password').value;
    const bio = container.querySelector('#bio').value;
    const avatar = container.querySelector('#avatar').value;

    try {
      await store.readerSignup({ name, email, password, bio, avatar });
      showToast('Account created successfully!');
      router.navigate('reader-dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  container.querySelector('#login-link').addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('reader-login');
  });

  return container;
}
