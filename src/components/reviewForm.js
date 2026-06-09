import { RatingStars } from './ratingStars.js';
import { showToast } from './toast.js';

export function ReviewForm({ existingReview, onSubmit, onCancel }) {
  const container = document.createElement('div');
  container.className = 'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6';

  let selectedRating = existingReview?.rating || 0;

  container.innerHTML = `
    <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">
      ${existingReview ? 'Edit Your Review' : 'Write a Review'}
    </h3>

    <form id="review-form">
      <div class="mb-4">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Rating <span class="text-red-500">*</span>
        </label>
        <div id="rating-stars-container"></div>
        <div id="rating-error" class="text-sm text-red-500 mt-1 hidden">Please select a rating</div>
      </div>

      <div class="mb-4">
        <label for="review-title" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Review Title <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="review-title"
          maxlength="100"
          placeholder="Sum up your experience in one line"
          value="${existingReview?.title || ''}"
          class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span id="title-count">0</span>/100 characters
        </div>
      </div>

      <div class="mb-4">
        <label for="review-text" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Your Review <span class="text-red-500">*</span>
        </label>
        <textarea
          id="review-text"
          rows="6"
          maxlength="2000"
          placeholder="Share your thoughts about this book (minimum 50 characters)"
          class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        >${existingReview?.review_text || ''}</textarea>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span id="text-count">0</span>/2000 characters (minimum 50)
        </div>
      </div>

      <div class="flex gap-3">
        <button
          type="submit"
          id="submit-btn"
          class="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          ${existingReview ? 'Update Review' : 'Submit Review'}
        </button>
        ${onCancel ? `
          <button
            type="button"
            id="cancel-btn"
            class="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium"
          >
            Cancel
          </button>
        ` : ''}
      </div>
    </form>
  `;

  // Add interactive rating stars
  const ratingContainer = container.querySelector('#rating-stars-container');
  const ratingStars = RatingStars({
    rating: selectedRating,
    interactive: true,
    size: 'text-2xl',
    onChange: (rating) => {
      selectedRating = rating;
      container.querySelector('#rating-error').classList.add('hidden');
    }
  });
  ratingContainer.appendChild(ratingStars);

  // Character counters
  const titleInput = container.querySelector('#review-title');
  const textArea = container.querySelector('#review-text');
  const titleCount = container.querySelector('#title-count');
  const textCount = container.querySelector('#text-count');

  function updateCounts() {
    titleCount.textContent = titleInput.value.length;
    textCount.textContent = textArea.value.length;
  }

  titleInput.addEventListener('input', updateCounts);
  textArea.addEventListener('input', updateCounts);
  updateCounts();

  // Form submission
  const form = container.querySelector('#review-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const reviewText = textArea.value.trim();

    // Validation
    let hasError = false;

    if (selectedRating === 0) {
      container.querySelector('#rating-error').classList.remove('hidden');
      hasError = true;
    }

    if (!title) {
      showToast('Please enter a review title', 'error');
      hasError = true;
    }

    if (reviewText.length < 50) {
      showToast('Review must be at least 50 characters', 'error');
      hasError = true;
    }

    if (hasError) return;

    // Submit
    try {
      const submitBtn = container.querySelector('#submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      await onSubmit({
        rating: selectedRating,
        title,
        reviewText
      });

      showToast(existingReview ? 'Review updated!' : 'Review submitted!');
    } catch (err) {
      showToast(err.message, 'error');
      const submitBtn = container.querySelector('#submit-btn');
      submitBtn.disabled = false;
      submitBtn.textContent = existingReview ? 'Update Review' : 'Submit Review';
    }
  });

  // Cancel button
  if (onCancel) {
    const cancelBtn = container.querySelector('#cancel-btn');
    cancelBtn.addEventListener('click', onCancel);
  }

  return container;
}
