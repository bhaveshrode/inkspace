import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { RatingStars } from '../components/ratingStars.js';
import { ReplyThread } from '../components/replyThread.js';

export async function authorDashboard() {
  const works = await store.getWorks();
  const myWorks = works.filter(w => w.authorId === store.currentUser.id);

  let stats = { totalRatings: 0, averageRating: 0, totalViews: 0 };
  let recentReviews = [];
  let recentComments = [];

  try {
    stats = await store.getAuthorStatistics();
    recentReviews = await store.getAuthorReviews();
    recentComments = await store.getAuthorComments();
  } catch (e) {
    console.error('Failed to load data:', e);
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
      <div class="flex gap-2">
        <button onclick="window.openProfileEditor()"
                class="bg-slate-600 text-white px-4 py-2 rounded hover:bg-slate-700">
          <i class="fa-solid fa-user-edit mr-2"></i>Edit Profile
        </button>
        <button onclick="router.navigate('add-work')"
                class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
          <i class="fa-solid fa-plus mr-2"></i>New Work
        </button>
      </div>
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
              <button onclick="router.navigate('book-reviews', {bookId: '${w.id}'})"
                      class="text-purple-600 hover:text-purple-700 px-3 py-1 rounded border border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition">
                <i class="fa-solid fa-comment-dots mr-1"></i>Reviews
              </button>
              <button onclick="window.viewBookRatings('${w.id}')"
                      class="text-yellow-600 hover:text-yellow-700 px-3 py-1 rounded border border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition">
                <i class="fa-solid fa-star mr-1"></i>Ratings
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

    <!-- Recent Reviews Section -->
    <div class="mt-8">
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Recent Reviews</h2>
      <div id="recent-reviews-container">
        ${recentReviews.length === 0 ? `
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 text-center text-slate-500 dark:text-slate-400">
            <i class="fa-solid fa-comment-dots text-4xl mb-3 opacity-50"></i>
            <p>No reviews yet</p>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Recent Comments Section -->
    <div class="mt-8">
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Recent Comments</h2>
      <div id="recent-comments-container">
        ${recentComments.length === 0 ? `
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 text-center text-slate-500 dark:text-slate-400">
            <i class="fa-solid fa-comments text-4xl mb-3 opacity-50"></i>
            <p>No comments yet</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Render recent reviews
  if (recentReviews.length > 0) {
    const reviewsContainer = container.querySelector('#recent-reviews-container');
    recentReviews.slice(0, 5).forEach(review => {
      const reviewCard = document.createElement('div');
      reviewCard.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-4';

      const reviewDate = new Date(review.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      reviewCard.innerHTML = `
        <div class="flex items-start gap-4">
          ${review.book_cover
            ? `<img src="${review.book_cover}" alt="${review.book_title}" class="w-16 h-16 rounded object-cover">`
            : `<div class="w-16 h-16 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><i class="fa-solid fa-book text-slate-400"></i></div>`
          }
          <div class="flex-1">
            <div class="flex items-start justify-between mb-2">
              <div>
                <h4 class="font-bold text-slate-900 dark:text-white">${review.book_title}</h4>
                <p class="text-sm text-slate-500 dark:text-slate-400">Review by ${review.reader_name}</p>
              </div>
              <button onclick="router.navigate('book-reviews', {bookId: '${review.book_id}'})" class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                View All
              </button>
            </div>
            <div id="review-stars-${review.id}" class="mb-2"></div>
            <h5 class="font-semibold text-slate-900 dark:text-white mb-1">${review.title}</h5>
            <p class="text-slate-700 dark:text-slate-300 text-sm line-clamp-2">${review.review_text}</p>
            <div class="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span><i class="fa-solid fa-thumbs-up mr-1"></i>${review.helpful_count || 0} helpful</span>
              <span>${reviewDate}</span>
            </div>
          </div>
        </div>
      `;

      const starsContainer = reviewCard.querySelector(`#review-stars-${review.id}`);
      const stars = RatingStars({ rating: review.rating, size: 'text-sm' });
      starsContainer.appendChild(stars);

      reviewsContainer.appendChild(reviewCard);
    });
  }

  // Render recent comments
  if (recentComments.length > 0) {
    const commentsContainer = container.querySelector('#recent-comments-container');
    recentComments.slice(0, 5).forEach(comment => {
      const commentCard = document.createElement('div');
      commentCard.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-4';

      const commentDate = new Date(comment.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      commentCard.innerHTML = `
        <div class="flex items-start gap-4">
          ${comment.book_cover
            ? `<img src="${comment.book_cover}" alt="${comment.book_title}" class="w-16 h-16 rounded object-cover">`
            : `<div class="w-16 h-16 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><i class="fa-solid fa-book text-slate-400"></i></div>`
          }
          <div class="flex-1">
            <div class="flex items-start justify-between mb-2">
              <div>
                <h4 class="font-bold text-slate-900 dark:text-white">${comment.book_title}</h4>
                <p class="text-sm text-slate-500 dark:text-slate-400">Comment by ${comment.user}</p>
              </div>
            </div>
            <p class="text-slate-700 dark:text-slate-300 text-sm">${comment.text}</p>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-2">${commentDate}</div>

            <!-- Reply Thread Container -->
            <div id="comment-reply-thread-${comment.id}" class="mt-3"></div>
          </div>
        </div>
      `;

      // Load reply thread for this comment
      loadCommentReplyThread(commentCard, comment.id, comment.book_id);

      commentsContainer.appendChild(commentCard);
    });

    // Function to load comment reply thread
    async function loadCommentReplyThread(commentCard, commentId, bookId) {
      const replyThreadContainer = commentCard.querySelector(`#comment-reply-thread-${commentId}`);
      if (!replyThreadContainer) return;

      try {
        const replies = await store.getCommentReplies(commentId);

        console.log('[AuthorDashboard] Loading comment reply thread for comment:', commentId, 'with', replies.length, 'replies');

        const replyThread = ReplyThread({
          replies,
          currentUserId: store.currentUser?.id,
          currentUserType: 'author',
          parentType: 'comment',
          parentId: commentId,
          onReply: async (text) => {
            await store.addCommentReply(commentId, text, bookId);
            // Reload reply thread
            await loadCommentReplyThread(commentCard, commentId, bookId);
          },
          onDelete: async (replyId) => {
            await store.deleteCommentReply(commentId, replyId, bookId);
            // Reload reply thread
            await loadCommentReplyThread(commentCard, commentId, bookId);
          }
        });

        replyThreadContainer.innerHTML = '';
        replyThreadContainer.appendChild(replyThread);
      } catch (err) {
        console.error('Error loading comment reply thread:', err);
        replyThreadContainer.innerHTML = '<p class="text-sm text-red-600 dark:text-red-400 mt-3">Failed to load replies</p>';
      }
    }
  }

  return container;
}

function openProfileEditor() {
  // Create modal with profile edit form
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Edit Profile</h2>
        <button id="close-modal" class="text-slate-400 hover:text-slate-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <form id="profile-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
          <input type="text" name="name" value="${store.currentUser.name}"
                 class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bio</label>
          <textarea name="bio" rows="4"
                    class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    maxlength="500">${store.currentUser.bio || ''}</textarea>
          <p class="text-xs text-slate-500 mt-1">Max 500 characters</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Avatar URL</label>
          <input type="url" name="avatar" value="${store.currentUser.avatar || ''}"
                 class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                 placeholder="https://example.com/avatar.jpg">
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Banner URL</label>
          <input type="url" name="banner" value="${store.currentUser.banner || ''}"
                 class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                 placeholder="https://example.com/banner.jpg">
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
          <input type="text" name="location" value="${store.currentUser.location || ''}"
                 class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                 placeholder="City, Country">
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website</label>
          <input type="url" name="website" value="${store.currentUser.website || ''}"
                 class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                 placeholder="https://yourwebsite.com">
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Twitter</label>
            <input type="text" name="twitter" value="${store.currentUser.twitter || ''}"
                   class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                   placeholder="@username or URL">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Instagram</label>
            <input type="text" name="instagram" value="${store.currentUser.instagram || ''}"
                   class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                   placeholder="@username or URL">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">LinkedIn</label>
            <input type="text" name="linkedin" value="${store.currentUser.linkedin || ''}"
                   class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                   placeholder="Profile URL">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GitHub</label>
            <input type="text" name="github" value="${store.currentUser.github || ''}"
                   class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                   placeholder="@username or URL">
          </div>
        </div>

        <div class="flex gap-3 pt-4">
          <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium">
            Save Changes
          </button>
          <button type="button" id="cancel-btn" class="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  modal.querySelector('#close-modal').addEventListener('click', () => modal.remove());
  modal.querySelector('#cancel-btn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Form submit
  modal.querySelector('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      await store.updateAuthorProfile(data);
      modal.remove();
      if (window.showToast) {
        window.showToast('Profile updated successfully', 'success');
      }
      // Reload page to show updates
      window.location.reload();
    } catch (err) {
      console.error('Profile update error:', err);
      if (window.showToast) {
        window.showToast('Failed to update profile', 'error');
      }
    }
  });
}

// Export for use in dashboard
window.openProfileEditor = openProfileEditor;
