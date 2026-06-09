import { store } from '../store/index.js';
import { router } from '../router/index.js';

export async function authorDashboard() {
  const works = await store.getWorks();
  const myWorks = works.filter(w => w.authorId === store.currentUser.id);

  let stats = { totalRatings: 0, averageRating: 0, totalViews: 0 };
  try {
    stats = await store.getAuthorStatistics();
  } catch (e) {
    console.error('Failed to load statistics:', e);
  }

  const worksWithRatings = await Promise.all(
    myWorks.map(async (w) => {
      try {
        const ratingData = await store.getBookAverageRating(w.id);
        return { ...w, averageRating: ratingData.average, ratingCount: ratingData.count };
      } catch (e) {
        return { ...w, averageRating: 0, ratingCount: 0 };
      }
    })
  );

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

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div class="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 text-white">
        <i class="fa-solid fa-star text-3xl mb-2 opacity-80"></i>
        <div class="text-4xl font-bold mb-1">${stats.totalRatings}</div>
        <div class="text-sm opacity-90">Total Ratings</div>
      </div>
      <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
        <i class="fa-solid fa-chart-line text-3xl mb-2 opacity-80"></i>
        <div class="text-4xl font-bold mb-1">${stats.averageRating.toFixed(1)}</div>
        <div class="text-sm opacity-90">Average Rating</div>
      </div>
      <div class="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
        <i class="fa-solid fa-eye text-3xl mb-2 opacity-80"></i>
        <div class="text-4xl font-bold mb-1">${stats.totalViews}</div>
        <div class="text-sm opacity-90">Total Views</div>
      </div>
    </div>

    <div class="grid gap-4">
      ${worksWithRatings.length === 0 ? `
        <div class="text-center py-12 text-slate-500">
          <i class="fa-solid fa-book text-4xl mb-4"></i>
          <p>You haven't published any works yet.</p>
          <button onclick="router.navigate('add-work')"
                  class="mt-4 bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">
            Create Your First Work
          </button>
        </div>
      ` : worksWithRatings.map(w => `
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="text-xl font-bold">${w.title}</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">${w.genre || 'Uncategorized'} • ${w.status || 'published'}</p>
              <div class="mt-2 flex items-center gap-4">
                <div class="flex items-center gap-1">
                  <i class="fa-solid fa-star text-yellow-400"></i>
                  <span class="text-sm font-medium">${w.averageRating.toFixed(1)}</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">(${w.ratingCount} ratings)</span>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="window.viewBookRatings('${w.id}')"
                      class="text-yellow-600 hover:text-yellow-700 px-3 py-1 rounded border border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition">
                <i class="fa-solid fa-star mr-1"></i>View Ratings
              </button>
              <button onclick="router.navigate('manage-work', {id: '${w.id}'})"
                      class="text-indigo-600 hover:text-indigo-700 px-3 py-1 rounded border border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                <i class="fa-solid fa-cog mr-1"></i>Manage
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  return container;
}
