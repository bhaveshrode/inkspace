import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { notFound } from '../components/notFound.js';

export async function workDetail(id) {
  const work = await store.getWorkById(id);
  if (!work) return notFound();

  const author = await store.getAuthorById(work.authorId);
  const container = document.createElement('div');
  container.className = 'fade-in max-w-4xl mx-auto px-4 py-8';

  // Simplified implementation - full implementation from app.js can be added
  container.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8">
      <h1 class="text-3xl font-bold mb-4">${work.title}</h1>
      <p class="text-slate-600 dark:text-slate-400 mb-4">by ${author.name}</p>
      <p class="mb-6">${work.description}</p>
      <div class="space-y-2">
        ${work.chapters.map((ch, idx) => `
          <div class="p-4 border rounded cursor-pointer hover:bg-slate-50"
               onclick="router.navigate('read', {id: '${work.id}', chapterIndex: ${idx}})">
            ${ch.title}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return container;
}
