import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { WorkCard } from '../components/workCard.js';

export async function readerDashboard() {
  if (!store.currentReader) {
    router.navigate('reader-login');
    return document.createElement('div');
  }

  const container = document.createElement('div');
  container.className = 'fade-in max-w-7xl mx-auto px-4 py-8';

  const bookmarks = await store.getReaderBookmarks();
  const history = await store.getReaderHistory();
  const following = await store.getReaderFollowing();

  container.innerHTML = `
    <div class="mb-8">
      <div class="flex items-center gap-4 mb-6">
        ${store.currentReader.avatar
          ? `<img src="${store.currentReader.avatar}" alt="${store.currentReader.name}" class="w-20 h-20 rounded-full object-cover border-4 border-indigo-100 dark:border-indigo-900">`
          : `<div class="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
               <span class="text-3xl font-bold text-indigo-600 dark:text-indigo-400">${store.currentReader.name.charAt(0)}</span>
             </div>`
        }
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Welcome back, ${store.currentReader.name}!</h1>
          <p class="text-slate-600 dark:text-slate-400">${store.currentReader.bio || 'Happy reading!'}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <i class="fa-solid fa-bookmark text-3xl mb-2 opacity-80"></i>
          <div class="text-4xl font-bold mb-1">${bookmarks.length}</div>
          <div class="text-sm opacity-90">Bookmarked Stories</div>
        </div>
        <div class="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
          <i class="fa-solid fa-book-open text-3xl mb-2 opacity-80"></i>
          <div class="text-4xl font-bold mb-1">${history.length}</div>
          <div class="text-sm opacity-90">Stories Read</div>
        </div>
        <div class="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-6 text-white">
          <i class="fa-solid fa-user-group text-3xl mb-2 opacity-80"></i>
          <div class="text-4xl font-bold mb-1">${following.length}</div>
          <div class="text-sm opacity-90">Authors Following</div>
        </div>
      </div>
    </div>

    <div class="mb-8">
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
        <i class="fa-solid fa-bookmark mr-2 text-indigo-600"></i>
        My Bookmarks
      </h2>
      <div id="bookmarks-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        ${bookmarks.length === 0
          ? '<p class="col-span-full text-center text-slate-500 dark:text-slate-400 py-8">No bookmarked stories yet. Start reading to bookmark your favorites!</p>'
          : ''
        }
      </div>
    </div>

    <div class="mb-8">
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
        <i class="fa-solid fa-clock-rotate-left mr-2 text-blue-600"></i>
        Reading History
      </h2>
      <div id="history-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        ${history.length === 0
          ? '<p class="col-span-full text-center text-slate-500 dark:text-slate-400 py-8">No reading history yet. Discover stories to get started!</p>'
          : ''
        }
      </div>
    </div>

    <div class="mb-8">
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
        <i class="fa-solid fa-user-group mr-2 text-pink-600"></i>
        Following
      </h2>
      <div id="following-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${following.length === 0
          ? '<p class="col-span-full text-center text-slate-500 dark:text-slate-400 py-8">Not following any authors yet. Discover authors to follow!</p>'
          : ''
        }
      </div>
    </div>
  `;

  const bookmarksGrid = container.querySelector('#bookmarks-grid');
  bookmarks.forEach(book => {
    const card = WorkCard({
      ...book,
      authorId: book.author_id,
      createdAt: book.created_at
    }, true, book.author_name);
    bookmarksGrid.appendChild(card);
  });

  const historyGrid = container.querySelector('#history-grid');
  history.slice(0, 8).forEach(book => {
    const card = WorkCard({
      ...book,
      authorId: book.author_id,
      createdAt: book.created_at
    }, false, book.author_name);
    historyGrid.appendChild(card);
  });

  const followingGrid = container.querySelector('#following-grid');
  following.forEach(author => {
    const authorCard = document.createElement('div');
    authorCard.className = 'bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition cursor-pointer';
    authorCard.onclick = () => router.navigate('author-profile', { id: author.id });

    authorCard.innerHTML = `
      <div class="flex items-center gap-4">
        ${author.avatar
          ? `<img src="${author.avatar}" alt="${author.name}" class="w-16 h-16 rounded-full object-cover">`
          : `<div class="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
               <span class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${author.name.charAt(0)}</span>
             </div>`
        }
        <div class="flex-1">
          <h3 class="font-bold text-slate-900 dark:text-white">${author.name}</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400">${author.bio || 'Author'}</p>
          <p class="text-xs text-slate-500 dark:text-slate-500 mt-1">
            <i class="fa-solid fa-users mr-1"></i>${author.followers} followers
          </p>
        </div>
      </div>
    `;

    followingGrid.appendChild(authorCard);
  });

  return container;
}
