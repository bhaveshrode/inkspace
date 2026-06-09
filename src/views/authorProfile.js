import { store } from '../store/index.js';
import { notFound } from '../components/notFound.js';

export async function authorProfile(id) {
  const author = await store.getAuthorById(id);
  if (!author) return notFound();

  const works = await store.getWorks();
  const authorWorks = works.filter(w => w.authorId === id);

  const container = document.createElement('div');
  container.className = 'fade-in max-w-4xl mx-auto px-4 py-8';

  container.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8">
      <div class="flex items-center gap-4 mb-6">
        <img src="${author.avatar}" class="w-24 h-24 rounded-full">
        <div>
          <h1 class="text-3xl font-bold">${author.name}</h1>
          <p class="text-slate-600">${author.bio || 'Author'}</p>
        </div>
      </div>
      <h2 class="text-xl font-bold mb-4">Works (${authorWorks.length})</h2>
      <div class="grid gap-4">
        ${authorWorks.map(w => `
          <div class="border rounded p-4 cursor-pointer hover:bg-slate-50"
               onclick="router.navigate('work-detail', {id: '${w.id}'})">
            <h3 class="font-bold">${w.title}</h3>
            <p class="text-sm text-slate-600">${w.description}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return container;
}
