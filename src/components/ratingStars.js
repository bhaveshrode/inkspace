export function RatingStars({ rating = 0, interactive = false, onChange = null, size = 'text-xl' }) {
  const container = document.createElement('div');
  container.className = `flex items-center gap-1 ${size}`;

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('i');
    star.className = `fa-star ${i <= rating ? 'fa-solid text-yellow-400' : 'fa-regular text-slate-300 dark:text-slate-600'}`;

    if (interactive) {
      star.className += ' cursor-pointer hover:text-yellow-400 transition';
      star.addEventListener('click', () => {
        if (onChange) onChange(i);
      });

      star.addEventListener('mouseenter', () => {
        for (let j = 1; j <= 5; j++) {
          const s = container.children[j - 1];
          if (j <= i) {
            s.classList.remove('fa-regular', 'text-slate-300', 'dark:text-slate-600');
            s.classList.add('fa-solid', 'text-yellow-400');
          } else {
            s.classList.remove('fa-solid', 'text-yellow-400');
            s.classList.add('fa-regular', 'text-slate-300', 'dark:text-slate-600');
          }
        }
      });
    }

    container.appendChild(star);
  }

  if (interactive) {
    container.addEventListener('mouseleave', () => {
      for (let j = 1; j <= 5; j++) {
        const s = container.children[j - 1];
        if (j <= rating) {
          s.classList.remove('fa-regular', 'text-slate-300', 'dark:text-slate-600');
          s.classList.add('fa-solid', 'text-yellow-400');
        } else {
          s.classList.remove('fa-solid', 'text-yellow-400');
          s.classList.add('fa-regular', 'text-slate-300', 'dark:text-slate-600');
        }
      }
    });
  }

  return container;
}
