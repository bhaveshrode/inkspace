import { store } from '../store/index.js';
import { router } from '../router/index.js';

export function NotificationBell() {
  const container = document.createElement('div');
  container.className = 'relative';
  container.id = 'notification-bell-container';

  container.innerHTML = `
    <button
      id="notification-bell-btn"
      class="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      aria-label="Notifications"
    >
      <i class="fas fa-bell text-xl"></i>
      <span
        id="notification-badge"
        class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full hidden"
      >0</span>
    </button>

    <!-- Notification Dropdown -->
    <div
      id="notification-dropdown"
      class="hidden absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-96 overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Notifications</h3>
        <button
          id="mark-all-read-btn"
          class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          Mark all read
        </button>
      </div>

      <!-- Notifications List -->
      <div id="notifications-list" class="overflow-y-auto flex-1">
        <div class="flex items-center justify-center py-8 text-slate-500 dark:text-slate-400">
          <i class="fas fa-spinner fa-spin text-2xl"></i>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-center">
        <button
          id="view-all-notifications-btn"
          class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
        >
          View all notifications
        </button>
      </div>
    </div>
  `;

  // Toggle dropdown
  const bellBtn = container.querySelector('#notification-bell-btn');
  const dropdown = container.querySelector('#notification-dropdown');

  bellBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isHidden = dropdown.classList.contains('hidden');

    if (isHidden) {
      // Load notifications when opening
      await loadNotifications();
      dropdown.classList.remove('hidden');
    } else {
      dropdown.classList.add('hidden');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // Mark all as read
  container.querySelector('#mark-all-read-btn').addEventListener('click', async () => {
    await store.markAllNotificationsAsRead();
    await loadNotifications();
  });

  // View all notifications
  container.querySelector('#view-all-notifications-btn').addEventListener('click', () => {
    dropdown.classList.add('hidden');
    router.navigate('home');
  });

  async function loadNotifications() {
    const list = container.querySelector('#notifications-list');
    list.innerHTML = '<div class="flex items-center justify-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-slate-500"></i></div>';

    const notifications = await store.fetchNotifications(10, 0);

    if (notifications.length === 0) {
      list.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 px-4 text-slate-500 dark:text-slate-400">
          <i class="fas fa-bell-slash text-4xl mb-3"></i>
          <p class="text-sm">No notifications yet</p>
        </div>
      `;
      return;
    }

    list.innerHTML = notifications.map(notif => `
      <div
        class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0 cursor-pointer ${notif.read ? 'opacity-60' : ''}"
        data-notification-id="${notif.id}"
        data-notification='${JSON.stringify(notif)}'
        data-unread="${!notif.read}"
        title="Click to view"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-1">
            ${getNotificationIcon(notif.type)}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-900 dark:text-white">${notif.title}</p>
            <p class="text-sm text-slate-600 dark:text-slate-400 mt-0.5">${notif.message}</p>
            <p class="text-xs text-slate-500 dark:text-slate-500 mt-1">${formatTime(notif.created_at)}</p>
          </div>
          ${!notif.read ? '<div class="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2"></div>' : ''}
        </div>
      </div>
    `).join('');

    // Add click handlers to notifications
    list.querySelectorAll('[data-notification-id]').forEach(item => {
      item.addEventListener('click', async (e) => {
        const notifId = item.dataset.notificationId;
        const isUnread = item.dataset.unread === 'true';
        const notif = JSON.parse(item.dataset.notification);

        if (isUnread) {
          await store.markNotificationAsRead(notifId);
        }

        dropdown.classList.add('hidden');
        navigateToNotification(notif);
      });
    });
  }

  function navigateToNotification(notif) {
    // Navigate based on notification type and available data
    switch (notif.type) {
      case 'new_follower':
        // Navigate to author profile who followed
        if (notif.reader_id) {
          router.navigate('author-profile', {id: notif.author_id || store.currentUser?.id});
        }
        break;

      case 'new_rating':
        // Navigate to book detail page - ratings section
        if (notif.book_id) {
          router.navigate('work-detail', {id: notif.book_id});
          // Scroll to ratings section after navigation
          setTimeout(() => {
            const ratingsSection = document.getElementById('ratings-section');
            if (ratingsSection) {
              ratingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }
        break;

      case 'new_comment':
        // Navigate to book detail page - comments section
        if (notif.book_id) {
          router.navigate('work-detail', {id: notif.book_id});
          // Switch to comments tab and scroll after navigation
          setTimeout(() => {
            const commentsTab = document.getElementById('tab-comments');
            if (commentsTab) {
              commentsTab.click();
              setTimeout(() => {
                const commentsSection = document.getElementById('comments-section');
                if (commentsSection) {
                  commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 50);
            }
          }, 150);
        }
        break;

      case 'comment_reply':
        // Navigate to book detail page - comments section
        if (notif.book_id) {
          router.navigate('work-detail', {id: notif.book_id});
          setTimeout(() => {
            const commentsTab = document.getElementById('tab-comments');
            if (commentsTab) {
              commentsTab.click();
              setTimeout(() => {
                const commentsSection = document.getElementById('comments-section');
                if (commentsSection) {
                  commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 50);
            }
          }, 150);
        }
        break;

      case 'new_chapter':
        // Navigate to the new chapter's reading page
        if (notif.book_id) {
          // If we have chapter_id, we could navigate directly to it
          // For now, navigate to book detail where they can see latest chapter
          router.navigate('work-detail', {id: notif.book_id});
        }
        break;

      case 'milestone':
        // Navigate to book detail or author dashboard
        if (notif.book_id) {
          router.navigate('work-detail', {id: notif.book_id});
        } else if (store.currentUser) {
          router.navigate('author-dashboard');
        }
        break;

      default:
        // Default: navigate to home
        router.navigate('home');
    }
  }

  function getNotificationIcon(type) {
    const iconMap = {
      new_follower: '<i class="fas fa-user-plus text-green-500"></i>',
      new_rating: '<i class="fas fa-star text-yellow-500"></i>',
      new_comment: '<i class="fas fa-comment text-blue-500"></i>',
      comment_reply: '<i class="fas fa-reply text-blue-500"></i>',
      new_chapter: '<i class="fas fa-book-open text-purple-500"></i>',
      milestone: '<i class="fas fa-trophy text-orange-500"></i>',
    };
    return iconMap[type] || '<i class="fas fa-bell text-slate-500"></i>';
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return container;
}
