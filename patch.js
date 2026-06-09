const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. router.render
code = code.replace(
    /case 'add-work':([\s\S]*?)case 'search':/m,
    "case 'add-work':$1case 'manage-work': if (!store.currentUser) { this.navigate('author-login'); return; } app.appendChild(views.manageWork(this.params.id)); break;\n                case 'edit-chapter': if (!store.currentUser) { this.navigate('author-login'); return; } app.appendChild(views.editChapter(this.params.id, this.params.chapterIndex)); break;\n                case 'search':"
);

// 2. Dashboard edit button
code = code.replace(
    /<button onclick="router\.navigate\('work-detail', \{id: '\$\{work\.id\}'\}\)" class="text-slate-400 hover:text-indigo-600 p-2"><i class="fa-solid fa-eye"><\/i><\/button>\s*<button onclick="deleteWork\('\$\{work\.id\}'\)" class="text-slate-400 hover:text-red-600 p-2"><i class="fa-solid fa-trash"><\/i><\/button>/g,
    `<button onclick="router.navigate('work-detail', {id: '\${work.id}'})" class="text-slate-400 hover:text-indigo-600 p-2" title="View"><i class="fa-solid fa-eye"></i></button>
                                        <button onclick="router.navigate('manage-work', {id: '\${work.id}'})" class="text-slate-400 hover:text-indigo-600 p-2" title="Manage Work"><i class="fa-solid fa-pen-to-square"></i></button>
                                        <button onclick="deleteWork('\${work.id}')" class="text-slate-400 hover:text-red-600 p-2" title="Delete"><i class="fa-solid fa-trash"></i></button>`
);

// 3. Views
const newViews = `
        manageWork(id) {
            const work = store.works.find(w => w.id === id);
            if (!work || work.authorId !== store.currentUser.id) return components.notFound();

            const container = document.createElement('div');
            container.className = 'fade-in max-w-5xl mx-auto px-4 py-8';
            container.innerHTML = \`
                    <div class="mb-8 flex justify-between items-center">
                        <div>
                            <button onclick="router.navigate('author-dashboard')" class="text-indigo-600 hover:text-indigo-800 mb-2 flex items-center"><i class="fa-solid fa-arrow-left mr-2"></i> Back to Dashboard</button>
                            <h2 class="text-3xl font-bold text-slate-900 dark:text-white">Manage Work: \${work.title}</h2>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div class="lg:col-span-1">
                            <form onsubmit="handleUpdateWork(event, '\${work.id}')" class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                                <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Work Details</h3>
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                                    <input type="text" name="title" value="\${work.title.replace(/"/g, '&quot;')}" required class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Genre</label>
                                    <select name="genre" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                                        <option \${work.genre === 'Fiction' ? 'selected' : ''}>Fiction</option>
                                        <option \${work.genre === 'Sci-Fi' ? 'selected' : ''}>Sci-Fi</option>
                                        <option \${work.genre === 'Fantasy' ? 'selected' : ''}>Fantasy</option>
                                        <option \${work.genre === 'Romance' ? 'selected' : ''}>Romance</option>
                                        <option \${work.genre === 'Mystery' ? 'selected' : ''}>Mystery</option>
                                        <option \${work.genre === 'Non-Fiction' ? 'selected' : ''}>Non-Fiction</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                                    <select name="status" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                                        <option value="published" \${work.status === 'published' ? 'selected' : ''}>Published</option>
                                        <option value="draft" \${work.status === 'draft' ? 'selected' : ''}>Draft</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Series (Optional)</label>
                                    <input type="text" name="series" value="\${work.series ? work.series.replace(/"/g, '&quot;') : ''}" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Tags (comma separated)</label>
                                    <input type="text" name="tags" value="\${(work.tags || []).join(', ').replace(/"/g, '&quot;')}" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Cover URL</label>
                                    <input type="url" name="cover" value="\${work.cover || ''}" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                                    <textarea name="description" rows="3" required class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">\${work.description}</textarea>
                                </div>
                                <div class="pt-2">
                                    <button type="submit" class="w-full justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Save Work Details</button>
                                </div>
                            </form>
                        </div>
                        <div class="lg:col-span-2">
                            <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <div class="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">
                                    <h3 class="text-xl font-bold text-slate-800 dark:text-white">Chapters (\${work.chapters.length})</h3>
                                    <button onclick="router.navigate('edit-chapter', {id: '\${work.id}', chapterIndex: 'new'})" class="px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-md text-sm font-medium transition"><i class="fa-solid fa-plus mr-1"></i> Add Chapter</button>
                                </div>
                                <div class="space-y-3">
                                    \${work.chapters.length === 0 ? '<p class="text-slate-500 italic">No chapters yet.</p>' : ''}
                                    \${work.chapters.map((chap, idx) => \`
                                        <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-600 transition group">
                                            <div class="flex items-center">
                                                <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-sm font-bold mr-4">\${idx + 1}</div>
                                                <span class="font-medium text-slate-800 dark:text-slate-200">\${chap.title}</span>
                                            </div>
                                            <div class="flex space-x-2">
                                                <button onclick="router.navigate('edit-chapter', {id: '\${work.id}', chapterIndex: \${idx}})" class="text-slate-400 hover:text-indigo-600 p-2" title="Edit Chapter"><i class="fa-solid fa-pen"></i></button>
                                                <button onclick="window.handleDeleteChapter('\${work.id}', \${idx})" class="text-slate-400 hover:text-red-600 p-2" title="Delete Chapter"><i class="fa-solid fa-trash"></i></button>
                                            </div>
                                        </div>
                                    \`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            return container;
        },

        editChapter(workId, chapterIndex) {
            const work = store.works.find(w => w.id === workId);
            if (!work || work.authorId !== store.currentUser.id) return components.notFound();

            const isNew = chapterIndex === 'new';
            const idx = parseInt(chapterIndex);
            const chapter = isNew ? { title: '', content: '' } : work.chapters[idx];

            if (!isNew && !chapter) return components.notFound();

            const container = document.createElement('div');
            container.className = 'fade-in max-w-4xl mx-auto px-4 py-8';
            container.innerHTML = \`
                    <div class="mb-8">
                        <button onclick="router.navigate('manage-work', {id: '\${work.id}'})" class="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center"><i class="fa-solid fa-arrow-left mr-2"></i> Back to Manage Work</button>
                        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">\${isNew ? 'Add New Chapter' : 'Edit Chapter'} - \${work.title}</h2>
                    </div>
                    <form id="chapter-form" class="space-y-6 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chapter Title</label>
                            <input type="text" name="chapterTitle" value="\${chapter.title.replace(/"/g, '&quot;')}" required class="block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
                            <div id="editor-container" class="h-96 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600"></div>
                            <div id="hidden-content" class="hidden"></div>
                        </div>
                        <div class="pt-5 flex justify-end border-t border-slate-200 dark:border-slate-700 mt-6">
                            <button type="button" onclick="router.navigate('manage-work', {id: '\${work.id}'})" class="bg-white dark:bg-slate-700 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 mr-3">Cancel</button>
                            <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Save Chapter</button>
                        </div>
                    </form>
                \`;

            const hiddenContent = container.querySelector('#hidden-content');
            hiddenContent.textContent = chapter.content;

            setTimeout(() => {
                const quill = new Quill('#editor-container', { theme: 'snow', placeholder: 'Write your chapter...' });
                const existingContent = container.querySelector('#hidden-content').textContent;
                if (existingContent) {
                    quill.clipboard.dangerouslyPasteHTML(0, existingContent);
                }

                const form = container.querySelector('form');
                form.onsubmit = (e) => {
                    e.preventDefault();
                    const title = form.chapterTitle.value;
                    const content = quill.root.innerHTML;
                    window.handleSaveChapter(workId, chapterIndex, title, content);
                };
            }, 0);

            return container;
        },

        searchResults(query) {`;
code = code.replace(/searchResults\(query\) {/g, newViews.trim());

// 4. Handlers
const handlers = `
    window.handleUpdateWork = function(e, workId) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const work = store.works.find(w => w.id === workId);
        if (work) {
            work.title = formData.get('title');
            work.genre = formData.get('genre');
            work.status = formData.get('status');
            work.series = formData.get('series');
            work.tags = (formData.get('tags') || '').split(',').map(t => t.trim()).filter(t => t);
            work.cover = formData.get('cover');
            work.description = formData.get('description');
            store.saveAll();
            showToast('Work details updated', 'success');
            router.navigate('manage-work', { id: workId });
        }
    };

    window.handleSaveChapter = function(workId, chapterIndex, title, content) {
        const work = store.works.find(w => w.id === workId);
        if (work) {
            if (chapterIndex === 'new') {
                work.chapters.push({ title, content });
                showToast('Chapter added', 'success');
            } else {
                work.chapters[parseInt(chapterIndex)] = { title, content };
                showToast('Chapter updated', 'success');
            }
            store.saveAll();
            router.navigate('manage-work', { id: workId });
        }
    };

    window.handleDeleteChapter = function(workId, chapterIndex) {
        if (confirm('Delete this chapter? This cannot be undone.')) {
            const work = store.works.find(w => w.id === workId);
            if (work) {
                work.chapters.splice(parseInt(chapterIndex), 1);
                store.saveAll();
                showToast('Chapter deleted', 'success');
                router.navigate('manage-work', { id: workId });
            }
        }
    };

    function toggleFollow(authorId) {`;

code = code.replace(/function toggleFollow\(authorId\) {/g, handlers.trim());

fs.writeFileSync('app.js', code);
console.log('Patch complete.');
