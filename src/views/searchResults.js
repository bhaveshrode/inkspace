import { store } from '../store/index.js';
import { workCard } from '../components/workCard.js';
import { router } from '../router/index.js';

export async function searchResults(query) {
  // Ensure query is a string
  const searchQuery = String(query || '').trim();

  const works = await store.getWorks();
  const authors = await store.getAuthors();
  const authMap = {};
  authors.forEach(a => authMap[a.id] = a.name);

  const filtered = works.filter(w =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const container = document.createElement('div');
  container.className = 'fade-in max-w-7xl mx-auto px-4 py-8';

  container.innerHTML = `
    <h1 class="text-3xl font-bold mb-6">Search Results for "${searchQuery}"</h1>
    <p class="text-slate-600 mb-6">${filtered.length} results found</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  filtered.forEach(w => grid.appendChild(workCard(w, false, authMap[w.authorId], router)));
  container.appendChild(grid);

  return container;
}
