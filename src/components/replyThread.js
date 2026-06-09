import { showToast } from './toast.js';
import { store } from '../store/index.js';

export function ReplyThread({
  replies = [],
  onReply,
  onDelete,
  currentUserId = null,
  currentUserType = null,
  parentType = 'review', // 'review' or 'comment'
  parentId = null
}) {
  console.log('[ReplyThread] Creating reply thread:', {
    repliesCount: replies.length,
    currentUserId,
    currentUserType,
    parentType,
    parentId
  });

  const container = document.createElement('div');
  container.className = 'mt-4 border-t border-slate-200 dark:border-slate-700 pt-4';

  if (!replies || replies.length === 0) {
    container.innerHTML = `
      <div class="text-sm text-slate-500 dark:text-slate-400 mb-3">
        No replies yet. Be the first to reply!
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="mb-3">
        <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Replies (${replies.length})
        </h4>
      </div>
    `;

    const repliesContainer = document.createElement('div');
    repliesContainer.className = 'space-y-3 mb-4';

    replies.forEach(reply => {
      const replyEl = createReplyElement(reply, currentUserId, currentUserType, onDelete);
      repliesContainer.appendChild(replyEl);
    });

    container.appendChild(repliesContainer);
  }

  // Add reply form for authenticated users
  if (currentUserId && currentUserType) {
    console.log('[ReplyThread] Adding reply button for authenticated user');
    const replyFormSection = document.createElement('div');
    replyFormSection.id = `reply-form-section-${parentId}`;
    replyFormSection.className = 'mt-3';

    const replyButton = document.createElement('button');
    replyButton.id = `show-reply-form-${parentId}`;
    replyButton.className = 'text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium';
    replyButton.innerHTML = '<i class="fa-solid fa-reply mr-1"></i>Reply';

    replyButton.addEventListener('click', () => {
      showReplyForm(replyFormSection, parentType, parentId, onReply, currentUserType);
      replyButton.style.display = 'none';
    });

    replyFormSection.appendChild(replyButton);
    container.appendChild(replyFormSection);
  } else {
    console.log('[ReplyThread] NOT adding reply button - currentUserId:', currentUserId, 'currentUserType:', currentUserType);
  }

  return container;
}

function createReplyElement(reply, currentUserId, currentUserType, onDelete) {
  const replyEl = document.createElement('div');
  replyEl.className = 'bg-slate-50 dark:bg-slate-700/50 border-l-3 border-indigo-400 rounded-lg p-4';

  const isAuthor = reply.user_type === 'author';
  const isOwner = currentUserId && reply.user_id === currentUserId && reply.user_type === currentUserType;

  const replyDate = new Date(reply.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  replyEl.innerHTML = `
    <div class="flex items-start justify-between mb-2">
      <div class="flex items-center gap-2">
        ${reply.user_avatar
          ? `<img src="${reply.user_avatar}" alt="${reply.user_name}" class="w-8 h-8 rounded-full object-cover">`
          : `<div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">${reply.user_name.charAt(0)}</div>`
        }
        <div>
          <span class="font-semibold text-slate-900 dark:text-white text-sm">${reply.user_name}</span>
          ${isAuthor ? `<span class="ml-2 px-2 py-0.5 bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs rounded-full font-medium">Author</span>` : ''}
        </div>
      </div>
      ${isOwner ? `
        <button id="delete-reply-${reply.id}" class="text-sm text-red-600 hover:text-red-700 dark:text-red-400">
          <i class="fa-solid fa-trash"></i>
        </button>
      ` : ''}
    </div>
    <p class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-1">${reply.text}</p>
    <p class="text-xs text-slate-500 dark:text-slate-400">${replyDate}</p>
  `;

  if (isOwner && onDelete) {
    const deleteBtn = replyEl.querySelector(`#delete-reply-${reply.id}`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Delete this reply?')) {
          await onDelete(reply.id);
        }
      });
    }
  }

  return replyEl;
}

function showReplyForm(container, parentType, parentId, onReply, currentUserType) {
  const formId = `reply-form-${parentId}`;
  const textareaId = `reply-text-${parentId}`;
  const charCountId = `char-count-${parentId}`;

  container.innerHTML = `
    <div id="${formId}" class="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
      <h4 class="font-semibold text-slate-900 dark:text-white mb-3 text-sm">Write a Reply</h4>
      <textarea
        id="${textareaId}"
        rows="3"
        placeholder="Share your thoughts..."
        class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none mb-2 text-sm"
      ></textarea>
      <div class="flex items-center justify-between">
        <span id="${charCountId}" class="text-sm text-slate-500 dark:text-slate-400">
          0/2000 characters
        </span>
        <div class="flex gap-2">
          <button id="cancel-reply-${parentId}" class="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            Cancel
          </button>
          <button id="submit-reply-${parentId}" class="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
            Post Reply
          </button>
        </div>
      </div>
    </div>
  `;

  const textarea = container.querySelector(`#${textareaId}`);
  const charCount = container.querySelector(`#${charCountId}`);
  const cancelBtn = container.querySelector(`#cancel-reply-${parentId}`);
  const submitBtn = container.querySelector(`#submit-reply-${parentId}`);

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
    const replyButton = document.querySelector(`#show-reply-form-${parentId}`);
    if (replyButton) replyButton.style.display = 'inline-block';
    container.innerHTML = `
      <button id="show-reply-form-${parentId}" class="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium">
        <i class="fa-solid fa-reply mr-1"></i>Reply
      </button>
    `;
    const newBtn = container.querySelector(`#show-reply-form-${parentId}`);
    newBtn.addEventListener('click', () => {
      showReplyForm(container, parentType, parentId, onReply, currentUserType);
      newBtn.style.display = 'none';
    });
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
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting...';
      await onReply(replyText);
      showToast('Reply posted!');

      // Reset form
      const replyButton = document.querySelector(`#show-reply-form-${parentId}`);
      if (replyButton) replyButton.style.display = 'inline-block';
      container.innerHTML = `
        <button id="show-reply-form-${parentId}" class="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium">
          <i class="fa-solid fa-reply mr-1"></i>Reply
        </button>
      `;
      const newBtn = container.querySelector(`#show-reply-form-${parentId}`);
      newBtn.addEventListener('click', () => {
        showReplyForm(container, parentType, parentId, onReply, currentUserType);
        newBtn.style.display = 'none';
      });
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post Reply';
    }
  });

  textarea.focus();
}
