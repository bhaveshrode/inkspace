import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { notFound } from '../components/notFound.js';
import { RatingStars } from '../components/ratingStars.js';
import { showToast } from '../components/toast.js';

export async function workDetail(id) {
  const work = await store.getWorkById(id);
  if (!work) return notFound();

  const author = await store.getAuthorById(work.authorId);
  const container = document.createElement('div');
  container.className = 'fade-in max-w-5xl mx-auto px-4 py-8';

  let userRating = null;
  let isFollowing = false;
  let bookmark = null;

  if (store.currentReader) {
    try {
      userRating = await store.getUserRatingForBook(id);
      isFollowing = await store.isFollowingAuthor(work.authorId);
      bookmark = await store.hasBookmarkForBook(id);
    } catch (e) {
      console.error('Error loading reader data:', e);
    }
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8">
          <div class="flex justify-between items-start mb-6">
            <div>
              <h1 class="text-4xl font-bold text-slate-900 dark:text-white mb-2">${work.title}</h1>
              <p class="text-lg text-slate-600 dark:text-slate-400">
                by <span class="text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline" onclick="router.navigate('author-profile', {id: '${work.authorId}'})">${author.name}</span>
              </p>
            </div>
            ${store.currentReader ? `
              <button id="bookmark-btn" class="px-4 py-2 rounded-lg transition ${bookmark?.hasBookmark ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}">
                <i class="fa-${bookmark?.hasBookmark ? 'solid' : 'regular'} fa-bookmark mr-2"></i>
                ${bookmark?.hasBookmark ? 'Bookmarked' : 'Bookmark'}
              </button>
            ` : ''}
          </div>

          <div class="flex items-center gap-6 mb-6 text-sm text-slate-600 dark:text-slate-400">
            <span class="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">${work.genre}</span>
            ${work.series ? `<span><i class="fa-solid fa-layer-group mr-1"></i>${work.series}</span>` : ''}
            <span><i class="fa-solid fa-eye mr-1"></i>${work.views || 0} views</span>
            <span><i class="fa-solid fa-book mr-1"></i>${work.chapters.length} chapters</span>
          </div>

          <div id="rating-section" class="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
            <div id="average-rating-display"></div>
            ${store.currentReader ? '<div id="user-rating-display"></div>' : '<p class="text-sm text-slate-500 dark:text-slate-400"><a href="#" id="reader-login-link" class="text-indigo-600 hover:underline">Login</a> to rate this book</p>'}
          </div>

          <div class="flex flex-wrap gap-2 mb-6">
            ${(work.tags || []).map(t => `<span class="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">#${t}</span>`).join('')}
          </div>

          <p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-8">${work.description}</p>

          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Chapters</h2>
          <div class="space-y-2">
            ${work.chapters.map((ch, idx) => `
              <div class="p-4 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                   onclick="router.navigate('read', {id: '${work.id}', chapterIndex: ${idx}})">
                <div class="flex justify-between items-center">
                  <div>
                    <span class="text-sm text-slate-500 dark:text-slate-400">Chapter ${idx + 1}</span>
                    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">${ch.title}</h3>
                  </div>
                  <i class="fa-solid fa-chevron-right text-slate-400"></i>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="lg:col-span-1">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 sticky top-20">
          <div class="flex items-center gap-4 mb-4">
            ${author.avatar ? `<img src="${author.avatar}" alt="${author.name}" class="w-16 h-16 rounded-full object-cover">` : `<div class="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400">${author.name.charAt(0)}</div>`}
            <div>
              <h3 class="font-bold text-slate-900 dark:text-white">${author.name}</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">${author.followers || 0} followers</p>
            </div>
          </div>

          <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">${author.bio || 'Author'}</p>

          ${store.currentReader ? `
            <button id="follow-btn" class="w-full py-2 rounded-lg font-medium transition ${isFollowing ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}">
              <i class="fa-solid fa-${isFollowing ? 'user-check' : 'user-plus'} mr-2"></i>
              ${isFollowing ? 'Following' : 'Follow'}
            </button>
          ` : `
            <a href="#" id="reader-login-link-sidebar" class="block w-full py-2 text-center rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
              Login to Follow
            </a>
          `}
        </div>
      </div>
    </div>
  `;

  // Setup rating display
  const averageRatingDisplay = container.querySelector('#average-rating-display');
  if (averageRatingDisplay) {
    const ratingData = work.averageRating !== undefined ? { average: work.averageRating, count: work.ratingCount } : { average: 0, count: 0 };
    const avgStars = RatingStars({ rating: Math.round(ratingData.average), size: 'text-lg' });
    averageRatingDisplay.innerHTML = `
      <div class="flex items-center gap-2">
        <div>${avgStars.outerHTML}</div>
        <span class="text-sm text-slate-600 dark:text-slate-400">${ratingData.average.toFixed(1)} (${ratingData.count} ratings)</span>
      </div>
    `;
    averageRatingDisplay.appendChild(avgStars);
    averageRatingDisplay.querySelector('div').removeChild(avgStars);
    avgStars.remove();
  }

  if (store.currentReader) {
    const userRatingDisplay = container.querySelector('#user-rating-display');
    if (userRatingDisplay) {
      userRatingDisplay.innerHTML = `
        <div>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-2">Your rating:</p>
          <div id="user-rating-stars"></div>
        </div>
      `;
      const userRatingStars = RatingStars({
        rating: userRating || 0,
        interactive: true,
        onChange: async (rating) => {
          try {
            await store.rateBook(id, rating);
            showToast('Rating submitted!');
            router.render();
          } catch (e) {
            showToast(e.message, 'error');
          }
        }
      });
      userRatingDisplay.querySelector('#user-rating-stars').appendChild(userRatingStars);
    }

    const bookmarkBtn = container.querySelector('#bookmark-btn');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', async () => {
        try {
          await store.readerToggleBookmark(id);
          showToast(bookmark?.hasBookmark ? 'Bookmark removed' : 'Bookmarked!');
          router.render();
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    }

    const followBtn = container.querySelector('#follow-btn');
    if (followBtn) {
      followBtn.addEventListener('click', async () => {
        try {
          await store.readerToggleFollow(work.authorId);
          showToast(isFollowing ? 'Unfollowed' : 'Now following!');
          router.render();
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    }
  } else {
    const loginLinks = container.querySelectorAll('#reader-login-link, #reader-login-link-sidebar');
    loginLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        router.navigate('reader-login');
      });
    });
  }

  return container;
}
