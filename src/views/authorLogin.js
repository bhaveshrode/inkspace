import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { showToast } from '../components/toast.js';

export async function authorLogin() {
  const container = document.createElement('div');
  container.className = 'fade-in max-w-md mx-auto px-4 py-12';

  container.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8">
      <h2 class="text-2xl font-bold mb-6">Author Login</h2>
      <form id="login-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Email</label>
          <input type="email" name="email" required
                 class="w-full border rounded px-3 py-2"
                 placeholder="elena@inkspace.com">
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Password</label>
          <input type="password" name="password" required
                 class="w-full border rounded px-3 py-2">
        </div>
        <button type="submit"
                class="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
          Login
        </button>
      </form>
      <div class="mt-4 text-center">
        <a href="#" id="forgot-password-link" class="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
          Forgot password?
        </a>
      </div>
    </div>
  `;

  container.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Check if reader is already logged in
    if (store.currentReader) {
      showToast('Please logout from reader account first', 'error');
      return;
    }

    const formData = new FormData(e.target);
    try {
      const { user, token } = await store.login(formData.get('email'), formData.get('password'));
      store.currentUser = user;
      localStorage.setItem('ink_token', token);
      store.saveLocal();
      showToast('Welcome back!', 'success');
      router.navigate('author-dashboard');
      if (window.initializeNotificationBell) {
        window.initializeNotificationBell();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  container.querySelector('#forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('author-forgot-password');
  });

  return container;
}
