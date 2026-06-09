import { store } from '../store/index.js';
import { router } from '../router/index.js';

export async function authorDashboard() {
  const works = await store.getWorks();
  const myWorks = works.filter(w => w.authorId === store.currentUser.id);

  const container = document.createElement('div');
  container.className = 'fade-in max-w-6xl mx-auto px-4 py-8';

  container.innerHTML = `
    <div class="mb-6 flex justify-between items-center">
      <h1 class="text-3xl font-bold">My Dashboard</h1>
      <button onclick="router.navigate('add-work')"
              class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
        <i class="fa-solid fa-plus mr-2"></i>New Work
      </button>
    </div>
    <div class="grid gap-4">
      ${myWorks.length === 0 ? `
        <div class="text-center py-12 text-slate-500">
          <i class="fa-solid fa-book text-4xl mb-4"></i>
          <p>You haven't published any works yet.</p>
          <button onclick="router.navigate('add-work')"
                  class="mt-4 bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">
            Create Your First Work
          </button>
        </div>
      ` : myWorks.map(w => `
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-xl font-bold">${w.title}</h3>
              <p class="text-sm text-slate-500">${w.genre || 'Uncategorized'} • ${w.status || 'published'}</p>
            </div>
            <button onclick="router.navigate('manage-work', {id: '${w.id}'})"
                    class="text-indigo-600 hover:text-indigo-700">
              Manage
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  return container;
}
