import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { showToast } from '../components/toast.js';

export async function addWork() {
  const container = document.createElement('div');
  container.className = 'fade-in max-w-4xl mx-auto px-4 py-8';

  container.innerHTML = `
    <h1 class="text-3xl font-bold mb-6">Add New Work</h1>
    <form id="add-work-form" class="space-y-4">
      <input type="text" name="title" placeholder="Title" required class="w-full border rounded px-3 py-2">
      <input type="text" name="genre" placeholder="Genre" class="w-full border rounded px-3 py-2">
      <textarea name="description" placeholder="Description" class="w-full border rounded px-3 py-2" rows="4"></textarea>
      <input type="text" name="chapterTitle" placeholder="First Chapter Title" required class="w-full border rounded px-3 py-2">
      <textarea name="chapterContent" placeholder="Chapter Content" required class="w-full border rounded px-3 py-2" rows="10"></textarea>
      <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
        Publish
      </button>
    </form>
  `;

  container.querySelector('#add-work-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const work = await store.createWork({
        title: formData.get('title'),
        genre: formData.get('genre'),
        description: formData.get('description'),
        status: 'published'
      });
      await store.createChapter(work.id, {
        title: formData.get('chapterTitle'),
        content: formData.get('chapterContent')
      });
      showToast('Work published!', 'success');
      router.navigate('author-dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  return container;
}
