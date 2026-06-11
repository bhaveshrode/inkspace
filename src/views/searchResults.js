import { store } from '../store/index.js';
import { workCard } from '../components/workCard.js';
import { router } from '../router/index.js';

export async function searchResults(query) {
  // Ensure query is a string
  const searchQuery = String(query || '').trim();

  // Get searchType from URL or default to 'books'
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const searchType = urlParams.get('type') || 'books';

  const container = document.createElement('div');
  container.className = 'fade-in max-w-7xl mx-auto px-4 py-8';

  // Header with tabs
  const header = document.createElement('div');
  header.className = 'mb-6';
  header.innerHTML = `
    <h1 class="text-3xl font-bold mb-4 text-slate-900 dark:text-white">
      Search Results for "${searchQuery}"
    </h1>

    <!-- Tabs -->
    <div class="flex gap-2 border-b border-slate-200 dark:border-slate-700">
      <button id="tab-books" class="px-4 py-2 font-medium transition-colors ${searchType === 'books' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}">
        <i class="fas fa-book mr-2"></i>Books
      </button>
      <button id="tab-authors" class="px-4 py-2 font-medium transition-colors ${searchType === 'authors' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}">
        <i class="fas fa-user mr-2"></i>Authors
      </button>
    </div>
  `;
  container.appendChild(header);

  // Results container
  const resultsContainer = document.createElement('div');
  resultsContainer.id = 'results-content';
  container.appendChild(resultsContainer);

  // Render based on search type
  if (searchType === 'books') {
    await renderBookResults(resultsContainer, searchQuery);
  } else {
    await renderAuthorResults(resultsContainer, searchQuery);
  }

  // Add tab click handlers
  setTimeout(() => {
    const tabBooks = container.querySelector('#tab-books');
    const tabAuthors = container.querySelector('#tab-authors');

    tabBooks.addEventListener('click', () => {
      router.navigate('search', { query: searchQuery, type: 'books' });
    });

    tabAuthors.addEventListener('click', () => {
      router.navigate('search', { query: searchQuery, type: 'authors' });
    });
  }, 0);

  return container;
}

async function renderBookResults(container, searchQuery) {
  const works = await store.getWorks();
  const authors = await store.getAuthors();
  const authMap = {};
  authors.forEach(a => authMap[a.id] = a.name);

  const filtered = works.filter(w =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resultsInfo = document.createElement('p');
  resultsInfo.className = 'text-slate-600 dark:text-slate-400 mb-6';
  resultsInfo.textContent = `${filtered.length} book${filtered.length !== 1 ? 's' : ''} found`;
  container.appendChild(resultsInfo);

  if (filtered.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'text-center py-12';
    noResults.innerHTML = `
      <i class="fas fa-search text-6xl text-slate-300 dark:text-slate-600 mb-4"></i>
      <p class="text-slate-500 dark:text-slate-400 text-lg">No books found matching "${searchQuery}"</p>
    `;
    container.appendChild(noResults);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  filtered.forEach(w => grid.appendChild(workCard(w, false, authMap[w.authorId], router)));
  container.appendChild(grid);
}

async function renderAuthorResults(container, searchQuery) {
  const authors = await store.getAuthors();

  const filtered = authors.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.bio && a.bio.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const resultsInfo = document.createElement('p');
  resultsInfo.className = 'text-slate-600 dark:text-slate-400 mb-6';
  resultsInfo.textContent = `${filtered.length} author${filtered.length !== 1 ? 's' : ''} found`;
  container.appendChild(resultsInfo);

  if (filtered.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'text-center py-12';
    noResults.innerHTML = `
      <i class="fas fa-search text-6xl text-slate-300 dark:text-slate-600 mb-4"></i>
      <p class="text-slate-500 dark:text-slate-400 text-lg">No authors found matching "${searchQuery}"</p>
    `;
    container.appendChild(noResults);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

  filtered.forEach(author => {
    const card = createAuthorCard(author);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function createAuthorCard(author) {
  const card = document.createElement('div');
  card.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition cursor-pointer';

  card.innerHTML = `
    <div class="flex items-start gap-4">
      <div class="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
        ${author.name.charAt(0).toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-lg text-slate-900 dark:text-white mb-1">${author.name}</h3>
        ${author.bio ? `<p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">${author.bio}</p>` : ''}
        <div class="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
          <span><i class="fas fa-users mr-1"></i>${author.followers || 0} followers</span>
        </div>
      </div>
    </div>
  `;

  card.addEventListener('click', () => {
    router.navigate('author-profile', { id: author.id });
  });

  return card;
}
