import { RatingStars } from './ratingStars.js';
import { showToast } from './toast.js';
import { store } from '../store/index.js';

export function ReviewCard({ review, currentReaderId, onDelete, onEdit, onHelpful }) {
  const card = document.createElement('div');
  card.className = 'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-4';

  const isOwner = currentReaderId && review.reader_id === currentReaderId;
  const createdDate = new Date(review.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const wasEdited = review.updated_at && new Date(review.updated_at) > new Date(review.created_at);

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

    <div class="flex items-center gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
      <button id="helpful-btn-${review.id}" class="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition ${!currentReaderId ? 'opacity-50 cursor-not-allowed' : ''}">
        <i class="fa-solid fa-thumbs-up mr-1"></i>
        Helpful (${review.helpful_count || 0})
      </button>
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
  if (helpfulBtn && currentReaderId && onHelpful) {
    helpfulBtn.addEventListener('click', async () => {
      await onHelpful(review.id);
    });
  } else if (!currentReaderId) {
    helpfulBtn.style.cursor = 'not-allowed';
  }

  return card;
}
