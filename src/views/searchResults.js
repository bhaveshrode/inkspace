import { store } from '../store/index.js';
import { router } from '../router/index.js';

export async function searchResults(params) {
  const searchQuery = params.q || '';
  const searchType = params.type || 'books'; // 'books' or 'authors'
  const currentPage = parseInt(params.page) || 1;

  const container = document.createElement('div');
  container.className = 'fade-in max-w-7xl mx-auto px-4 py-8';

  // Header with search type tabs
  const header = document.createElement('div');
  header.className = 'mb-8';
  header.innerHTML = `
    <h1 class="text-3xl font-bold mb-4 text-slate-900 dark:text-white">
      ${searchQuery ? `Search Results for "${searchQuery}"` : 'Search'}
    </h1>

    <!-- Search Type Tabs -->
    <div class="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
      <button id="tab-books" class="px-4 py-2 font-medium transition-colors ${searchType === 'books' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}">
        <i class="fas fa-book mr-2"></i>Books
      </button>
      <button id="tab-authors" class="px-4 py-2 font-medium transition-colors ${searchType === 'authors' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}">
        <i class="fas fa-user mr-2"></i>Authors
      </button>
    </div>
  `;
  container.appendChild(header);

  // Add tab click handlers
  setTimeout(() => {
    const tabBooks = container.querySelector('#tab-books');
    const tabAuthors = container.querySelector('#tab-authors');

    tabBooks.addEventListener('click', () => {
      router.navigate('search-results', { q: searchQuery, type: 'books', page: 1 });
    });

    tabAuthors.addEventListener('click', () => {
      router.navigate('search-results', { q: searchQuery, type: 'authors', page: 1 });
    });
  }, 0);

  // Results container
  const resultsContainer = document.createElement('div');
  resultsContainer.id = 'search-results-content';
  container.appendChild(resultsContainer);

  // Load and display results based on search type
  if (searchType === 'books') {
    await renderBookResults(resultsContainer, searchQuery, currentPage, params);
  } else {
    await renderAuthorResults(resultsContainer, searchQuery, currentPage, params);
  }

  return container;
}

async function renderBookResults(container, query, page, params) {
  // Filters section
  const filtersSection = document.createElement('div');
  filtersSection.className = 'bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-700';
  filtersSection.innerHTML = `
    <div class="flex flex-wrap gap-4 items-center">
      <div class="flex-1 min-w-[200px]">
        <label class="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Genre</label>
        <select id="filter-genre" class="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
          <option value="">All Genres</option>
          <option value="fantasy" ${params.genre === 'fantasy' ? 'selected' : ''}>Fantasy</option>
          <option value="science fiction" ${params.genre === 'science fiction' ? 'selected' : ''}>Science Fiction</option>
          <option value="mystery" ${params.genre === 'mystery' ? 'selected' : ''}>Mystery</option>
          <option value="romance" ${params.genre === 'romance' ? 'selected' : ''}>Romance</option>
          <option value="thriller" ${params.genre === 'thriller' ? 'selected' : ''}>Thriller</option>
          <option value="horror" ${params.genre === 'horror' ? 'selected' : ''}>Horror</option>
          <option value="cyberpunk" ${params.genre === 'cyberpunk' ? 'selected' : ''}>Cyberpunk</option>
        </select>
      </div>

      <div class="flex-1 min-w-[200px]">
        <label class="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Status</label>
        <select id="filter-status" class="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
          <option value="">All Status</option>
          <option value="published" ${params.status === 'published' ? 'selected' : ''}>Published</option>
          <option value="completed" ${params.status === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
      </div>

      <div class="flex-1 min-w-[200px]">
        <label class="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Min Rating</label>
        <select id="filter-rating" class="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
          <option value="0">Any Rating</option>
          <option value="3" ${params.minRating === '3' ? 'selected' : ''}>3+ Stars</option>
          <option value="4" ${params.minRating === '4' ? 'selected' : ''}>4+ Stars</option>
          <option value="4.5" ${params.minRating === '4.5' ? 'selected' : ''}>4.5+ Stars</option>
        </select>
      </div>

      <div class="flex-1 min-w-[200px]">
        <label class="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Sort By</label>
        <select id="filter-sort" class="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
          <option value="relevance" ${(params.sortBy || 'relevance') === 'relevance' ? 'selected' : ''}>Relevance</option>
          <option value="rating" ${params.sortBy === 'rating' ? 'selected' : ''}>Highest Rated</option>
          <option value="views" ${params.sortBy === 'views' ? 'selected' : ''}>Most Popular</option>
          <option value="newest" ${params.sortBy === 'newest' ? 'selected' : ''}>Newest</option>
        </select>
      </div>
    </div>
  `;
  container.appendChild(filtersSection);

  // Add filter change listeners
  setTimeout(() => {
    const genreFilter = container.querySelector('#filter-genre');
    const statusFilter = container.querySelector('#filter-status');
    const ratingFilter = container.querySelector('#filter-rating');
    const sortFilter = container.querySelector('#filter-sort');

    const applyFilters = () => {
      const newParams = {
        q: query,
        type: 'books',
        page: 1,
        genre: genreFilter.value,
        status: statusFilter.value,
        minRating: ratingFilter.value,
        sortBy: sortFilter.value
      };
      router.navigate('search-results', newParams);
    };

    genreFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    ratingFilter.addEventListener('change', applyFilters);
    sortFilter.addEventListener('change', applyFilters);
  }, 0);

  // Loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'text-center py-12';
  loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-4 text-slate-600 dark:text-slate-400">Searching...</p>';
  container.appendChild(loadingDiv);

  try {
    // Perform search
    const searchParams = {
      query: query,
      genre: params.genre || '',
      status: params.status || '',
      minRating: params.minRating ? parseFloat(params.minRating) : 0,
      sortBy: params.sortBy || 'relevance',
      page: page,
      limit: 20
    };

    const searchResults = await store.searchBooks(searchParams);

    // Remove loading indicator
    container.removeChild(loadingDiv);

    // Results count
    const countDiv = document.createElement('div');
    countDiv.className = 'mb-6 text-slate-600 dark:text-slate-400';
    countDiv.innerHTML = `
      <p class="text-lg">
        <span class="font-semibold text-slate-900 dark:text-white">${searchResults.total}</span>
        ${searchResults.total === 1 ? 'book' : 'books'} found
        ${query ? `matching <span class="font-semibold">"${query}"</span>` : ''}
      </p>
    `;
    container.appendChild(countDiv);

    if (searchResults.results.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'text-center py-12';
      noResults.innerHTML = `
        <i class="fas fa-search text-6xl text-slate-300 dark:text-slate-600 mb-4"></i>
        <p class="text-xl text-slate-600 dark:text-slate-400">No books found</p>
        <p class="text-slate-500 dark:text-slate-500 mt-2">Try adjusting your filters or search query</p>
      `;
      container.appendChild(noResults);
    } else {
      // Results grid
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8';

      searchResults.results.forEach(book => {
        const card = createBookCard(book);
        grid.appendChild(card);
      });

      container.appendChild(grid);

      // Pagination
      if (searchResults.totalPages > 1) {
        const pagination = createPagination(searchResults.page, searchResults.totalPages, query, params);
        container.appendChild(pagination);
      }
    }
  } catch (error) {
    container.removeChild(loadingDiv);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-center py-12 text-red-600';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle text-4xl mb-4"></i><p>${error.message}</p>`;
    container.appendChild(errorDiv);
  }
}

async function renderAuthorResults(container, query, page, params) {
  // Filters section for authors
  const filtersSection = document.createElement('div');
  filtersSection.className = 'bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-700';
  filtersSection.innerHTML = `
    <div class="flex gap-4 items-center">
      <div class="flex-1 min-w-[200px]">
        <label class="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Sort By</label>
        <select id="filter-author-sort" class="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
          <option value="followers" ${(params.sortBy || 'followers') === 'followers' ? 'selected' : ''}>Most Followers</option>
          <option value="books" ${params.sortBy === 'books' ? 'selected' : ''}>Most Books</option>
          <option value="views" ${params.sortBy === 'views' ? 'selected' : ''}>Most Views</option>
        </select>
      </div>
    </div>
  `;
  container.appendChild(filtersSection);

  // Add filter change listener
  setTimeout(() => {
    const sortFilter = container.querySelector('#filter-author-sort');
    sortFilter.addEventListener('change', () => {
      router.navigate('search-results', {
        q: query,
        type: 'authors',
        page: 1,
        sortBy: sortFilter.value
      });
    });
  }, 0);

  // Loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'text-center py-12';
  loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-4 text-slate-600 dark:text-slate-400">Searching...</p>';
  container.appendChild(loadingDiv);

  try {
    const searchParams = {
      query: query,
      sortBy: params.sortBy || 'followers',
      page: page,
      limit: 20
    };

    const searchResults = await store.searchAuthors(searchParams);

    container.removeChild(loadingDiv);

    // Results count
    const countDiv = document.createElement('div');
    countDiv.className = 'mb-6 text-slate-600 dark:text-slate-400';
    countDiv.innerHTML = `
      <p class="text-lg">
        <span class="font-semibold text-slate-900 dark:text-white">${searchResults.total}</span>
        ${searchResults.total === 1 ? 'author' : 'authors'} found
        ${query ? `matching <span class="font-semibold">"${query}"</span>` : ''}
      </p>
    `;
    container.appendChild(countDiv);

    if (searchResults.results.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'text-center py-12';
      noResults.innerHTML = `
        <i class="fas fa-search text-6xl text-slate-300 dark:text-slate-600 mb-4"></i>
        <p class="text-xl text-slate-600 dark:text-slate-400">No authors found</p>
        <p class="text-slate-500 dark:text-slate-500 mt-2">Try adjusting your search query</p>
      `;
      container.appendChild(noResults);
    } else {
      // Results grid
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8';

      searchResults.results.forEach(author => {
        const card = createAuthorCard(author);
        grid.appendChild(card);
      });

      container.appendChild(grid);

      // Pagination
      if (searchResults.totalPages > 1) {
        const pagination = createPagination(searchResults.page, searchResults.totalPages, query, { ...params, type: 'authors' });
        container.appendChild(pagination);
      }
    }
  } catch (error) {
    container.removeChild(loadingDiv);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-center py-12 text-red-600';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle text-4xl mb-4"></i><p>${error.message}</p>`;
    container.appendChild(errorDiv);
  }
}

function createBookCard(book) {
  const card = document.createElement('div');
  card.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200';

  const avgRating = book.averageRating || 0;
  const ratingCount = book.ratingCount || book.rating_count || 0;

  card.innerHTML = `
    <div class="aspect-[2/3] bg-gradient-to-br from-indigo-400 to-purple-500 relative overflow-hidden">
      ${book.cover ? `<img src="${book.cover}" alt="${book.title}" class="w-full h-full object-cover">` :
        `<div class="w-full h-full flex items-center justify-center">
          <i class="fas fa-book text-6xl text-white/30"></i>
        </div>`
      }
    </div>
    <div class="p-4">
      <h3 class="font-bold text-lg mb-1 line-clamp-2 text-slate-900 dark:text-white">${book.title}</h3>
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-2">${book.author_name || 'Unknown Author'}</p>
      ${book.genre ? `<p class="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-2">${book.genre}</p>` : ''}
      ${avgRating > 0 ? `
        <div class="flex items-center gap-2 text-sm mb-2">
          <div class="flex text-yellow-400">
            ${generateStars(avgRating)}
          </div>
          <span class="text-slate-600 dark:text-slate-400">${avgRating.toFixed(1)} (${ratingCount})</span>
        </div>
      ` : ''}
      <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">${book.description || 'No description available'}</p>
      <div class="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
        <span><i class="fas fa-eye mr-1"></i>${book.views || 0}</span>
        <span class="px-2 py-1 rounded-full ${book.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}">${book.status || 'published'}</span>
      </div>
    </div>
  `;

  card.addEventListener('click', () => {
    router.navigate('work-detail', { id: book.id });
  });

  return card;
}

function createAuthorCard(author) {
  const card = document.createElement('div');
  card.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200';

  card.innerHTML = `
    <div class="p-6">
      <div class="flex items-start gap-4 mb-4">
        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden">
          ${author.avatar ? `<img src="${author.avatar}" alt="${author.name}" class="w-full h-full object-cover">` :
            author.name.charAt(0).toUpperCase()
          }
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-lg mb-1 text-slate-900 dark:text-white truncate">${author.name}</h3>
          <div class="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span><i class="fas fa-users mr-1"></i>${author.followers || 0} followers</span>
            <span><i class="fas fa-book mr-1"></i>${author.bookCount || author.book_count || 0} books</span>
          </div>
        </div>
      </div>
      ${author.bio ? `<p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">${author.bio}</p>` : ''}
      ${author.totalViews || author.total_views ? `
        <div class="mt-3 text-xs text-slate-500 dark:text-slate-500">
          <i class="fas fa-eye mr-1"></i>${(author.totalViews || author.total_views).toLocaleString()} total views
        </div>
      ` : ''}
    </div>
  `;

  card.addEventListener('click', () => {
    router.navigate('author-profile', { id: author.id });
  });

  return card;
}

function generateStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      stars += '<i class="fas fa-star"></i>';
    } else if (i - 0.5 <= rating) {
      stars += '<i class="fas fa-star-half-alt"></i>';
    } else {
      stars += '<i class="far fa-star"></i>';
    }
  }
  return stars;
}

function createPagination(currentPage, totalPages, query, params) {
  const pagination = document.createElement('div');
  pagination.className = 'flex justify-center items-center gap-2';

  const maxVisible = 7;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  // Previous button
  if (currentPage > 1) {
    const prev = document.createElement('button');
    prev.className = 'px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.addEventListener('click', () => {
      router.navigate('search-results', { ...params, q: query, page: currentPage - 1 });
    });
    pagination.appendChild(prev);
  }

  // First page
  if (startPage > 1) {
    pagination.appendChild(createPageButton(1, currentPage, query, params));
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'px-2 text-slate-500';
      ellipsis.textContent = '...';
      pagination.appendChild(ellipsis);
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    pagination.appendChild(createPageButton(i, currentPage, query, params));
  }

  // Last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'px-2 text-slate-500';
      ellipsis.textContent = '...';
      pagination.appendChild(ellipsis);
    }
    pagination.appendChild(createPageButton(totalPages, currentPage, query, params));
  }

  // Next button
  if (currentPage < totalPages) {
    const next = document.createElement('button');
    next.className = 'px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.addEventListener('click', () => {
      router.navigate('search-results', { ...params, q: query, page: currentPage + 1 });
    });
    pagination.appendChild(next);
  }

  return pagination;
}

function createPageButton(pageNum, currentPage, query, params) {
  const button = document.createElement('button');
  button.textContent = pageNum;
  button.className = pageNum === currentPage
    ? 'px-4 py-2 rounded-md bg-indigo-600 text-white font-medium'
    : 'px-4 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700';

  if (pageNum !== currentPage) {
    button.addEventListener('click', () => {
      router.navigate('search-results', { ...params, q: query, page: pageNum });
    });
  }

  return button;
}
