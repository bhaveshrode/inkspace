import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { notFound } from '../components/notFound.js';

export async function manageWork(id) {
  const work = await store.getWorkById(id);
  if (!work) return notFound();

  const container = document.createElement('div');
  container.className = 'fade-in max-w-4xl mx-auto px-4 py-8';

  container.innerHTML = `
    <h1 class="text-3xl font-bold mb-6">Manage: ${work.title}</h1>
    <div class="space-y-4">
      <h2 class="text-xl font-bold">Chapters</h2>
      ${work.chapters.map((ch, idx) => `
        <div class="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded">
          <span>${ch.title}</span>
          <button onclick="router.navigate('edit-chapter', {id: '${work.id}', chapterIndex: ${idx}})"
                  class="text-indigo-600">
            Edit
          </button>
        </div>
      `).join('')}
    </div>
  `;

  return container;
}
