import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { workCard } from '../components/workCard.js';

export async function home() {
  const container = document.createElement('div');
  container.className = 'fade-in';

  // Load all discovery data in parallel for faster page load
  const [trending, highestRated, recentlyUpdated, completed, authors] = await Promise.all([
    store.getTrendingBooks().catch(() => []),
    store.getHighestRatedBooks().catch(() => []),
    store.getRecentlyUpdatedBooks().catch(() => []),
    store.getCompletedBooks().catch(() => []),
    store.getAuthors().catch(() => [])
  ]);

  const authMap = {};
  authors.forEach(a => authMap[a.id] = a.name);

  // Hero Section
  const hero = document.createElement('div');
  hero.className = 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20';
  hero.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center">
        <h1 class="text-5xl font-bold mb-6 animate-fade-in">Discover Your Next Adventure</h1>
        <p class="text-indigo-100 text-xl max-w-3xl mx-auto mb-8">
          Explore thousands of stories from independent authors. Trending tales, highly rated gems, and freshly updated chapters await.
        </p>
        <div class="flex justify-center gap-4">
          <button onclick="document.getElementById('global-search').focus()" class="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition shadow-lg">
            <i class="fas fa-search mr-2"></i>Start Exploring
          </button>
        </div>
      </div>
    </div>`;
  container.appendChild(hero);

  const wrap = document.createElement('div');
  wrap.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16';

  // Trending This Week Section
  if (trending.length > 0) {
    const trendingSection = createDiscoverySection(
      'Trending This Week',
      'fire',
      'orange',
      'Most read stories this week',
      trending.slice(0, 6),
      authMap
    );
    wrap.appendChild(trendingSection);
  }

  // Highest Rated Section
  if (highestRated.length > 0) {
    const ratedSection = createDiscoverySection(
      'Highest Rated',
      'star',
      'yellow',
      'Reader favorites with 4.5+ stars',
      highestRated.slice(0, 6),
      authMap
    );
    wrap.appendChild(ratedSection);
  }

  // Recently Updated Section
  if (recentlyUpdated.length > 0) {
    const updatedSection = createDiscoverySection(
      'Recently Updated',
      'clock-rotate-left',
      'green',
      'Fresh chapters added in the last 30 days',
      recentlyUpdated.slice(0, 6),
      authMap
    );
    wrap.appendChild(updatedSection);
  }

  // Completed Stories Section
  if (completed.length > 0) {
    const completedSection = createDiscoverySection(
      'Completed Stories',
      'check-circle',
      'blue',
      'Binge-ready finished tales',
      completed.slice(0, 6),
      authMap
    );
    wrap.appendChild(completedSection);
  }

  // Continue Reading (for logged-in readers)
  if (store.currentReader) {
    try {
      const bookmarks = await store.readerGetBookmarks();
      if (bookmarks.length > 0) {
        const continueSection = document.createElement('div');
        continueSection.className = 'mb-12';
        continueSection.innerHTML = `
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <i class="fas fa-bookmark text-purple-500"></i>
              Continue Reading
            </h2>
            <button onclick="router.navigate('reader-dashboard')" class="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">
              View All Bookmarks →
            </button>
          </div>
          <p class="text-slate-600 dark:text-slate-400 mb-6">Pick up where you left off</p>
        `;
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
        bookmarks.slice(0, 3).forEach(bookmark => {
          if (bookmark.book) {
            grid.appendChild(workCard(bookmark.book, false, authMap[bookmark.book.authorId], router));
          }
        });
        continueSection.appendChild(grid);
        wrap.appendChild(continueSection);
      }
    } catch (e) {
      console.error('Failed to load bookmarks:', e);
    }
  }

  container.appendChild(wrap);
  return container;
}

// Helper function to create discovery sections
function createDiscoverySection(title, icon, color, description, works, authMap) {
  const section = document.createElement('div');
  section.className = 'discovery-section';

  const iconColors = {
    orange: 'text-orange-500',
    yellow: 'text-yellow-500',
    green: 'text-green-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500'
  };

  section.innerHTML = `
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-2">
        <i class="fas fa-${icon} ${iconColors[color]}"></i>
        ${title}
      </h2>
      <p class="text-slate-600 dark:text-slate-400">${description}</p>
    </div>
  `;

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';

  works.forEach(w => {
    grid.appendChild(workCard(w, false, authMap[w.authorId], router));
  });

  section.appendChild(grid);
  return section;
}
