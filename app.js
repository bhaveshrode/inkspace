// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => console.log('SW registration skipped'));
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredPrompt = e;
        document.getElementById('install-btn').style.display = 'block';
    });
}
function installPWA() {
    if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        window.deferredPrompt.userChoice.then(() => { window.deferredPrompt = null; });
    }
}

// --- Data Store (API Integrated) ---
const store = {
    lists: JSON.parse(localStorage.getItem('ink_lists')) || { favorites: [], wantToRead: [] },
    currentUser: JSON.parse(localStorage.getItem('ink_current_user')) || null,
    darkMode: JSON.parse(localStorage.getItem('ink_dark_mode')) || false,
    follows: [], bookmarks: [], readingHistory: [],

    saveLocal() {
        localStorage.setItem('ink_lists', JSON.stringify(this.lists));
        localStorage.setItem('ink_current_user', JSON.stringify(this.currentUser));
        localStorage.setItem('ink_dark_mode', JSON.stringify(this.darkMode));
    },

    async init() {
        if (this.darkMode) document.body.classList.add('dark-mode');
        if (this.currentUser) await this.loadUserData();
    },

    async loadUserData() {
        if (!this.currentUser) return;
        try {
            this.follows = await this.apiFetch(`/api/users/${this.currentUser.id}/follows`);
            this.bookmarks = await this.apiFetch(`/api/users/${this.currentUser.id}/bookmarks`);
            this.readingHistory = await this.apiFetch(`/api/users/${this.currentUser.id}/reading`);
        } catch (e) { console.error('Failed to load user data', e); }
    },

    async apiFetch(path, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('ink_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const res = await fetch(path, { headers: { ...headers, ...(options.headers || {}) }, ...options });
        
        if (res.status === 401 || res.status === 403) {
            this.currentUser = null;
            localStorage.removeItem('ink_token');
            this.saveLocal();
            if (window.router) window.router.navigate('author-login');
            throw new Error('Session expired or access denied.');
        }
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'API Error');
        return data;
    },

    async getAuthors() { return this.apiFetch('/api/authors'); },
    async getAuthorById(id) { return this.apiFetch(`/api/authors/${id}`); },
    async login(email, password) { return this.apiFetch('/api/authors/login', { method: 'POST', body: JSON.stringify({ email, password }) }); },
    async signup(name, email, password) { return this.apiFetch('/api/authors', { method: 'POST', body: JSON.stringify({ name, email, password }) }); },

    _mapWork(w) { return w ? { ...w, authorId: w.author_id, createdAt: w.created_at } : null; },
    
    async getWorks() { 
        const works = await this.apiFetch('/api/books'); 
        return works.map(w => this._mapWork(w));
    },
    async getWorkById(id) { 
        const work = await this.apiFetch(`/api/books/${id}`); 
        return this._mapWork(work);
    },
    async createWork(work) { 
        const created = await this.apiFetch('/api/books', { method: 'POST', body: JSON.stringify(work) });
        return this._mapWork(created);
    },
    async updateWork(id, fields) { 
        const updated = await this.apiFetch(`/api/books/${id}`, { method: 'PUT', body: JSON.stringify(fields) }); 
        return this._mapWork(updated);
    },
    async deleteWork(id) { return this.apiFetch(`/api/books/${id}`, { method: 'DELETE' }); },

    async createChapter(bookId, chap) { return this.apiFetch(`/api/books/${bookId}/chapters`, { method: 'POST', body: JSON.stringify(chap) }); },
    async updateChapter(bookId, idx, chap) { return this.apiFetch(`/api/books/${bookId}/chapters/${idx}`, { method: 'PUT', body: JSON.stringify(chap) }); },
    async deleteChapter(bookId, idx) { return this.apiFetch(`/api/books/${bookId}/chapters/${idx}`, { method: 'DELETE' }); },

    async getComments(bookId) { return this.apiFetch(`/api/books/${bookId}/comments`); },
    async addComment(bookId, user, text) { return this.apiFetch(`/api/books/${bookId}/comments`, { method: 'POST', body: JSON.stringify({ user, text }) }); },

    async toggleFollow(followerId, authorId) { 
        const res = await this.apiFetch('/api/follows', { method: 'POST', body: JSON.stringify({ followerId, authorId }) }); 
        await this.loadUserData(); return res;
    },
    async toggleBookmark(userId, bookId, chapterIndex) { 
        const res = await this.apiFetch('/api/bookmarks', { method: 'POST', body: JSON.stringify({ userId, bookId, chapterIndex }) }); 
        await this.loadUserData(); return res;
    },
    async addReading(userId, bookId, chapterIndex) { 
        await this.apiFetch('/api/reading', { method: 'POST', body: JSON.stringify({ userId, bookId, chapterIndex }) }); 
        await this.loadUserData();
    }
};

function toggleGlobalDarkMode() {
    store.darkMode = !store.darkMode;
    document.body.classList.toggle('dark-mode');
    store.saveLocal();
}

// --- Router ---
const router = {
    currentPage: 'home', params: {},
    navigate(page, params = {}) {
        this.currentPage = page; this.params = params;
        window.scrollTo(0, 0); this.render(); this.updateNav();
    },
    checkHash() {
        const hash = window.location.hash;
        if (hash === '#/author') {
            if (store.currentUser) this.navigate('author-dashboard');
            else this.navigate('author-login');
        }
    },
    updateNav() {
        const userMenu = document.getElementById('user-menu');
        const searchContainer = document.getElementById('nav-search-container');
        if (store.currentUser) {
            userMenu.classList.remove('hidden');
            document.getElementById('user-name').textContent = store.currentUser.name;
            document.getElementById('user-initial').textContent = store.currentUser.name.charAt(0);
        } else { userMenu.classList.add('hidden'); }
        if (['home', 'search'].includes(this.currentPage)) searchContainer.classList.remove('hidden');
        else searchContainer.classList.add('hidden');
    },
    async render() {
        const app = document.getElementById('app'); 
        app.innerHTML = '<div class="text-center py-20"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i></div>';
        try {
            let view;
            switch(this.currentPage) {
                case 'home': view = await views.home(); break;
                case 'work-detail': view = await views.workDetail(this.params.id); break;
                case 'read': view = await views.read(this.params.id, this.params.chapterIndex); break;
                case 'author-profile': view = await views.authorProfile(this.params.id); break;
                case 'author-login': view = await views.authorLogin(); break;
                case 'author-dashboard': if (!store.currentUser) { this.navigate('author-login'); return; } view = await views.authorDashboard(); break;
                case 'add-work': if (!store.currentUser) { this.navigate('author-login'); return; } view = await views.addWork(); break;
                case 'manage-work': if (!store.currentUser) { this.navigate('author-login'); return; } view = await views.manageWork(this.params.id); break;
                case 'edit-chapter': if (!store.currentUser) { this.navigate('author-login'); return; } view = await views.editChapter(this.params.id, this.params.chapterIndex); break;
                case 'search': view = await views.searchResults(this.params.query); break;
                default: view = await views.home();
            }
            app.innerHTML = ''; app.appendChild(view);
        } catch(err) {
            console.error(err);
            app.innerHTML = `<div class="text-center py-20 text-red-600">${err.message}</div>`;
        }
    }
};

const components = {
    workCard(work, isContinue = false, authorName = 'Unknown') {
        const div = document.createElement('div');
        div.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition duration-300 flex flex-col h-full cursor-pointer group';
        div.onclick = () => router.navigate('work-detail', {id: work.id});
        div.innerHTML = `
                <div class="h-48 overflow-hidden relative">
                    <img src="${work.cover || 'https://via.placeholder.com/400x300'}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                    ${work.series ? `<span class="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">${work.series}</span>` : ''}
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">${work.genre}</span>
                        ${isContinue ? '<span class="text-xs text-green-600 font-medium"><i class="fa-solid fa-clock-rotate-left mr-1"></i>In Progress</span>' : ''}
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 transition line-clamp-1">${work.title}</h3>
                    <p class="text-sm text-slate-500 mb-3">by ${authorName}</p>
                    <div class="flex flex-wrap gap-1 mb-3">
                        ${(work.tags || []).slice(0,3).map(t => `<span class="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">#${t}</span>`).join('')}
                    </div>
                    <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 flex-grow">${work.description}</p>
                    <div class="text-xs text-slate-400 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                        <span><i class="fa-solid fa-eye mr-1"></i>${work.views || 0}</span>
                        <span>${new Date(work.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>`;
        return div;
    },
    notFound() {
        const div = document.createElement('div'); div.className = 'text-center py-20';
        div.innerHTML = `<h2 class="text-2xl font-bold text-slate-800 dark:text-white">Page Not Found</h2>`;
        return div;
    }
};

// --- Views ---
const views = {
    async home() {
        const container = document.createElement('div'); container.className = 'fade-in';
        const works = await store.getWorks();
        const authors = await store.getAuthors();
        const authMap = {}; authors.forEach(a => authMap[a.id] = a.name);

        const hero = document.createElement('div'); hero.className = 'bg-indigo-700 text-white py-16';
        hero.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h1 class="text-4xl font-bold mb-4">Discover Your Next Adventure</h1>
                <p class="text-indigo-100 text-lg max-w-2xl mx-auto">Read thousands of stories from independent authors.</p>
            </div>`;
        container.appendChild(hero);

        const wrap = document.createElement('div'); wrap.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12';

        // Trending
        const trendingSection = document.createElement('div'); trendingSection.className = 'mb-12';
        trendingSection.innerHTML = `<h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-l-4 border-indigo-500 pl-3"><i class="fa-solid fa-fire mr-2 text-orange-500"></i>Trending Now</h2>`;
        const tGrid = document.createElement('div'); tGrid.className = 'grid grid-cols-1 md:grid-cols-3 gap-6';
        const trendingWorks = [...works].sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0,3);
        trendingWorks.forEach(w => tGrid.appendChild(components.workCard(w, false, authMap[w.authorId])));
        trendingSection.appendChild(tGrid); wrap.appendChild(trendingSection);

        // Continue Reading
        if (store.currentUser && store.readingHistory && store.readingHistory.length > 0) {
            const cSec = document.createElement('div'); cSec.className = 'mb-12';
            cSec.innerHTML = `<h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-l-4 border-green-500 pl-3">Continue Reading</h2>`;
            const cGrid = document.createElement('div'); cGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
            
            for (let i=0; i<Math.min(3, store.readingHistory.length); i++) {
                const hist = store.readingHistory[i];
                const w = works.find(x => x.id === hist.book_id);
                if(w) cGrid.appendChild(components.workCard(w, true, authMap[w.authorId]));
            }
            cSec.appendChild(cGrid); wrap.appendChild(cSec);
        }

        // New & Featured
        const fSec = document.createElement('div');
        fSec.innerHTML = `<h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-l-4 border-indigo-500 pl-3">New & Featured</h2>`;
        const fGrid = document.createElement('div'); fGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        [...works].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(w => fGrid.appendChild(components.workCard(w, false, authMap[w.authorId])));
        fSec.appendChild(fGrid); wrap.appendChild(fSec);

        container.appendChild(wrap);
        return container;
    },

    async workDetail(id) {
        const work = await store.getWorkById(id);
        if (!work) return components.notFound();
        const author = await store.getAuthorById(work.authorId);
        
        let isFollowing = false;
        let isFav = store.lists.favorites.includes(id);
        let isWant = store.lists.wantToRead.includes(id);
        
        if (store.currentUser) {
            isFollowing = store.follows.includes(author.id);
        }
        
        const workComments = await store.getComments(id);

        const container = document.createElement('div');
        container.className = 'fade-in max-w-4xl mx-auto px-4 py-8';

        container.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                <div class="md:flex">
                    <div class="md:w-1/3 h-64 md:h-auto relative">
                        <img src="${work.cover || 'https://via.placeholder.com/400x600'}" class="absolute inset-0 w-full h-full object-cover" alt="${work.title}">
                    </div>
                    <div class="p-8 md:w-2/3 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center mb-2 gap-2">
                                <span class="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded">${work.genre}</span>
                                ${(work.tags || []).map(t => `<span class="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded dark:bg-slate-700 dark:text-slate-300">#${t}</span>`).join('')}
                                ${work.series ? `<span class="ml-auto text-slate-500 text-sm"><i class="fa-solid fa-layer-group mr-1"></i>${work.series}</span>` : ''}
                            </div>
                            <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2 font-serif">${work.title}</h1>
                            <div class="flex items-center mb-4 cursor-pointer hover:text-indigo-600 transition" onclick="router.navigate('author-profile', {id: '${author.id}'})">
                                <img src="${author.avatar}" class="w-6 h-6 rounded-full mr-2">
                                <span class="text-slate-600 dark:text-slate-300">by <span class="font-medium text-indigo-600">${author.name}</span></span>
                                <button onclick="event.stopPropagation(); window.toggleFollow('${author.id}')" class="ml-3 text-xs px-2 py-1 rounded border ${isFollowing ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-600 hover:border-indigo-600 hover:text-indigo-600'}">
                                    ${isFollowing ? 'Following' : 'Follow'}
                                </button>
                            </div>
                            <p class="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">${work.description}</p>

                            <div class="flex gap-2 mb-6">
                                <button onclick="window.toggleList('favorites', '${id}')" class="flex-1 py-2 rounded-lg border ${isFav ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} transition">
                                    <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart mr-1"></i> ${isFav ? 'Favorited' : 'Favorite'}
                                </button>
                                <button onclick="window.toggleList('wantToRead', '${id}')" class="flex-1 py-2 rounded-lg border ${isWant ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} transition">
                                    <i class="fa-solid fa-bookmark mr-1"></i> ${isWant ? 'Saved' : 'Want to Read'}
                                </button>
                                <button onclick="window.downloadPDF('${id}')" class="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition" title="Download PDF">
                                    <i class="fa-solid fa-download"></i>
                                </button>
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="router.navigate('read', {id: '${work.id}', chapterIndex: 0})" class="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition shadow-md text-center">
                                <i class="fa-solid fa-book-open mr-2"></i> Read Now
                            </button>
                        </div>
                    </div>
                </div>

                <div class="border-t border-slate-100 dark:border-slate-700 p-8 bg-slate-50 dark:bg-slate-900/50">
                    <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-4">Chapters (${(work.chapters || []).length})</h3>
                    <div class="space-y-3">
                        ${(work.chapters || []).map((chap, idx) => `
                            <div onclick="router.navigate('read', {id: '${work.id}', chapterIndex: ${idx}})" class="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 cursor-pointer transition group">
                                <div class="flex items-center">
                                    <div class="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-sm font-bold mr-4 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition">${idx + 1}</div>
                                    <span class="font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-600">${chap.title}</span>
                                </div>
                                <i class="fa-solid fa-chevron-right text-slate-300 group-hover:text-indigo-400"></i>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Comments Section -->
                <div class="border-t border-slate-100 dark:border-slate-700 p-8">
                    <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-6">Reader Comments (${workComments.length})</h3>
                    <div class="space-y-6 mb-8">
                        ${workComments.length === 0 ? '<p class="text-slate-500 italic">No comments yet. Be the first!</p>' : ''}
                        ${workComments.map(c => `
                            <div class="flex gap-4">
                                <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">${c.user.charAt(0)}</div>
                                <div>
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="font-bold text-slate-800 dark:text-white text-sm">${c.user}</span>
                                        <span class="text-xs text-slate-400">${new Date(c.date).toLocaleDateString()}</span>
                                    </div>
                                    <p class="text-slate-600 dark:text-slate-300 text-sm">${c.text}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <form onsubmit="window.handleAddComment(event, '${id}')" class="flex gap-3">
                        <input type="text" name="comment" required placeholder="Write a comment..." class="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Post</button>
                    </form>
                </div>
            </div>
        `;
        return container;
    },

    async read(id, chapterIndex) {
        const work = await store.getWorkById(id);
        if (!work) return components.notFound();
        const idx = parseInt(chapterIndex) || 0;
        const chapter = work.chapters[idx];
        if (!chapter) return components.notFound();
        const author = await store.getAuthorById(work.authorId);

        if (store.currentUser) {
            store.addReading(store.currentUser.id, id, idx).catch(e=>console.error('Reading history error', e));
        }

        const container = document.createElement('div');
        container.className = 'fade-in bg-white dark:bg-slate-900 min-h-screen transition-colors';

        const safeChapterContent = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(chapter.content) : chapter.content;
        
        let isBookmarked = false;
        if(store.currentUser && store.bookmarks.find(b => b.book_id === id && b.chapter_index === idx)) {
            isBookmarked = true;
        }

        container.innerHTML = `
            <div class="sticky top-16 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-700 py-2 px-4">
                <div class="max-w-3xl mx-auto flex justify-between items-center">
                    <button onclick="router.navigate('work-detail', {id: '${work.id}'})" class="text-slate-500 hover:text-indigo-600"><i class="fa-solid fa-arrow-left"></i></button>
                    <div class="flex gap-4 text-sm">
                        <button onclick="window.adjustFontSize(-1)" class="text-slate-500 hover:text-indigo-600 font-serif">A-</button>
                        <button onclick="window.toggleReadFont()" class="text-slate-500 hover:text-indigo-600"><i class="fa-solid fa-font"></i></button>
                        <button onclick="window.adjustFontSize(1)" class="text-slate-500 hover:text-indigo-600 font-serif text-lg">A+</button>
                        <button onclick="window.toggleReadTheme()" class="text-slate-500 hover:text-indigo-600"><i class="fa-solid fa-circle-half-stroke"></i></button>
                    </div>
                </div>
            </div>

            <div id="read-content-area" class="max-w-3xl mx-auto px-4 py-12 transition-colors duration-300">
                <div class="mb-8 text-center">
                    <h4 class="text-indigo-600 font-medium mb-2 cursor-pointer hover:underline" onclick="router.navigate('work-detail', {id: '${work.id}'})">${work.title}</h4>
                    <h1 class="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white font-serif mb-4">${chapter.title}</h1>
                    <div class="flex items-center justify-center text-sm text-slate-500">
                        <span>by ${author.name}</span>
                    </div>
                </div>

                <div id="chapter-text" class="prose prose-lg prose-slate dark:prose-invert mx-auto font-serif text-slate-700 dark:text-slate-300 leading-loose text-lg">
                    ${safeChapterContent}
                </div>

                <div class="mt-12 pt-8 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <button ${idx === 0 ? 'disabled' : ''} onclick="router.navigate('read', {id: '${work.id}', chapterIndex: ${idx - 1}})" class="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"><i class="fa-solid fa-arrow-left mr-2"></i> Prev</button>
                    <button onclick="window.handleToggleBookmark('${id}', ${idx})" class="text-slate-400 hover:text-indigo-600 text-xl ${(isBookmarked ? 'text-indigo-600' : '')}"><i class="fa-solid fa-bookmark"></i></button>
                    <button ${idx === work.chapters.length - 1 ? 'disabled' : ''} onclick="router.navigate('read', {id: '${work.id}', chapterIndex: ${idx + 1}})" class="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">Next <i class="fa-solid fa-arrow-right ml-2"></i></button>
                </div>
            </div>
        `;

        setTimeout(() => window.applyReadSettings(), 0);
        return container;
    },

    async authorProfile(id) {
        const author = await store.getAuthorById(id);
        if (!author) return components.notFound();
        
        const allWorks = await store.getWorks();
        const authorWorks = allWorks.filter(w => w.authorId === id && w.status === 'published');
        
        let isFollowing = false;
        if(store.currentUser) isFollowing = store.follows.includes(id);

        const container = document.createElement('div');
        container.className = 'fade-in max-w-5xl mx-auto px-4 py-12';
        container.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 mb-10 text-center md:text-left md:flex md:items-center gap-8 transition-colors">
                <div class="flex-shrink-0 mb-4 md:mb-0">
                    <img src="${author.avatar || 'https://via.placeholder.com/150'}" class="h-32 w-32 rounded-full object-cover border-4 border-indigo-50 mx-auto md:mx-0">
                </div>
                <div class="flex-1">
                    <div class="flex flex-col md:flex-row md:items-center justify-between mb-2">
                        <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2 md:mb-0">${author.name}</h1>
                        <button onclick="window.toggleFollow('${id}')" class="px-4 py-2 rounded-full ${isFollowing ? 'bg-indigo-600 text-white' : 'bg-white border border-indigo-600 text-indigo-600'} font-medium transition">
                            ${isFollowing ? 'Following' : 'Follow Author'}
                        </button>
                    </div>
                    <p class="text-slate-600 dark:text-slate-400 max-w-2xl mb-4">${author.bio || 'No bio yet.'}</p>
                    <div class="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-slate-500 dark:text-slate-400">
                        <span><i class="fa-solid fa-book mr-1"></i> ${authorWorks.length} Works</span>
                        <span><i class="fa-solid fa-users mr-1"></i> ${author.followers || 0} Followers</span>
                    </div>
                </div>
            </div>
            <h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-6">Published Works</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${authorWorks.map(work => components.workCard(work, false, author.name).outerHTML).join('')}
            </div>
        `;
        return container;
    },

    async authorLogin() {
        const container = document.createElement('div');
        container.className = 'fade-in min-h-[80vh] flex items-center justify-center bg-slate-50 dark:bg-slate-900 py-12 px-4';
        container.innerHTML = `
            <div class="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-10 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 transition-colors">
                <div>
                    <div class="flex justify-center mb-4"><i class="fa-solid fa-feather-pointed text-indigo-600 text-4xl"></i></div>
                    <h2 class="text-center text-3xl font-extrabold text-slate-900 dark:text-white">Author Portal</h2>
                </div>
                <div class="flex border-b border-slate-200 dark:border-slate-600 mb-6">
                    <button id="tab-login" class="w-1/2 py-2 text-center text-indigo-600 border-b-2 border-indigo-600 font-medium" onclick="window.toggleAuthTab('login')">Sign In</button>
                    <button id="tab-signup" class="w-1/2 py-2 text-center text-slate-500 hover:text-indigo-500 font-medium" onclick="window.toggleAuthTab('signup')">Create Account</button>
                </div>
                <form id="form-login" class="space-y-6" onsubmit="window.handleLogin(event)">
                    <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label><input name="email" type="email" required class="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"></div>
                    <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label><input name="password" type="password" required class="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"></div>
                    <button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Sign In</button>
                </form>
                <form id="form-signup" class="space-y-6 hidden" onsubmit="window.handleSignup(event)">
                    <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label><input name="name" type="text" required class="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"></div>
                    <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label><input name="email" type="email" required class="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"></div>
                    <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label><input name="password" type="password" required class="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"></div>
                    <button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Create Account</button>
                </form>
                <div class="text-center mt-4"><button type="button" onclick="router.navigate('home')" class="text-sm text-slate-500 hover:text-indigo-600">← Back to Reading</button></div>
            </div>`;
        return container;
    },

    async authorDashboard() {
        const user = store.currentUser;
        const allWorks = await store.getWorks();
        const myWorks = allWorks.filter(w => w.authorId === user.id);
        const me = await store.getAuthorById(user.id);

        const container = document.createElement('div');
        container.className = 'fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8';
        container.innerHTML = `
            <div class="md:flex md:items-center md:justify-between mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
                    <p class="text-sm text-slate-500">Manage your stories and view stats.</p>
                </div>
                <div class="mt-4 flex md:mt-0 md:ml-4">
                    <button onclick="window.handleLogout()" class="mr-3 px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">Logout</button>
                    <button onclick="router.navigate('add-work')" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"><i class="fa-solid fa-plus mr-2"></i> New Work</button>
                </div>
            </div>

            <!-- Stats Row -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div class="text-sm text-slate-500 mb-1">Total Reads</div>
                    <div class="text-3xl font-bold text-indigo-600">${myWorks.reduce((acc, w) => acc + (w.views || 0), 0)}</div>
                </div>
                <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div class="text-sm text-slate-500 mb-1">Published Works</div>
                    <div class="text-3xl font-bold text-indigo-600">${myWorks.filter(w => w.status === 'published').length}</div>
                </div>
                <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div class="text-sm text-slate-500 mb-1">Followers</div>
                    <div class="text-3xl font-bold text-indigo-600">${me.followers || 0}</div>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-md border border-slate-200 dark:border-slate-700">
                <ul class="divide-y divide-slate-200 dark:divide-slate-700">
                    ${myWorks.length === 0 ? '<div class="p-6 text-center text-slate-500">No works yet.</div>' : ''}
                    ${myWorks.map(work => `
                        <li class="px-4 py-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 h-16 w-12 bg-slate-200 rounded overflow-hidden mr-4"><img src="${work.cover || 'https://via.placeholder.com/100x150'}" class="h-full w-full object-cover"></div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <p class="text-sm font-medium text-indigo-600 truncate">${work.title}</p>
                                        <span class="text-xs px-2 py-0.5 rounded ${work.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${work.status}</span>
                                    </div>
                                    <p class="text-sm text-slate-500">${work.views || 0} Views</p>
                                </div>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="router.navigate('work-detail', {id: '${work.id}'})" class="text-slate-400 hover:text-indigo-600 p-2" title="View"><i class="fa-solid fa-eye"></i></button>
                                <button onclick="router.navigate('manage-work', {id: '${work.id}'})" class="text-slate-400 hover:text-indigo-600 p-2" title="Manage Work"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button onclick="window.handleDeleteWork('${work.id}')" class="text-slate-400 hover:text-red-600 p-2" title="Delete"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        return container;
    },

    async addWork() {
        const container = document.createElement('div');
        container.className = 'fade-in max-w-4xl mx-auto px-4 py-8';
        container.innerHTML = `
            <div class="mb-8">
                <button onclick="router.navigate('author-dashboard')" class="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center"><i class="fa-solid fa-arrow-left mr-2"></i> Back</button>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Publish New Work</h2>
            </div>
            <form onsubmit="window.handlePublish(event)" class="space-y-6 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div class="sm:col-span-6">
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                        <input type="text" name="title" required class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div class="sm:col-span-3">
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Genre</label>
                        <select name="genre" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                            <option>Fiction</option><option>Sci-Fi</option><option>Fantasy</option><option>Romance</option><option>Mystery</option><option>Non-Fiction</option>
                        </select>
                    </div>
                    <div class="sm:col-span-3">
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                        <select name="status" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="published">Publish Now</option>
                            <option value="draft">Save as Draft</option>
                        </select>
                    </div>
                    <div class="sm:col-span-3">
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Series (Optional)</label>
                        <input type="text" name="series" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div class="sm:col-span-3">
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Tags (comma separated)</label>
                        <input type="text" name="tags" placeholder="magic, dragons,..." class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div class="sm:col-span-6">
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Cover URL</label>
                        <input type="url" name="cover" placeholder="https://..." class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div class="sm:col-span-6">
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                        <textarea name="description" rows="3" required class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                    <div class="sm:col-span-6 border-t border-slate-200 dark:border-slate-600 pt-6">
                        <h3 class="text-lg font-medium text-slate-900 dark:text-white mb-4">First Chapter</h3>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chapter Title</label>
                            <input type="text" name="chapterTitle" required class="block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
                        <div id="editor-container" class="h-64 bg-white dark:bg-slate-900 rounded-lg"></div>
                        <textarea name="chapterContent" class="hidden"></textarea>
                    </div>
                </div>
                <div class="pt-5 flex justify-end">
                    <button type="button" onclick="router.navigate('author-dashboard')" class="bg-white dark:bg-slate-700 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 mr-3">Cancel</button>
                    <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Save</button>
                </div>
            </form>
        `;

        setTimeout(() => {
            const quill = new Quill('#editor-container', { theme: 'snow', placeholder: 'Write your story...' });
            const form = container.querySelector('form');
            form.onsubmit = (e) => {
                e.preventDefault();
                const content = quill.root.innerHTML;
                window.handlePublish(e, content);
            };
        }, 0);

        return container;
    },

    async manageWork(id) {
        const work = await store.getWorkById(id);
        if (!work || work.authorId !== store.currentUser.id) return components.notFound();

        const container = document.createElement('div');
        container.className = 'fade-in max-w-5xl mx-auto px-4 py-8';
        container.innerHTML = `
            <div class="mb-8 flex justify-between items-center">
                <div>
                    <button onclick="router.navigate('author-dashboard')" class="text-indigo-600 hover:text-indigo-800 mb-2 flex items-center"><i class="fa-solid fa-arrow-left mr-2"></i> Back to Dashboard</button>
                    <h2 class="text-3xl font-bold text-slate-900 dark:text-white">Manage Work: ${work.title}</h2>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-1">
                    <form onsubmit="window.handleUpdateWork(event, '${work.id}')" class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                        <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Work Details</h3>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                            <input type="text" name="title" value="${work.title.replace(/"/g, '&quot;')}" required class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Genre</label>
                            <select name="genre" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                                <option ${work.genre === 'Fiction' ? 'selected' : ''}>Fiction</option>
                                <option ${work.genre === 'Sci-Fi' ? 'selected' : ''}>Sci-Fi</option>
                                <option ${work.genre === 'Fantasy' ? 'selected' : ''}>Fantasy</option>
                                <option ${work.genre === 'Romance' ? 'selected' : ''}>Romance</option>
                                <option ${work.genre === 'Mystery' ? 'selected' : ''}>Mystery</option>
                                <option ${work.genre === 'Non-Fiction' ? 'selected' : ''}>Non-Fiction</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                            <select name="status" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                                <option value="published" ${work.status === 'published' ? 'selected' : ''}>Published</option>
                                <option value="draft" ${work.status === 'draft' ? 'selected' : ''}>Draft</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Series (Optional)</label>
                            <input type="text" name="series" value="${work.series ? work.series.replace(/"/g, '&quot;') : ''}" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Tags (comma separated)</label>
                            <input type="text" name="tags" value="${(work.tags || []).join(', ').replace(/"/g, '&quot;')}" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Cover URL</label>
                            <input type="url" name="cover" value="${work.cover || ''}" class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                            <textarea name="description" rows="3" required class="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:text-white">${work.description}</textarea>
                        </div>
                        <div class="pt-2">
                            <button type="submit" class="w-full justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Save Work Details</button>
                        </div>
                    </form>
                </div>
                <div class="lg:col-span-2">
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">
                            <h3 class="text-xl font-bold text-slate-800 dark:text-white">Chapters (${work.chapters ? work.chapters.length : 0})</h3>
                            <button onclick="router.navigate('edit-chapter', {id: '${work.id}', chapterIndex: 'new'})" class="px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-md text-sm font-medium transition"><i class="fa-solid fa-plus mr-1"></i> Add Chapter</button>
                        </div>
                        <div class="space-y-3">
                            ${(!work.chapters || work.chapters.length === 0) ? '<p class="text-slate-500 italic">No chapters yet.</p>' : ''}
                            ${(work.chapters || []).map((chap, idx) => `
                                <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-600 transition group">
                                    <div class="flex items-center">
                                        <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-sm font-bold mr-4">${idx + 1}</div>
                                        <span class="font-medium text-slate-800 dark:text-slate-200">${chap.title}</span>
                                    </div>
                                    <div class="flex space-x-2">
                                        <button onclick="router.navigate('edit-chapter', {id: '${work.id}', chapterIndex: ${idx}})" class="text-slate-400 hover:text-indigo-600 p-2" title="Edit Chapter"><i class="fa-solid fa-pen"></i></button>
                                        <button onclick="window.handleDeleteChapter('${work.id}', ${idx})" class="text-slate-400 hover:text-red-600 p-2" title="Delete Chapter"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        return container;
    },

    async editChapter(workId, chapterIndex) {
        const work = await store.getWorkById(workId);
        if (!work || work.authorId !== store.currentUser.id) return components.notFound();

        const isNew = chapterIndex === 'new';
        const idx = parseInt(chapterIndex);
        const chapter = isNew ? { title: '', content: '' } : work.chapters[idx];

        if (!isNew && !chapter) return components.notFound();

        const container = document.createElement('div');
        container.className = 'fade-in max-w-4xl mx-auto px-4 py-8';
        container.innerHTML = `
            <div class="mb-8">
                <button onclick="router.navigate('manage-work', {id: '${work.id}'})" class="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center"><i class="fa-solid fa-arrow-left mr-2"></i> Back to Manage Work</button>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white">${isNew ? 'Add New Chapter' : 'Edit Chapter'} - ${work.title}</h2>
            </div>
            <form id="chapter-form" class="space-y-6 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chapter Title</label>
                    <input type="text" name="chapterTitle" value="${chapter.title.replace(/"/g, '&quot;')}" required class="block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
                    <div id="editor-container" class="h-96 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600"></div>
                    <div id="hidden-content" class="hidden"></div>
                </div>
                <div class="pt-5 flex justify-end border-t border-slate-200 dark:border-slate-700 mt-6">
                    <button type="button" onclick="router.navigate('manage-work', {id: '${work.id}'})" class="bg-white dark:bg-slate-700 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 mr-3">Cancel</button>
                    <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Save Chapter</button>
                </div>
            </form>
        `;

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

    async searchResults(query) {
        const container = document.createElement('div');
        container.className = 'fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8';
        const lowerQ = query.toLowerCase();

        const allWorks = await store.getWorks();
        const allAuthors = await store.getAuthors();
        
        const results = allWorks.filter(w =>
            w.title.toLowerCase().includes(lowerQ) ||
            w.description.toLowerCase().includes(lowerQ) ||
            w.genre.toLowerCase().includes(lowerQ) ||
            (w.tags && w.tags.some(t => t.toLowerCase().includes(lowerQ)))
        );
        const authorResults = allAuthors.filter(u => u.name.toLowerCase().includes(lowerQ));

        container.innerHTML = `
            <h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-6">Results for "${query}"</h2>
            ${authorResults.length > 0 ? `
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-4">Authors</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        ${authorResults.map(u => `
                            <div onclick="router.navigate('author-profile', {id: '${u.id}'})" class="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center cursor-pointer hover:border-indigo-300 transition">
                                <img src="${u.avatar || 'https://via.placeholder.com/50'}" class="h-12 w-12 rounded-full object-cover mr-4">
                                <div><p class="font-bold text-slate-800 dark:text-white">${u.name}</p><p class="text-xs text-slate-500">Author</p></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            <div>
                <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-4">Stories</h3>
                ${results.length === 0 ? '<p class="text-slate-500">No stories found.</p>' : ''}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${results.map(work => components.workCard(work, false, allAuthors.find(a=>a.id===work.authorId)?.name).outerHTML).join('')}
                </div>
            </div>
        `;
        return container;
    }
};

// --- Logic & Handlers ---

window.toggleAuthTab = function(tab) {
    const loginForm = document.getElementById('form-login');
    const signupForm = document.getElementById('form-signup');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    if (tab === 'login') {
        loginForm.classList.remove('hidden'); signupForm.classList.add('hidden');
        tabLogin.classList.add('border-b-2', 'border-indigo-600', 'text-indigo-600'); tabLogin.classList.remove('text-slate-500');
        tabSignup.classList.remove('border-b-2', 'border-indigo-600', 'text-indigo-600'); tabSignup.classList.add('text-slate-500');
    } else {
        loginForm.classList.add('hidden'); signupForm.classList.remove('hidden');
        tabSignup.classList.add('border-b-2', 'border-indigo-600', 'text-indigo-600'); tabSignup.classList.remove('text-slate-500');
        tabLogin.classList.remove('border-b-2', 'border-indigo-600', 'text-indigo-600'); tabLogin.classList.add('text-slate-500');
    }
}

window.handleLogin = async function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const res = await store.login(formData.get('email'), formData.get('password'));
        store.currentUser = res.user;
        localStorage.setItem('ink_token', res.token);
        store.saveLocal();
        await store.loadUserData();
        window.showToast('Welcome back!', 'success');
        router.navigate('author-dashboard');
    } catch (err) {
        window.showToast(err.message, 'error');
    }
}

window.handleSignup = async function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const res = await store.signup(formData.get('name'), formData.get('email'), formData.get('password'));
        store.currentUser = res.user;
        localStorage.setItem('ink_token', res.token);
        store.saveLocal();
        await store.loadUserData();
        window.showToast('Account created!', 'success');
        router.navigate('author-dashboard');
    } catch (err) {
        window.showToast(err.message, 'error');
    }
}

window.handleLogout = function() {
    store.currentUser = null;
    localStorage.removeItem('ink_token');
    store.saveLocal();
    window.showToast('Logged out', 'success');
    router.navigate('home');
}

window.handlePublish = async function(e, richContent = null) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const newWork = {
            authorId: store.currentUser.id,
            title: formData.get('title'), 
            genre: formData.get('genre'),
            series: formData.get('series'), 
            tags: (formData.get('tags') || '').split(',').map(t => t.trim()).filter(t => t),
            cover: formData.get('cover'), 
            description: formData.get('description'),
            status: formData.get('status') || 'published'
        };
        const savedWork = await store.createWork(newWork);
        const rawContent = richContent || formData.get('chapterContent');
        const content = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(rawContent) : rawContent;
        await store.createChapter(savedWork.id, { title: formData.get('chapterTitle'), content });
        
        window.showToast(savedWork.status === 'draft' ? 'Draft saved!' : 'Published successfully!', 'success');
        router.navigate('author-dashboard');
    } catch (err) {
        window.showToast('Error publishing: ' + err.message, 'error');
    }
}

window.handleDeleteWork = async function(id) {
    if(confirm('Delete this work?')) {
        try {
            await store.deleteWork(id);
            window.showToast('Deleted', 'success');
            router.navigate('author-dashboard');
        } catch (err) {
            window.showToast('Error deleting', 'error');
        }
    }
}

window.handleUpdateWork = async function(e, workId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        await store.updateWork(workId, {
            title: formData.get('title'),
            genre: formData.get('genre'),
            status: formData.get('status'),
            series: formData.get('series'),
            tags: (formData.get('tags') || '').split(',').map(t => t.trim()).filter(t => t),
            cover: formData.get('cover'),
            description: formData.get('description')
        });
        window.showToast('Work details updated', 'success');
        router.navigate('manage-work', { id: workId });
    } catch (err) {
        window.showToast('Error updating', 'error');
    }
};

window.handleSaveChapter = async function(workId, chapterIndex, title, content) {
    try {
        const safeContent = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(content) : content;
        if (chapterIndex === 'new') {
            await store.createChapter(workId, { title, content: safeContent });
            window.showToast('Chapter added', 'success');
        } else {
            await store.updateChapter(workId, chapterIndex, { title, content: safeContent });
            window.showToast('Chapter updated', 'success');
        }
        router.navigate('manage-work', { id: workId });
    } catch(err) {
        window.showToast('Error saving chapter', 'error');
    }
};

window.handleDeleteChapter = async function(workId, chapterIndex) {
    if (confirm('Delete this chapter? This cannot be undone.')) {
        try {
            await store.deleteChapter(workId, chapterIndex);
            window.showToast('Chapter deleted', 'success');
            router.navigate('manage-work', { id: workId });
        } catch(err) {
            window.showToast('Error deleting chapter', 'error');
        }
    }
};

window.toggleFollow = async function(authorId) {
    if (!store.currentUser) { window.showToast('Login to follow', 'error'); return; }
    try {
        await store.toggleFollow(store.currentUser.id, authorId);
        router.render();
    } catch(e) { window.showToast('Error following', 'error'); }
}

window.toggleList = function(listName, workId) {
    const list = store.lists[listName];
    const idx = list.indexOf(workId);
    if (idx > -1) list.splice(idx, 1);
    else list.push(workId);
    store.saveLocal();
    router.render();
    window.showToast(idx > -1 ? 'Removed from list' : 'Added to list', 'success');
}

window.handleToggleBookmark = async function(workId, chapterIndex) {
    if (!store.currentUser) { window.showToast('Login to bookmark', 'error'); return; }
    try {
        await store.toggleBookmark(store.currentUser.id, workId, chapterIndex);
        router.render();
        window.showToast('Bookmark updated', 'success');
    } catch(e) { window.showToast('Error bookmarking', 'error'); }
}

window.handleAddComment = async function(e, workId) {
    e.preventDefault();
    const text = e.target.comment.value;
    try {
        await store.addComment(workId, store.currentUser ? store.currentUser.name : 'Guest', text);
        e.target.reset();
        router.render();
        window.showToast('Comment posted', 'success');
    } catch(err) {
        window.showToast('Error posting comment', 'error');
    }
}

window.downloadPDF = async function(workId) {
    const work = await store.getWorkById(workId);
    if (!work) return;
    const author = await store.getAuthorById(work.authorId);
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(20); doc.text(work.title, 20, y); y += 10;
    doc.setFontSize(12); doc.text(`By ${author.name}`, 20, y); y += 20;

    (work.chapters || []).forEach(chap => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(14); doc.text(chap.title, 20, y); y += 10;
        doc.setFontSize(11);
        const splitText = doc.splitTextToSize(chap.content.replace(/<<[^>]*>?/gm, ''), 170);
        splitText.forEach(line => {
            if (y > 280) { doc.addPage(); y = 20; }
            doc.text(line, 20, y); y += 6;
        });
        y += 10;
    });
    doc.save(`${work.title}.pdf`);
    window.showToast('PDF Downloaded', 'success');
}

// --- Reading Settings ---
let readSettings = JSON.parse(localStorage.getItem('ink_read_settings')) || { fontSize: 18, fontFamily: 'serif', theme: 'light' };

window.adjustFontSize = function(delta) {
    readSettings.fontSize += delta;
    window.applyReadSettings();
}
window.toggleReadFont = function() {
    readSettings.fontFamily = readSettings.fontFamily === 'serif' ? 'sans' : 'serif';
    window.applyReadSettings();
}
window.toggleReadTheme = function() {
    const themes = ['light', 'sepia', 'dark'];
    const currentIdx = themes.indexOf(readSettings.theme);
    readSettings.theme = themes[(currentIdx + 1) % themes.length];
    window.applyReadSettings();
}
window.applyReadSettings = function() {
    localStorage.setItem('ink_read_settings', JSON.stringify(readSettings));
    const area = document.getElementById('read-content-area');
    const text = document.getElementById('chapter-text');
    if (!area || !text) return;

    text.style.fontSize = readSettings.fontSize + 'px';
    text.className = `prose prose-lg mx-auto leading-loose ${readSettings.fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`;
    area.className = `max-w-3xl mx-auto px-4 py-12 transition-colors duration-300 ${readSettings.theme === 'dark' ? 'bg-slate-900' : readSettings.theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'}`;
    text.className += readSettings.theme === 'dark' ? ' text-slate-300' : readSettings.theme === 'sepia' ? ' text-[#5b4636]' : ' text-slate-700';
}

window.showToast = function(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    const iconEl = document.getElementById('toast-icon');
    msgEl.textContent = message;
    iconEl.className = type === 'error' ? 'fa-solid fa-circle-exclamation mr-3 text-red-400' : 'fa-solid fa-check-circle mr-3 text-green-400';
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => { toast.classList.add('translate-y-20', 'opacity-0'); }, 3000);
}

// --- Global Search ---
document.getElementById('global-search').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) router.navigate('search', { query });
    }
});

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    await store.init();
    router.checkHash();
    router.render();
    router.updateNav();
});
