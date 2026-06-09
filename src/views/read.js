import { store } from '../store/index.js';
import { notFound } from '../components/notFound.js';
import { router } from '../router/index.js';

export async function read(id, chapterIndex) {
  const work = await store.getWorkById(id);
  if (!work || !work.chapters[chapterIndex]) return notFound();

  const chapter = work.chapters[chapterIndex];
  const container = document.createElement('div');
  container.className = 'fade-in max-w-3xl mx-auto px-4 py-8';

  // Track reading history for logged-in readers
  if (store.currentReader) {
    try {
      await store.readerAddToHistory(id, parseInt(chapterIndex));
    } catch (e) {
      console.error('Failed to track reading history:', e);
    }
  }

  const prevChapter = parseInt(chapterIndex) > 0 ? parseInt(chapterIndex) - 1 : null;
  const nextChapter = parseInt(chapterIndex) < work.chapters.length - 1 ? parseInt(chapterIndex) + 1 : null;

  container.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8">
      <div class="mb-6">
        <button onclick="router.navigate('work-detail', {id: '${id}'})" class="text-indigo-600 dark:text-indigo-400 hover:underline mb-2 text-sm">
          <i class="fa-solid fa-arrow-left mr-1"></i> Back to ${work.title}
        </button>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">${chapter.title}</h1>
        <p class="text-slate-500 dark:text-slate-400">Chapter ${parseInt(chapterIndex) + 1} of ${work.chapters.length}</p>
      </div>

      <div class="prose dark:prose-invert max-w-none mb-8">
        ${chapter.content}
      </div>

      <div class="flex justify-between items-center pt-6 border-t border-slate-200 dark:border-slate-700">
        ${prevChapter !== null
          ? `<button onclick="router.navigate('read', {id: '${id}', chapterIndex: ${prevChapter}})" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition">
               <i class="fa-solid fa-chevron-left mr-2"></i>Previous Chapter
             </button>`
          : '<div></div>'
        }
        ${nextChapter !== null
          ? `<button onclick="router.navigate('read', {id: '${id}', chapterIndex: ${nextChapter}})" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
               Next Chapter<i class="fa-solid fa-chevron-right ml-2"></i>
             </button>`
          : '<button onclick="router.navigate('work-detail', {id: '${id}'})" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Finished<i class="fa-solid fa-check ml-2"></i></button>'
        }
      </div>
    </div>
  `;

  return container;
}
