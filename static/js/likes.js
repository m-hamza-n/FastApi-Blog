/**
 * Like button functionality for post cards and post detail pages.
 * One-way like (increment only). Gracefully handles missing backend endpoint.
 */

import { getToken, getCurrentUser } from '/static/js/auth.js';
import { escapeHtml } from '/static/js/utils.js';

const LIKE_ENDPOINT = '/api/posts';

/**
 * Create the like button HTML string.
 */
function createLikeButtonHTML(likes, postId, isLoggedIn) {
  const disabledAttr = isLoggedIn ? '' : 'disabled';
  const tooltipAttr = isLoggedIn
    ? ''
    : 'data-bs-toggle="tooltip" data-bs-title="Login to like"';
  const btnClass = isLoggedIn ? 'btn-like' : 'btn-like btn-like-disabled';

  return `
    <button type="button"
            class="${btnClass} d-inline-flex align-items-center gap-1"
            data-post-id="${postId}"
            ${disabledAttr}
            ${tooltipAttr}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="like-icon">
        <path d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
      </svg>
      <span class="like-count">${likes}</span>
    </button>
  `;
}

/**
 * Initialize like buttons inside a container element.
 * Call this after DOM updates that add new post cards.
 */
export async function initLikeButtons(container = document) {
  const user = await getCurrentUser();
  const isLoggedIn = !!user;

  const buttons = container.querySelectorAll('.btn-like');

  for (const btn of buttons) {
    // Skip if already initialized
    if (btn.dataset.likeInitialized === 'true') continue;
    btn.dataset.likeInitialized = 'true';

    const postId = btn.dataset.postId;
    if (!postId) continue;

    // If guest, just show tooltip (Bootstrap needs manual init for dynamically added elements)
    if (!isLoggedIn) {
      const tooltip = bootstrap.Tooltip.getOrCreateInstance(btn);
      continue;
    }

    btn.addEventListener('click', async () => {
      if (btn.disabled) return;

      const token = getToken();
      if (!token) {
        window.location.href = '/login';
        return;
      }

      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        <span class="like-count">${btn.querySelector('.like-count').textContent}</span>
      `;

      try {
        const response = await fetch(`${LIKE_ENDPOINT}/${postId}/like`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }

        if (response.status === 404) {
          // Backend endpoint not implemented yet — don't break the UI
          console.warn(`Like endpoint not found for post ${postId}`);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const countEl = btn.querySelector('.like-count');
          if (countEl && data.likes !== undefined) {
            countEl.textContent = data.likes;
          }
          // Visual feedback
          btn.classList.add('liked');
          setTimeout(() => btn.classList.remove('liked'), 300);
        } else {
          const error = await response.json().catch(() => ({}));
          console.error('Like failed:', error.detail || 'Unknown error');
        }
      } catch (err) {
        console.error('Network error liking post:', err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        // Restore the count from the latest known value if request succeeded
        const countEl = btn.querySelector('.like-count');
        if (countEl) {
          // The response handler above already updated it; if not, it stays the same
        }
      }
    });
  }
}

/**
 * Render a like button into a target element.
 * Usage: renderLikeButton(element, {{ post.likes }}, {{ post.id }})
 */
export async function renderLikeButton(targetElement, likes, postId) {
  if (!targetElement) return;
  const user = await getCurrentUser();
  const isLoggedIn = !!user;
  targetElement.innerHTML = createLikeButtonHTML(likes, postId, isLoggedIn);
  await initLikeButtons(targetElement);
}