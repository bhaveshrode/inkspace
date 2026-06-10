import { store } from '../store/index.js';
import { notFound } from '../components/notFound.js';

export async function authorProfile(id) {
  const author = await store.getAuthorById(id);
  if (!author) return notFound();

  const works = await store.getWorks();
  const authorWorks = works.filter(w => w.authorId === id);

  // Fetch statistics from backend (same as Author Dashboard)
  let stats = { totalRatings: 0, averageRating: 0, totalViews: 0 };
  try {
    // Temporarily set currentUser for the API call if viewing own profile
    const isOwnProfile = store.currentUser && store.currentUser.id === id;
    if (isOwnProfile) {
      stats = await store.getAuthorStatistics();
    } else {
      // For other authors, manually calculate from work data
      const totalViews = authorWorks.reduce((sum, work) => sum + (work.views || 0), 0);
      const totalRatings = authorWorks.reduce((sum, work) => sum + (work.ratingCount || 0), 0);

      // Calculate weighted average rating
      let totalRatingSum = 0;
      let totalRatingCount = 0;
      for (const work of authorWorks) {
        if (work.averageRating && work.ratingCount) {
          totalRatingSum += work.averageRating * work.ratingCount;
          totalRatingCount += work.ratingCount;
        }
      }
      const avgRating = totalRatingCount > 0 ? totalRatingSum / totalRatingCount : 0;

      stats = {
        totalRatings,
        averageRating: avgRating,
        totalViews
      };
    }
  } catch (e) {
    console.error('Failed to load author statistics:', e);
    // Fallback to manual calculation
    const totalViews = authorWorks.reduce((sum, work) => sum + (work.views || 0), 0);
    const totalRatings = authorWorks.reduce((sum, work) => sum + (work.ratingCount || 0), 0);

    let totalRatingSum = 0;
    let totalRatingCount = 0;
    for (const work of authorWorks) {
      if (work.averageRating && work.ratingCount) {
        totalRatingSum += work.averageRating * work.ratingCount;
        totalRatingCount += work.ratingCount;
      }
    }
    const avgRating = totalRatingCount > 0 ? totalRatingSum / totalRatingCount : 0;

    stats = {
      totalRatings,
      averageRating: avgRating,
      totalViews
    };
  }

  const { totalViews, totalRatings, avgRating } = stats;

  const container = document.createElement('div');
  container.className = 'fade-in';

  // Default banner if none set
  const bannerUrl = author.banner || 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80';
  const avatarUrl = author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&size=200&background=6366f1&color=fff`;

  container.innerHTML = `
    <!-- Banner Section -->
    <div class="relative h-64 md:h-80 bg-gradient-to-r from-indigo-500 to-purple-600 overflow-hidden">
      <img src="${bannerUrl}" alt="Profile banner" class="w-full h-full object-cover" onerror="this.style.display='none'">
      <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
    </div>

    <!-- Profile Content -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Avatar & Basic Info -->
      <div class="relative -mt-20 sm:-mt-24 mb-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <!-- Avatar -->
          <img
            src="${avatarUrl}"
            alt="${author.name}"
            class="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white dark:border-slate-900 shadow-xl bg-white"
            onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&size=200&background=6366f1&color=fff'"
          >

          <!-- Name & Stats -->
          <div class="flex-1 sm:ml-4 sm:pb-4">
            <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">
              ${author.name}
              ${author.followers > 1000 ? '<i class="fas fa-check-circle text-indigo-500 text-xl ml-2" title="Verified Author"></i>' : ''}
            </h1>

            ${author.location ? `<div class="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-sm mb-3"><i class="fas fa-map-marker-alt"></i> ${author.location}</div>` : ''}

            <!-- Follow Button and Join Date -->
            <div class="flex flex-wrap items-center gap-3">
              <button
                id="follow-btn"
                class="px-6 py-2 rounded-lg font-medium transition-all ${store.currentReader ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed'}"
                ${!store.currentReader ? 'disabled' : ''}
              >
                <i class="fas fa-user-plus mr-2"></i>
                Follow
              </button>

              <div class="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-sm">
                <i class="fas fa-calendar-alt"></i>
                <span>Joined ${new Date(author.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content (Left Column - 2/3) -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Bio Section -->
          ${author.bio ? `
            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
              <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">About</h2>
              <p class="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">${author.bio}</p>
            </div>
          ` : ''}

          <!-- Published Works -->
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Published Works (${authorWorks.length})
            </h2>

            ${authorWorks.length === 0 ? `
              <div class="text-center py-12 text-slate-500 dark:text-slate-400">
                <i class="fas fa-book-open text-4xl mb-3"></i>
                <p>No published works yet</p>
              </div>
            ` : `
              <div class="grid gap-4">
                ${authorWorks.map(work => `
                  <div
                    class="group flex gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer"
                    onclick="router.navigate('work-detail/${work.id}')"
                  >
                    ${work.cover ? `
                      <img
                        src="${work.cover}"
                        alt="${work.title}"
                        class="w-20 h-28 object-cover rounded-lg shadow-sm"
                      >
                    ` : ''}
                    <div class="flex-1 min-w-0">
                      <h3 class="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-1 truncate">
                        ${work.title}
                      </h3>
                      <p class="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                        ${work.description || 'No description'}
                      </p>
                      <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                        ${work.genre ? `<span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">${work.genre}</span>` : ''}
                        ${work.averageRating ? `
                          <div class="flex items-center gap-1">
                            <i class="fas fa-star text-yellow-500"></i>
                            <span>${work.averageRating.toFixed(1)}</span>
                          </div>
                        ` : ''}
                        <div class="flex items-center gap-1">
                          <i class="fas fa-eye"></i>
                          <span>${work.views || 0} views</span>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- Sidebar (Right Column - 1/3) -->
        <div class="space-y-6">
          <!-- Statistics Card -->
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <h3 class="font-bold text-slate-900 dark:text-white mb-4">Statistics</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <i class="fas fa-book"></i>
                  <span>Works</span>
                </div>
                <span class="font-bold text-slate-900 dark:text-white">${authorWorks.length}</span>
              </div>

              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <i class="fas fa-users"></i>
                  <span>Followers</span>
                </div>
                <span class="font-bold text-slate-900 dark:text-white">${author.followers || 0}</span>
              </div>

              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <i class="fas fa-eye"></i>
                  <span>Total Reads</span>
                </div>
                <span class="font-bold text-slate-900 dark:text-white">${totalViews.toLocaleString()}</span>
              </div>

              ${authorWorks.length > 0 ? `
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <i class="fas fa-star text-yellow-500"></i>
                    <span>Avg Rating</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 dark:text-white">${avgRating > 0 ? avgRating.toFixed(1) : 'No ratings yet'}</span>
                    ${avgRating > 0 ? `<span class="text-xs text-slate-500 dark:text-slate-400">(${totalRatings} ratings)</span>` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Recent Activity Card -->
          ${getRecentActivityCard(authorWorks)}

          <!-- Achievements Card -->
          ${getAchievementBadges(author, authorWorks, totalViews, avgRating)}

          <!-- Social Links Card -->
          ${getSocialLinksCard(author)}
        </div>
      </div>
    </div>
  `;

  // Add follow button logic
  setupFollowButton(container, author.id);

  return container;
}

function getRecentActivityCard(works) {
  if (works.length === 0) return '';

  // Sort works by created_at to find recent publications
  const recentWorks = [...works]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  // Calculate days since last publication
  const lastPublished = recentWorks[0];
  const daysSinceLastPublish = Math.floor((Date.now() - new Date(lastPublished.createdAt)) / (1000 * 60 * 60 * 24));

  let activityStatus = '';
  let statusColor = '';
  if (daysSinceLastPublish < 7) {
    activityStatus = 'Very Active';
    statusColor = 'text-green-600 dark:text-green-400';
  } else if (daysSinceLastPublish < 30) {
    activityStatus = 'Active';
    statusColor = 'text-blue-600 dark:text-blue-400';
  } else if (daysSinceLastPublish < 90) {
    activityStatus = 'Moderately Active';
    statusColor = 'text-yellow-600 dark:text-yellow-400';
  } else {
    activityStatus = 'Inactive';
    statusColor = 'text-slate-500 dark:text-slate-400';
  }

  return `
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-slate-900 dark:text-white">Activity</h3>
        <span class="text-xs font-semibold px-2 py-1 rounded-full ${statusColor} bg-opacity-10">
          ${activityStatus}
        </span>
      </div>

      <div class="space-y-3">
        ${recentWorks.map(work => {
          const daysAgo = Math.floor((Date.now() - new Date(work.createdAt)) / (1000 * 60 * 60 * 24));
          const timeAgo = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;

          return `
            <div class="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0 last:pb-0">
              <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <i class="fas fa-book text-indigo-600 dark:text-indigo-400 text-sm"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-900 dark:text-white truncate">
                  Published "${work.title}"
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ${timeAgo}
                </p>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${daysSinceLastPublish < 30 ? `
        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <i class="fas fa-fire text-orange-500"></i>
            <span>Published ${recentWorks.length} ${recentWorks.length === 1 ? 'work' : 'works'} in the last 30 days</span>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function getAchievementBadges(author, works, totalViews, avgRating) {
  const badges = [];

  if (author.followers >= 1000) {
    badges.push({ icon: 'fa-fire', color: 'text-orange-500', label: 'Popular Author', desc: '1000+ followers' });
  }
  if (works.length >= 10) {
    badges.push({ icon: 'fa-pen-fancy', color: 'text-purple-500', label: 'Prolific Writer', desc: '10+ books' });
  }
  if (avgRating >= 4.5 && works.length >= 3) {
    badges.push({ icon: 'fa-crown', color: 'text-yellow-500', label: 'Highly Rated', desc: '4.5+ average' });
  }
  if (totalViews >= 10000) {
    badges.push({ icon: 'fa-trophy', color: 'text-blue-500', label: 'Best Seller', desc: '10K+ reads' });
  }

  if (badges.length === 0) return '';

  return `
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
      <h3 class="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <i class="fas fa-award text-indigo-500"></i>
        Achievements
      </h3>
      <div class="space-y-3">
        ${badges.map(badge => `
          <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <i class="fas ${badge.icon} ${badge.color} text-2xl"></i>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-slate-900 dark:text-white text-sm">${badge.label}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">${badge.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function getSocialLinksCard(author) {
  const links = [
    { key: 'website', icon: 'fa-globe', label: 'Website', url: author.website },
    { key: 'twitter', icon: 'fa-twitter', label: 'Twitter', url: author.twitter },
    { key: 'instagram', icon: 'fa-instagram', label: 'Instagram', url: author.instagram },
    { key: 'facebook', icon: 'fa-facebook', label: 'Facebook', url: author.facebook },
    { key: 'linkedin', icon: 'fa-linkedin', label: 'LinkedIn', url: author.linkedin },
    { key: 'github', icon: 'fa-github', label: 'GitHub', url: author.github }
  ].filter(link => link.url);

  if (links.length === 0) return '';

  return `
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
      <h3 class="font-bold text-slate-900 dark:text-white mb-4">Connect</h3>
      <div class="space-y-2">
        ${links.map(link => `
          <a
            href="${link.url.startsWith('http') ? link.url : 'https://' + link.url}"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
          >
            <i class="fab ${link.icon} text-slate-400 group-hover:text-indigo-500 text-xl"></i>
            <span class="text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              ${link.label}
            </span>
            <i class="fas fa-external-link-alt text-slate-400 text-xs ml-auto"></i>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

async function setupFollowButton(container, authorId) {
  const followBtn = container.querySelector('#follow-btn');
  if (!followBtn || !store.currentReader) return;

  try {
    // Check if following
    const isFollowing = await store.isFollowingAuthor(authorId);
    updateFollowButton(followBtn, isFollowing);

    followBtn.addEventListener('click', async () => {
      try {
        followBtn.disabled = true;
        const result = await store.readerToggleFollow(authorId);
        updateFollowButton(followBtn, result.following);

        // Show toast
        if (window.showToast) {
          window.showToast(result.following ? 'Following author' : 'Unfollowed', 'success');
        }
      } catch (err) {
        console.error('Follow error:', err);
        if (window.showToast) {
          window.showToast('Failed to update follow status', 'error');
        }
      } finally {
        followBtn.disabled = false;
      }
    });
  } catch (err) {
    console.error('Setup follow error:', err);
  }
}

function updateFollowButton(btn, isFollowing) {
  if (isFollowing) {
    btn.innerHTML = '<i class="fas fa-check mr-2"></i>Following';
    btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
    btn.classList.add('bg-slate-200', 'dark:bg-slate-700', 'hover:bg-slate-300', 'dark:hover:bg-slate-600');
  } else {
    btn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Follow';
    btn.classList.remove('bg-slate-200', 'dark:bg-slate-700', 'hover:bg-slate-300', 'dark:hover:bg-slate-600');
    btn.classList.add('bg-indigo-600', 'hover:bg-indigo-700', 'text-white');
  }
}
