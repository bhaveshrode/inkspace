import { store } from '../store/index.js';
import { notFound } from '../components/notFound.js';

export async function read(id, chapterIndex) {
  const work = await store.getWorkById(id);
  if (!work || !work.chapters[chapterIndex]) return notFound();

  const chapter = work.chapters[chapterIndex];
  const container = document.createElement('div');
  container.className = 'fade-in max-w-3xl mx-auto px-4 py-8';

  container.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8">
      <h1 class="text-2xl font-bold mb-2">${chapter.title}</h1>
      <p class="text-slate-500 mb-6">${work.title} - Chapter ${parseInt(chapterIndex) + 1}</p>
      <div class="prose dark:prose-invert max-w-none">
        ${chapter.content}
      </div>
    </div>
  `;

  return container;
}
