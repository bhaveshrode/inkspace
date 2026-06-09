import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { notFound } from '../components/notFound.js';
import { RatingStars } from '../components/ratingStars.js';

export async function bookReviews(bookId) {
  if (!store.currentUser) {
    router.navigate('author-login');
    return;
  }

  const book = await store.getWorkById(bookId);
  if (!book) return notFound();

  if (book.authorId !== store.currentUser.id) {
    router.navigate('author-dashboard');
    return;
  }

  const container = document.createElement('div');
  container.className = 'fade-in max-w-7xl mx-auto px-4 py-8';

  container.innerHTML = `
    <div class="mb-6">
      <button onclick="router.navigate('author-dashboard')" class="text-indigo-600 dark:text-indigo-400 hover:underline mb-4">
        <i class="fa-solid fa-arrow-left mr-2"></i>Back to Dashboard
      </button>
      <h1 class="text-3xl font-bold text-slate-900 dark:text-white">${book.title} - Reviews</h1>
      <p class="text-slate-600 dark:text-slate-400 mt-2">View and analyze reader reviews for your book</p>
    </div>

    <div id="loading" class="text-center py-12">
      <i class="fa-solid fa-spinner fa-spin text-3xl text-slate-400"></i>
      <p class="text-slate-500 dark:text-slate-400 mt-4">Loading reviews...</p>
    </div>

    <div id="content" class="hidden">
      <!-- Statistics Card -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Review Statistics</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center">
            <div class="text-4xl font-bold text-indigo-600 dark:text-indigo-400" id="total-reviews">0</div>
            <div class="text-sm text-slate-600 dark:text-slate-400 mt-1">Total Reviews</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold text-indigo-600 dark:text-indigo-400" id="avg-rating">0.0</div>
            <div class="text-sm text-slate-600 dark:text-slate-400 mt-1">Average Rating</div>
          </div>
          <div>
            <div id="rating-breakdown" class="space-y-2"></div>
          </div>
        </div>
      </div>

      <!-- Filter/Sort Options -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
        <div class="flex flex-wrap items-center gap-4">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Sort by:</label>
          <select id="sort-select" class="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
          <select id="filter-select" class="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      <!-- Reviews List -->
      <div id="reviews-list"></div>
    </div>

    <div id="no-reviews" class="hidden text-center py-12">
      <i class="fa-solid fa-star text-6xl text-slate-300 dark:text-slate-600 mb-4"></i>
      <p class="text-xl text-slate-600 dark:text-slate-400">No reviews yet</p>
      <p class="text-slate-500 dark:text-slate-500 mt-2">Reviews will appear here when readers share their thoughts</p>
    </div>
  `;

  // Load reviews
  try {
    const data = await store.getBookDetailedReviews(bookId);
    const { reviews, stats } = data;

    container.querySelector('#loading').classList.add('hidden');

    if (reviews.length === 0) {
      container.querySelector('#no-reviews').classList.remove('hidden');
      return container;
    }

    container.querySelector('#content').classList.remove('hidden');

    // Update statistics
    container.querySelector('#total-reviews').textContent = stats.total_reviews || 0;
    container.querySelector('#avg-rating').textContent = parseFloat(stats.average_rating || 0).toFixed(1);

    // Rating breakdown
    const breakdownContainer = container.querySelector('#rating-breakdown');
    const breakdown = [
      { stars: 5, count: parseInt(stats.five_star || 0) },
      { stars: 4, count: parseInt(stats.four_star || 0) },
      { stars: 3, count: parseInt(stats.three_star || 0) },
      { stars: 2, count: parseInt(stats.two_star || 0) },
      { stars: 1, count: parseInt(stats.one_star || 0) }
    ];

    breakdown.forEach(item => {
      const percent = stats.total_reviews > 0 ? Math.round((item.count / stats.total_reviews) * 100) : 0;
      const bar = document.createElement('div');
      bar.className = 'flex items-center gap-2 text-sm';
      bar.innerHTML = `
        <span class="text-slate-600 dark:text-slate-400 w-8">${item.stars}<i class="fa-solid fa-star text-xs ml-1 text-yellow-400"></i></span>
        <div class="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div class="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full" style="width: ${percent}%"></div>
        </div>
        <span class="text-slate-600 dark:text-slate-400 w-12 text-right">${item.count}</span>
      `;
      breakdownContainer.appendChild(bar);
    });

    // Display reviews
    let displayedReviews = [...reviews];
    const reviewsList = container.querySelector('#reviews-list');

    function renderReviews() {
      reviewsList.innerHTML = '';

      if (displayedReviews.length === 0) {
        reviewsList.innerHTML = '<p class="text-center text-slate-500 dark:text-slate-400 py-8">No reviews match your filter</p>';
        return;
      }

      displayedReviews.forEach(review => {
        const reviewCard = document.createElement('div');
        reviewCard.className = 'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-4';

        const createdDate = new Date(review.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const wasEdited = review.updated_at && new Date(review.updated_at) > new Date(review.created_at);

        reviewCard.innerHTML = `
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              ${review.reader_avatar
                ? `<img src="${review.reader_avatar}" alt="${review.reader_name}" class="w-10 h-10 rounded-full object-cover">`
                : `<div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-lg font-bold text-indigo-600 dark:text-indigo-400">${review.reader_name.charAt(0)}</div>`
              }
              <div>
                <div class="font-semibold text-slate-900 dark:text-white">${review.reader_name}</div>
                <div class="text-sm text-slate-500 dark:text-slate-400">
                  ${createdDate}${wasEdited ? ' <span class="italic">(edited)</span>' : ''}
                </div>
              </div>
            </div>
          </div>

          <div id="stars-${review.id}" class="mb-3"></div>

          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">${review.title}</h3>
          <p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">${review.review_text}</p>

          <div class="flex items-center gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
            <span class="text-sm text-slate-600 dark:text-slate-400">
              <i class="fa-solid fa-thumbs-up mr-1"></i>
              ${review.helpful_count || 0} found helpful
            </span>
          </div>
        `;

        // Add stars
        const starsContainer = reviewCard.querySelector(`#stars-${review.id}`);
        const stars = RatingStars({ rating: review.rating, size: 'text-base' });
        starsContainer.appendChild(stars);

        reviewsList.appendChild(reviewCard);
      });
    }

    renderReviews();

    // Sort functionality
    const sortSelect = container.querySelector('#sort-select');
    sortSelect.addEventListener('change', () => {
      const sortBy = sortSelect.value;
      switch (sortBy) {
        case 'newest':
          displayedReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          break;
        case 'oldest':
          displayedReviews.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          break;
        case 'highest':
          displayedReviews.sort((a, b) => b.rating - a.rating);
          break;
        case 'lowest':
          displayedReviews.sort((a, b) => a.rating - b.rating);
          break;
        case 'helpful':
          displayedReviews.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
          break;
      }
      renderReviews();
    });

    // Filter functionality
    const filterSelect = container.querySelector('#filter-select');
    filterSelect.addEventListener('change', () => {
      const filterRating = filterSelect.value;
      if (filterRating === 'all') {
        displayedReviews = [...reviews];
      } else {
        displayedReviews = reviews.filter(r => r.rating === parseInt(filterRating));
      }
      renderReviews();
    });

  } catch (err) {
    container.querySelector('#loading').classList.add('hidden');
    container.innerHTML += `<div class="text-center py-12"><p class="text-red-500">Error loading reviews: ${err.message}</p></div>`;
  }

  return container;
}
