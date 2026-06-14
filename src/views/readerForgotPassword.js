import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { showToast } from '../components/toast.js';

export async function readerForgotPassword() {
  const container = document.createElement('div');
  container.className = 'fade-in min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 px-4';

  container.innerHTML = `
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <i class="fa-solid fa-key text-5xl text-indigo-600 mb-4"></i>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">Forgot Password</h1>
        <p class="text-slate-600 dark:text-slate-400">Enter your email to receive a password reset link</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        <form id="forgot-password-form">
          <div class="mb-6">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
            <input type="email" id="email" required
                   class="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition">
          </div>

          <button type="submit"
                  class="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition shadow-lg hover:shadow-xl">
            Send Reset Link
          </button>
        </form>

        <div class="mt-6 text-center">
          <a href="#" id="back-to-login" class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            <i class="fa-solid fa-arrow-left mr-1"></i>
            Back to Login
          </a>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#forgot-password-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = container.querySelector('#email').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      const result = await store.requestReaderPasswordReset(email);

      showToast(result.message, 'success');

      // In development, show token in console
      if (result.token) {
        console.log('Password Reset Token:', result.token);
        console.log('Reset URL:', `${window.location.origin}/#reader-reset-password?token=${result.token}`);
        showToast('Check console for reset link (dev mode)', 'success');
      }

      // Navigate back to login after 2 seconds
      setTimeout(() => {
        router.navigate('reader-login');
      }, 2000);
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Reset Link';
    }
  });

  container.querySelector('#back-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('reader-login');
  });

  return container;
}
