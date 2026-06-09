export function workCard(work, isContinue = false, authorName = 'Unknown', router) {
  const div = document.createElement('div');
  div.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition duration-300 flex flex-col h-full cursor-pointer group';
  div.onclick = () => router.navigate('work-detail', { id: work.id });
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
        ${(work.tags || []).slice(0, 3).map(t => `<span class="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">#${t}</span>`).join('')}
      </div>
      <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 flex-grow">${work.description}</p>
      <div class="text-xs text-slate-400 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between">
        <span><i class="fa-solid fa-eye mr-1"></i>${work.views || 0}</span>
        <span>${new Date(work.createdAt).toLocaleDateString()}</span>
      </div>
    </div>`;
  return div;
}
