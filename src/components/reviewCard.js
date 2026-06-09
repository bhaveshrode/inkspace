import { RatingStars } from './ratingStars.js';
import { showToast } from './toast.js';
import { store } from '../store/index.js';

export function ReviewCard({ review, currentReaderId, onDelete, onEdit, onHelpful, hasVotedHelpful = false, isAuthor = false, bookId = null, onReplyUpdate = null, authorName = 'Author' }) {
  const card = document.createElement('div');
  card.className = 'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-4';

  const isOwner = currentReaderId && review.reader_id === currentReaderId;
  const createdDate = new Date(review.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const wasEdited = review.updated_at && new Date(review.updated_at) > new Date(review.created_at);

  const hasReply = review.author_reply && review.author_reply.trim().length > 0;
  const replyDate = hasReply && review.author_reply_at ? new Date(review.author_reply_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  card.innerHTML = `
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
      ${isOwner ? `
        <div class="flex gap-2">
          <button id="edit-btn-${review.id}" class="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            <i class="fa-solid fa-edit mr-1"></i>Edit
          </button>
          <button id="delete-btn-${review.id}" class="text-sm text-red-600 hover:text-red-700 dark:text-red-400">
            <i class="fa-solid fa-trash mr-1"></i>Delete
          </button>
        </div>
      ` : ''}
    </div>

    <div id="stars-container-${review.id}" class="mb-3"></div>

    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">${review.title}</h3>
    <p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">${review.review_text}</p>

    ${hasReply ? `
      <div class="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 rounded-lg p-4 mb-4">
        <div class="flex items-start gap-3">
          <i class="fa-solid fa-book text-indigo-600 dark:text-indigo-400 mt-1"></i>
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <div>
                <span class="font-semibold text-indigo-900 dark:text-indigo-100">${authorName}</span>
                <span class="ml-2 px-2 py-0.5 bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs rounded-full font-medium">Author</span>
              </div>
              ${isAuthor ? `
                <div class="flex gap-2">
                  <button id="edit-reply-btn-${review.id}" class="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                    <i class="fa-solid fa-edit"></i>
                  </button>
                  <button id="delete-reply-btn-${review.id}" class="text-sm text-red-600 hover:text-red-700 dark:text-red-400">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              ` : ''}
            </div>
            <p class="text-indigo-900 dark:text-indigo-100 leading-relaxed">${review.author_reply}</p>
            <p class="text-sm text-indigo-600 dark:text-indigo-400 mt-2">${replyDate}</p>
          </div>
        </div>
      </div>
    ` : ''}

    ${isAuthor && !hasReply ? `
      <div id="reply-section-${review.id}" class="mb-4"></div>
    ` : ''}

    <div class="flex items-center gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
      <button id="helpful-btn-${review.id}" class="text-sm transition ${
        hasVotedHelpful
          ? 'text-green-600 dark:text-green-400 cursor-default font-medium'
          : !currentReaderId
            ? 'text-slate-600 dark:text-slate-400 opacity-50 cursor-not-allowed'
            : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer'
      }" ${hasVotedHelpful || !currentReaderId ? 'disabled' : ''}>
        <i class="fa-${hasVotedHelpful ? 'solid' : 'regular'} fa-thumbs-up mr-1"></i>
        ${hasVotedHelpful ? 'You found this helpful' : 'Helpful'} (${review.helpful_count || 0})
      </button>
      ${isAuthor && !hasReply ? `
        <button id="reply-btn-${review.id}" class="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
          <i class="fa-solid fa-reply mr-1"></i>Reply
        </button>
      ` : ''}
    </div>
  `;

  // Add rating stars
  const starsContainer = card.querySelector(`#stars-container-${review.id}`);
  const stars = RatingStars({ rating: review.rating, size: 'text-base' });
  starsContainer.appendChild(stars);

  // Event listeners
  if (isOwner) {
    const editBtn = card.querySelector(`#edit-btn-${review.id}`);
    const deleteBtn = card.querySelector(`#delete-btn-${review.id}`);

    if (editBtn && onEdit) {
      editBtn.addEventListener('click', () => onEdit(review));
    }

    if (deleteBtn && onDelete) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this review?')) {
          await onDelete(review.id);
        }
      });
    }
  }

  const helpfulBtn = card.querySelector(`#helpful-btn-${review.id}`);
  if (helpfulBtn && currentReaderId && onHelpful && !hasVotedHelpful) {
    helpfulBtn.addEventListener('click', async () => {
      await onHelpful(review.id);
    });
  }

  // Reply functionality for authors
  if (isAuthor && bookId) {
    const replyBtn = card.querySelector(`#reply-btn-${review.id}`);
    const editReplyBtn = card.querySelector(`#edit-reply-btn-${review.id}`);
    const deleteReplyBtn = card.querySelector(`#delete-reply-btn-${review.id}`);

    function showReplyForm(existingReply = '') {
      const replySection = card.querySelector(`#reply-section-${review.id}`);
      if (!replySection) return;

      replySection.innerHTML = `
        <div class="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h4 class="font-semibold text-slate-900 dark:text-white mb-3">Reply to Review</h4>
          <textarea
            id="reply-text-${review.id}"
            rows="3"
            placeholder="Write your reply..."
            class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none mb-2"
          >${existingReply}</textarea>
          <div class="flex items-center justify-between">
            <span id="char-count-${review.id}" class="text-sm text-slate-500 dark:text-slate-400">
              ${existingReply.length}/2000 characters
            </span>
            <div class="flex gap-2">
              <button id="cancel-reply-${review.id}" class="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                Cancel
              </button>
              <button id="submit-reply-${review.id}" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
                Submit Reply
              </button>
            </div>
          </div>
        </div>
      `;

      const textarea = replySection.querySelector(`#reply-text-${review.id}`);
      const charCount = replySection.querySelector(`#char-count-${review.id}`);
      const cancelBtn = replySection.querySelector(`#cancel-reply-${review.id}`);
      const submitBtn = replySection.querySelector(`#submit-reply-${review.id}`);

      textarea.addEventListener('input', () => {
        charCount.textContent = `${textarea.value.length}/2000 characters`;
        if (textarea.value.length > 2000) {
          charCount.classList.add('text-red-600');
          submitBtn.disabled = true;
        } else {
          charCount.classList.remove('text-red-600');
          submitBtn.disabled = false;
        }
      });

      cancelBtn.addEventListener('click', () => {
        replySection.innerHTML = '';
      });

      submitBtn.addEventListener('click', async () => {
        const replyText = textarea.value.trim();
        if (!replyText) {
          showToast('Please enter a reply', 'error');
          return;
        }
        if (replyText.length > 2000) {
          showToast('Reply must be 2000 characters or less', 'error');
          return;
        }

        try {
          await store.replyToReview(bookId, review.id, replyText);
          showToast('Reply posted!');
          if (onReplyUpdate) onReplyUpdate();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });

      textarea.focus();
    }

    if (replyBtn) {
      replyBtn.addEventListener('click', () => showReplyForm());
    }

    if (editReplyBtn) {
      editReplyBtn.addEventListener('click', () => showReplyForm(review.author_reply || ''));
    }

    if (deleteReplyBtn) {
      deleteReplyBtn.addEventListener('click', async () => {
        if (confirm('Delete your reply?')) {
          try {
            await store.deleteReviewReply(bookId, review.id);
            showToast('Reply deleted');
            if (onReplyUpdate) onReplyUpdate();
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    }
  }

  return card;
}
