import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { workCard } from '../components/workCard.js';

export async function home() {
  const container = document.createElement('div');
  container.className = 'fade-in';
  const works = await store.getWorks();
  const authors = await store.getAuthors();
  const authMap = {};
  authors.forEach(a => authMap[a.id] = a.name);

  const hero = document.createElement('div');
  hero.className = 'bg-indigo-700 text-white py-16';
  hero.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h1 class="text-4xl font-bold mb-4">Discover Your Next Adventure</h1>
      <p class="text-indigo-100 text-lg max-w-2xl mx-auto">Read thousands of stories from independent authors.</p>
    </div>`;
  container.appendChild(hero);

  const wrap = document.createElement('div');
  wrap.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12';

  // Trending
  const trendingSection = document.createElement('div');
  trendingSection.className = 'mb-12';
  trendingSection.innerHTML = `<h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-l-4 border-indigo-500 pl-3"><i class="fa-solid fa-fire mr-2 text-orange-500"></i>Trending Now</h2>`;
  const tGrid = document.createElement('div');
  tGrid.className = 'grid grid-cols-1 md:grid-cols-3 gap-6';
  const trendingWorks = [...works].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
  trendingWorks.forEach(w => tGrid.appendChild(workCard(w, false, authMap[w.authorId], router)));
  trendingSection.appendChild(tGrid);
  wrap.appendChild(trendingSection);

  // Continue Reading
  if (store.currentUser && store.readingHistory && store.readingHistory.length > 0) {
    const cSec = document.createElement('div');
    cSec.className = 'mb-12';
    cSec.innerHTML = `<h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-l-4 border-green-500 pl-3">Continue Reading</h2>`;
    const cGrid = document.createElement('div');
    cGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

    for (let i = 0; i < Math.min(3, store.readingHistory.length); i++) {
      const hist = store.readingHistory[i];
      const w = works.find(x => x.id === hist.book_id);
      if (w) cGrid.appendChild(workCard(w, true, authMap[w.authorId], router));
    }
    cSec.appendChild(cGrid);
    wrap.appendChild(cSec);
  }

  // New & Featured
  const fSec = document.createElement('div');
  fSec.innerHTML = `<h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-l-4 border-indigo-500 pl-3">New & Featured</h2>`;
  const fGrid = document.createElement('div');
  fGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  [...works].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(w => fGrid.appendChild(workCard(w, false, authMap[w.authorId], router)));
  fSec.appendChild(fGrid);
  wrap.appendChild(fSec);

  container.appendChild(wrap);
  return container;
}
