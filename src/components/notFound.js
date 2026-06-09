export function notFound() {
  const div = document.createElement('div');
  div.className = 'text-center py-20';
  div.innerHTML = `<h2 class="text-2xl font-bold text-slate-800 dark:text-white">Page Not Found</h2>`;
  return div;
}
