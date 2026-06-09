import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { RatingStars } from '../components/ratingStars.js';

export async function bookRatings(bookId) {
  if (!store.currentUser) {
    router.navigate('author-login');
    return document.createElement('div');
  }

  const container = document.createElement('div');
  container.className = 'fade-in max-w-5xl mx-auto px-4 py-8';

  try {
    const book = await store.getWorkById(bookId);
    if (!book) {
      container.innerHTML = '<p class="text-center text-red-500">Book not found</p>';
      return container;
    }

    if (book.authorId !== store.currentUser.id) {
      container.innerHTML = '<p class="text-center text-red-500">You do not have permission to view these ratings</p>';
      return container;
    }

    const { breakdown, detailed } = await store.getBookDetailedRatings(bookId);
    const totalRatings = detailed.length;
    const avgRating = totalRatings > 0
      ? (Object.entries(breakdown).reduce((sum, [star, count]) => sum + (parseInt(star) * count), 0) / totalRatings).toFixed(1)
      : 0;

    container.innerHTML = `
      <div class="mb-6">
        <button onclick="router.navigate('author-dashboard')" class="text-indigo-600 hover:text-indigo-700 mb-4 inline-flex items-center">
          <i class="fa-solid fa-arrow-left mr-2"></i>Back to Dashboard
        </button>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">${book.title}</h1>
        <p class="text-slate-600 dark:text-slate-400">Rating Details</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="text-center">
            <div class="text-6xl font-bold text-slate-900 dark:text-white mb-2">${avgRating}</div>
            <div id="average-stars" class="flex justify-center mb-2"></div>
            <div class="text-slate-600 dark:text-slate-400">${totalRatings} total ratings</div>
          </div>

          <div class="space-y-2">
            ${[5, 4, 3, 2, 1].map(star => {
              const count = breakdown[star] || 0;
              const percentage = totalRatings > 0 ? (count / totalRatings * 100).toFixed(0) : 0;
              return `
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium w-12">${star} star</span>
                  <div class="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                    <div class="bg-yellow-400 h-full transition-all" style="width: ${percentage}%"></div>
                  </div>
                  <span class="text-sm text-slate-600 dark:text-slate-400 w-12 text-right">${count}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
          <i class="fa-solid fa-comments mr-2 text-indigo-600"></i>
          Individual Ratings
        </h2>
        <div id="ratings-list" class="space-y-4">
          ${detailed.length === 0
            ? '<p class="text-center text-slate-500 dark:text-slate-400 py-8">No ratings yet for this book.</p>'
            : ''
          }
        </div>
      </div>
    `;

    const avgStarsContainer = container.querySelector('#average-stars');
    avgStarsContainer.appendChild(RatingStars({ rating: Math.round(parseFloat(avgRating)), size: 'text-2xl' }));

    const ratingsList = container.querySelector('#ratings-list');
    detailed.forEach(rating => {
      const ratingCard = document.createElement('div');
      ratingCard.className = 'border-b border-slate-200 dark:border-slate-700 pb-4 last:border-b-0';

      const ratingDate = new Date(rating.created_at);
      const formattedDate = ratingDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      ratingCard.innerHTML = `
        <div class="flex items-start gap-4">
          ${rating.reader_avatar
            ? `<img src="${rating.reader_avatar}" alt="${rating.reader_name}" class="w-12 h-12 rounded-full object-cover">`
            : `<div class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                 <span class="text-xl font-bold text-indigo-600 dark:text-indigo-400">${rating.reader_name.charAt(0)}</span>
               </div>`
          }
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <h3 class="font-bold text-slate-900 dark:text-white">${rating.reader_name}</h3>
              <span class="text-xs text-slate-500 dark:text-slate-400">${formattedDate}</span>
            </div>
            <div id="rating-stars-${rating.id}"></div>
          </div>
        </div>
      `;

      ratingsList.appendChild(ratingCard);

      const starsContainer = ratingCard.querySelector(`#rating-stars-${rating.id}`);
      starsContainer.appendChild(RatingStars({ rating: rating.rating, size: 'text-lg' }));
    });

  } catch (err) {
    console.error('Failed to load ratings:', err);
    container.innerHTML = `
      <div class="text-center text-red-500 py-8">
        <p>Failed to load ratings: ${err.message}</p>
        <button onclick="router.navigate('author-dashboard')" class="mt-4 text-indigo-600 hover:text-indigo-700">
          Back to Dashboard
        </button>
      </div>
    `;
  }

  return container;
}
