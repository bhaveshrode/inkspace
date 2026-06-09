import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { notFound } from '../components/notFound.js';
import { RatingStars } from '../components/ratingStars.js';
import { showToast } from '../components/toast.js';
import { ReviewCard } from '../components/reviewCard.js';
import { ReviewForm } from '../components/reviewForm.js';
import { ReplyThread } from '../components/replyThread.js';

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

          <!-- Tabs Navigation -->
          <div class="border-b border-slate-200 dark:border-slate-700 mb-6">
            <div class="flex gap-6">
              <button id="tab-chapters" class="tab-button active pb-3 px-1 text-sm font-medium border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400">
                Chapters (${work.chapters.length})
              </button>
              <button id="tab-reviews" class="tab-button pb-3 px-1 text-sm font-medium border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                Reviews
              </button>
              <button id="tab-comments" class="tab-button pb-3 px-1 text-sm font-medium border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                Comments
              </button>
            </div>
          </div>

          <!-- Tab Content -->
          <div id="tab-content-chapters" class="tab-content">
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

          <div id="tab-content-reviews" class="tab-content hidden">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Reviews</h2>
            <div id="reviews-container">Loading reviews...</div>
          </div>

          <div id="tab-content-comments" class="tab-content hidden">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Comments</h2>
            <div id="comments-container">Loading comments...</div>
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
        <div id="avg-stars-container"></div>
        <span class="text-sm text-slate-600 dark:text-slate-400">${ratingData.average.toFixed(1)} (${ratingData.count} ratings)</span>
      </div>
    `;
    averageRatingDisplay.querySelector('#avg-stars-container').appendChild(avgStars);
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

  // Tab switching logic
  const tabs = container.querySelectorAll('.tab-button');
  const tabContents = container.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.id.replace('tab-', '');

      // Update active states
      tabs.forEach(t => {
        t.classList.remove('active', 'border-indigo-600', 'text-indigo-600', 'dark:text-indigo-400');
        t.classList.add('border-transparent', 'text-slate-500', 'dark:text-slate-400');
      });
      tab.classList.add('active', 'border-indigo-600', 'text-indigo-600', 'dark:text-indigo-400');
      tab.classList.remove('border-transparent', 'text-slate-500', 'dark:text-slate-400');

      // Show/hide content
      tabContents.forEach(content => content.classList.add('hidden'));
      container.querySelector(`#tab-content-${tabName}`).classList.remove('hidden');

      // Load data if needed
      if (tabName === 'reviews') {
        loadReviews();
      } else if (tabName === 'comments') {
        loadComments();
      }
    });
  });

  // Load reviews
  let reviewsLoaded = false;
  async function loadReviews() {
    if (reviewsLoaded) return;
    reviewsLoaded = true;

    const reviewsContainer = container.querySelector('#reviews-container');
    reviewsContainer.innerHTML = '<div class="text-center py-8"><i class="fa-solid fa-spinner fa-spin text-2xl text-slate-400"></i></div>';

    try {
      const reviews = await store.getReviews(id);
      let userReview = null;
      let helpfulVotes = [];

      if (store.currentReader) {
        userReview = await store.getUserReview(id);
        helpfulVotes = await store.getReaderHelpfulVotes(id);
      }

      reviewsContainer.innerHTML = '';

      // Show review form for logged-in readers
      if (store.currentReader) {
        const formContainer = document.createElement('div');
        formContainer.className = 'mb-6';

        if (userReview && userReview.id) {
          // User has already reviewed - show edit option
          formContainer.innerHTML = `
            <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-4">
              <p class="text-sm text-indigo-900 dark:text-indigo-100">
                You've already reviewed this book.
                <button id="edit-review-btn" class="text-indigo-600 dark:text-indigo-400 underline hover:no-underline">Edit your review</button>
              </p>
            </div>
          `;
          reviewsContainer.appendChild(formContainer);

          const editBtn = formContainer.querySelector('#edit-review-btn');
          editBtn.addEventListener('click', () => {
            showReviewForm(userReview);
          });
        } else {
          // Show review form
          showReviewForm();
        }
      } else {
        const loginPrompt = document.createElement('div');
        loginPrompt.className = 'bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6 text-center';
        loginPrompt.innerHTML = `
          <p class="text-slate-600 dark:text-slate-400">
            <a href="#" id="login-to-review" class="text-indigo-600 dark:text-indigo-400 hover:underline">Login</a> to write a review
          </p>
        `;
        reviewsContainer.appendChild(loginPrompt);

        loginPrompt.querySelector('#login-to-review').addEventListener('click', (e) => {
          e.preventDefault();
          router.navigate('reader-login');
        });
      }

      // Display reviews
      if (reviews.length === 0) {
        const noReviews = document.createElement('div');
        noReviews.className = 'text-center py-8 text-slate-500 dark:text-slate-400';
        noReviews.innerHTML = '<p>No reviews yet. Be the first to review!</p>';
        reviewsContainer.appendChild(noReviews);
      } else {
        const isAuthor = store.currentUser && work.authorId === store.currentUser.id;
        reviews.forEach(review => {
          const reviewCard = ReviewCard({
            review,
            currentReaderId: store.currentReader?.id,
            hasVotedHelpful: helpfulVotes.includes(review.id),
            isAuthor,
            bookId: id,
            authorName: author.name,
            onReplyUpdate: () => {
              reviewsLoaded = false;
              loadReviews();
            },
            onDelete: async (reviewId) => {
              try {
                await store.deleteReview(id);
                showToast('Review deleted');
                reviewsLoaded = false;
                loadReviews();
              } catch (err) {
                showToast(err.message, 'error');
              }
            },
            onEdit: (review) => {
              showReviewForm(review);
            },
            onHelpful: async (reviewId) => {
              try {
                const result = await store.markReviewHelpful(reviewId);
                if (result && result.success === false) {
                  showToast(result.message || 'You have already marked this review as helpful', 'error');
                } else if (result && result.success === true) {
                  showToast('Marked as helpful');
                  reviewsLoaded = false;
                  loadReviews();
                } else {
                  // Fallback for unexpected response
                  showToast('Marked as helpful');
                  reviewsLoaded = false;
                  loadReviews();
                }
              } catch (err) {
                showToast(err.message, 'error');
              }
            }
          });
          reviewsContainer.appendChild(reviewCard);
        });
      }
    } catch (err) {
      reviewsContainer.innerHTML = `<p class="text-red-500">Error loading reviews: ${err.message}</p>`;
    }
  }

  function showReviewForm(existingReview = null) {
    const reviewsContainer = container.querySelector('#reviews-container');
    reviewsContainer.innerHTML = '';

    const form = ReviewForm({
      existingReview,
      onSubmit: async (data) => {
        await store.submitReview(id, data);
        reviewsLoaded = false;
        loadReviews();
      },
      onCancel: () => {
        reviewsLoaded = false;
        loadReviews();
      }
    });
    reviewsContainer.appendChild(form);
  }

  // Load comments
  let commentsLoaded = false;
  async function loadComments() {
    if (commentsLoaded) return;
    commentsLoaded = true;

    const commentsContainer = container.querySelector('#comments-container');
    commentsContainer.innerHTML = '<div class="text-center py-8"><i class="fa-solid fa-spinner fa-spin text-2xl text-slate-400"></i></div>';

    try {
      const comments = await store.getCommentsForBook(id);

      // Validate that comments is an array
      if (!Array.isArray(comments)) {
        throw new Error('Invalid response from server');
      }

      commentsContainer.innerHTML = '';

      // Comment form for logged-in readers
      if (store.currentReader) {
        const formContainer = document.createElement('div');
        formContainer.className = 'mb-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4';
        formContainer.innerHTML = `
          <h3 class="font-semibold text-slate-900 dark:text-white mb-3">Add a Comment</h3>
          <form id="comment-form">
            <textarea
              id="comment-text"
              rows="3"
              placeholder="Share your thoughts..."
              class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none mb-3"
            ></textarea>
            <button
              type="submit"
              class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Post Comment
            </button>
          </form>
        `;
        commentsContainer.appendChild(formContainer);

        const commentForm = formContainer.querySelector('#comment-form');
        commentForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const text = formContainer.querySelector('#comment-text').value.trim();
          if (!text) return;

          try {
            await store.addCommentAsReader(id, text);
            showToast('Comment added!');
            commentsLoaded = false;
            loadComments();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      } else {
        const loginPrompt = document.createElement('div');
        loginPrompt.className = 'bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6 text-center';
        loginPrompt.innerHTML = `
          <p class="text-slate-600 dark:text-slate-400">
            <a href="#" id="login-to-comment" class="text-indigo-600 dark:text-indigo-400 hover:underline">Login</a> to comment
          </p>
        `;
        commentsContainer.appendChild(loginPrompt);

        loginPrompt.querySelector('#login-to-comment').addEventListener('click', (e) => {
          e.preventDefault();
          router.navigate('reader-login');
        });
      }

      // Display comments
      if (comments.length === 0) {
        const noComments = document.createElement('div');
        noComments.className = 'text-center py-8 text-slate-500 dark:text-slate-400';
        noComments.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
        commentsContainer.appendChild(noComments);
      } else {
        const commentsListContainer = document.createElement('div');
        commentsListContainer.className = 'space-y-4';
        const isAuthor = store.currentUser && work.authorId === store.currentUser.id;

        comments.forEach(async (comment) => {
          const commentCard = document.createElement('div');
          commentCard.className = 'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4';

          const isOwner = store.currentReader && comment.reader_id === store.currentReader.id;
          const commentDate = new Date(comment.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          commentCard.innerHTML = `
            <div class="flex items-start gap-3">
              ${comment.avatar
                ? `<img src="${comment.avatar}" alt="${comment.user}" class="w-8 h-8 rounded-full object-cover">`
                : `<div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">${comment.user.charAt(0)}</div>`
              }
              <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                  <div>
                    <span class="font-semibold text-slate-900 dark:text-white">${comment.user}</span>
                    <span class="text-sm text-slate-500 dark:text-slate-400 ml-2">${commentDate}</span>
                  </div>
                  ${isOwner ? `
                    <button id="delete-comment-${comment.id}" class="text-sm text-red-600 hover:text-red-700 dark:text-red-400">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  ` : ''}
                </div>
                <p class="text-slate-700 dark:text-slate-300 mb-2">${comment.text}</p>
                <div id="comment-reply-thread-${comment.id}"></div>
              </div>
            </div>
          `;

          if (isOwner) {
            const deleteBtn = commentCard.querySelector(`#delete-comment-${comment.id}`);
            deleteBtn.addEventListener('click', async () => {
              if (confirm('Delete this comment?')) {
                try {
                  await store.deleteComment(comment.id);
                  showToast('Comment deleted');
                  commentsLoaded = false;
                  loadComments();
                } catch (err) {
                  showToast(err.message, 'error');
                }
              }
            });
          }

          // Load reply thread for this comment
          loadCommentReplyThread(commentCard, comment.id, id, author.name);

          commentsListContainer.appendChild(commentCard);
        });

        commentsContainer.appendChild(commentsListContainer);
      }
    } catch (err) {
      commentsContainer.innerHTML = `<p class="text-red-500">Error loading comments: ${err.message}</p>`;
    }
  }

  async function loadCommentReplyThread(commentCard, commentId, bookId, authorName) {
    const replyThreadContainer = commentCard.querySelector(`#comment-reply-thread-${commentId}`);
    if (!replyThreadContainer) return;

    try {
      // Fetch replies
      const replies = await store.getCommentReplies(commentId);

      // Determine current user
      let currentUserId = null;
      let currentUserType = null;
      if (store.currentUser) {
        currentUserId = store.currentUser.id;
        currentUserType = 'author';
      } else if (store.currentReader) {
        currentUserId = store.currentReader.id;
        currentUserType = 'reader';
      }

      // Create reply thread
      const replyThread = ReplyThread({
        replies,
        onReply: async (text) => {
          await store.addCommentReply(commentId, text, bookId);
          // Reload reply thread
          await loadCommentReplyThread(commentCard, commentId, bookId, authorName);
        },
        onDelete: async (replyId) => {
          await store.deleteCommentReply(commentId, replyId, bookId);
          showToast('Reply deleted');
          // Reload reply thread
          await loadCommentReplyThread(commentCard, commentId, bookId, authorName);
        },
        currentUserId,
        currentUserType,
        parentType: 'comment',
        parentId: commentId
      });

      replyThreadContainer.innerHTML = '';
      replyThreadContainer.appendChild(replyThread);
    } catch (err) {
      console.error('Error loading comment reply thread:', err);
      replyThreadContainer.innerHTML = '<p class="text-sm text-red-600 dark:text-red-400 mt-2">Failed to load replies</p>';
    }
  }

  return container;
}
