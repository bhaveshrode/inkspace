import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { notFound } from '../components/notFound.js';
import { showToast } from '../components/toast.js';

export async function editChapter(workId, chapterIndex) {
  const work = await store.getWorkById(workId);
  if (!work || !work.chapters[chapterIndex]) return notFound();

  const chapter = work.chapters[chapterIndex];
  const container = document.createElement('div');
  container.className = 'fade-in max-w-4xl mx-auto px-4 py-8';

  container.innerHTML = `
    <h1 class="text-3xl font-bold mb-6">Edit Chapter</h1>
    <form id="edit-chapter-form" class="space-y-4">
      <input type="text" name="title" value="${chapter.title}" required class="w-full border rounded px-3 py-2">
      <textarea name="content" required class="w-full border rounded px-3 py-2" rows="15">${chapter.content}</textarea>
      <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
        Save Changes
      </button>
    </form>
  `;

  container.querySelector('#edit-chapter-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await store.updateChapter(workId, chapterIndex, {
        title: formData.get('title'),
        content: formData.get('content')
      });
      showToast('Chapter updated!', 'success');
      router.navigate('manage-work', { id: workId });
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  return container;
}
