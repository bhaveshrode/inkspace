import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { showToast } from '../components/toast.js';

export async function authorResetPassword() {
  const container = document.createElement('div');
  container.className = 'fade-in min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 px-4';

  // Get token from URL query params
  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  const token = params.get('token');

  if (!token) {
    showToast('Invalid reset link', 'error');
    router.navigate('author-login');
    return container;
  }

  // Validate token
  const isValid = await store.validateAuthorResetToken(token);
  if (!isValid) {
    showToast('This reset link has expired or is invalid', 'error');
    router.navigate('author-login');
    return container;
  }

  container.innerHTML = `
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <i class="fa-solid fa-lock-open text-5xl text-purple-600 mb-4"></i>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">Reset Password</h1>
        <p class="text-slate-600 dark:text-slate-400">Enter your new password</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        <form id="reset-password-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
            <input type="password" id="password" required minlength="6"
                   class="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Minimum 6 characters</p>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm Password</label>
            <input type="password" id="confirm-password" required minlength="6"
                   class="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
          </div>

          <button type="submit"
                  class="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition shadow-lg hover:shadow-xl">
            Reset Password
          </button>
        </form>

        <div class="mt-6 text-center">
          <a href="#" id="back-to-login" class="text-sm text-purple-600 dark:text-purple-400 hover:underline">
            <i class="fa-solid fa-arrow-left mr-1"></i>
            Back to Login
          </a>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#reset-password-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = container.querySelector('#password').value;
    const confirmPassword = container.querySelector('#confirm-password').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Resetting...';

      await store.resetAuthorPassword(token, password);

      showToast('Password reset successful! You can now log in.', 'success');

      // Navigate to login after 2 seconds
      setTimeout(() => {
        router.navigate('author-login');
      }, 2000);
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Reset Password';
    }
  });

  container.querySelector('#back-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('author-login');
  });

  return container;
}
