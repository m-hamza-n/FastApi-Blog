/**
 * Comments functionality for post detail pages.
 * Load, submit, and delete comments. Auth-aware.
 */

import { getToken, getCurrentUser } from '/static/js/auth.js';
import { escapeHtml, formatDate, getErrorMessage, showModal } from '/static/js/utils.js';

const COMMENTS_ENDPOINT = '/api/posts';

/**
 * Create HTML for a single comment.
 */
function createCommentHTML(comment, currentUserId) {
  const isAuthor = currentUserId !== null && currentUserId === comment.user_id;
  const deleteBtn = isAuthor
    ? `<button type="button" class="btn btn-link btn-sm text-danger p-0 ms-2 delete-comment-btn" data-comment-id="${comment.id}">Delete</button>`
    : '';

  return `
    <div class="comment-item d-flex align-items-start gap-3 mb-3 pb-3 border-bottom" data-comment-id="${comment.id}">
      <img class="rounded-circle flex-shrink-0"
           src="${escapeHtml(comment.author.image_path)}"
           alt="${escapeHtml(comment.author.username)}'s profile picture"
           width="40"
           height="40"
           loading="lazy">
      <div class="flex-grow-1">
        <div class="d-flex align-items-center gap-2 mb-1">
          <a href="/users/${comment.author.id}/posts" class="fw-semibold text-decoration-none">${escapeHtml(comment.author.username)}</a>
          <small class="text-body-secondary">${formatDate(comment.date_posted)}</small>
          ${deleteBtn}
        </div>
        <p class="mb-0 text-break">${escapeHtml(comment.content)}</p>
      </div>
    </div>
  `;
}

/**
 * Create the comments section HTML structure.
 */
function createCommentsSectionHTML(postId) {
  return `
    <div id="commentsSection" class="content-section py-3 px-4 mb-4">
      <h5 class="mb-3">Comments</h5>
      <div id="commentsList" class="mb-3">
        <p class="text-body-secondary" id="commentsLoading">Loading comments...</p>
      </div>
      <div id="commentFormContainer" class="d-none">
        <form id="commentForm">
          <div class="mb-2">
            <textarea class="form-control"
                      id="commentContent"
                      name="content"
                      rows="3"
                      placeholder="Write a comment..."
                      maxlength="500"
                      required></textarea>
            <div class="d-flex justify-content-between align-items-center mt-1">
              <small class="text-body-secondary" id="charCounter">0/500</small>
              <small class="text-danger d-none" id="commentError"></small>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-sm" id="submitCommentBtn">Post Comment</button>
        </form>
      </div>
      <div id="loginToComment" class="d-none">
        <p class="text-body-secondary mb-0">
          <a href="/login">Login</a> to comment on this post.
        </p>
      </div>
    </div>
  `;
}

/**
 * Initialize the comments section for a post.
 * @param {HTMLElement} container - Element to render the section into
 * @param {number} postId
 */
export async function initComments(container, postId) {
  if (!container) {
    console.error('Comments container not found');
    return;
  }

  container.innerHTML = createCommentsSectionHTML(postId);

  const commentsList = document.getElementById('commentsList');
  const commentFormContainer = document.getElementById('commentFormContainer');
  const loginToComment = document.getElementById('loginToComment');
  const commentForm = document.getElementById('commentForm');
  const commentContent = document.getElementById('commentContent');
  const charCounter = document.getElementById('charCounter');
  const submitBtn = document.getElementById('submitCommentBtn');
  const commentError = document.getElementById('commentError');

  const user = await getCurrentUser();
  const isLoggedIn = !!user;
  const currentUserId = user ? user.id : null;

  // Show correct auth state UI
  if (isLoggedIn) {
    commentFormContainer.classList.remove('d-none');
  } else {
    loginToComment.classList.remove('d-none');
  }

  // Character counter
  if (commentContent) {
    commentContent.addEventListener('input', () => {
      const len = commentContent.value.length;
      charCounter.textContent = `${len}/500`;
      if (len > 500) {
        charCounter.classList.add('text-danger');
        submitBtn.disabled = true;
      } else if (len === 0) {
        submitBtn.disabled = true;
        charCounter.classList.remove('text-danger');
      } else {
        charCounter.classList.remove('text-danger');
        submitBtn.disabled = false;
      }
    });
    // Initialize state
    submitBtn.disabled = true;
  }

  // Load comments
  async function loadComments() {
    const loadingEl = document.getElementById('commentsLoading');
    if (loadingEl) loadingEl.textContent = 'Loading comments...';

    try {
      const response = await fetch(`${COMMENTS_ENDPOINT}/${postId}/comments`);

      if (!response.ok) {
        if (response.status === 404) {
          commentsList.innerHTML = '<p class="text-body-secondary">Post not found.</p>';
        } else {
          commentsList.innerHTML = '<p class="text-body-secondary">Failed to load comments.</p>';
        }
        return;
      }

      const comments = await response.json();

      if (comments.length === 0) {
        commentsList.innerHTML = '<p class="text-body-secondary">No comments yet. Be the first to comment!</p>';
        return;
      }

      commentsList.innerHTML = comments
        .map(comment => createCommentHTML(comment, currentUserId))
        .join('');

      // Attach delete handlers
      attachDeleteHandlers(postId, currentUserId);
    } catch (err) {
      console.error('Error loading comments:', err);
      commentsList.innerHTML = '<p class="text-body-secondary">Something went wrong, please try again.</p>';
    }
  }

  // Submit comment
  if (commentForm) {
    commentForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const token = getToken();
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const content = commentContent.value.trim();
      if (!content || content.length > 500) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting...';
      commentError.classList.add('d-none');

      try {
        const response = await fetch(`${COMMENTS_ENDPOINT}/${postId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        });

        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }

        if (response.status === 403) {
          commentError.textContent = 'You are not authorized to comment on this post.';
          commentError.classList.remove('d-none');
          return;
        }

        if (response.status === 201) {
          const newComment = await response.json();

          // Clear form
          commentForm.reset();
          charCounter.textContent = '0/500';
          submitBtn.disabled = true;

          // Remove "no comments" message if present
          const noCommentsMsg = commentsList.querySelector('p.text-body-secondary');
          if (noCommentsMsg) noCommentsMsg.remove();

          // Prepend new comment
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = createCommentHTML(newComment, currentUserId);
          commentsList.prepend(tempDiv.firstElementChild);

          // Re-attach delete handler for the new comment
          attachDeleteHandlers(postId, currentUserId);
        } else {
          const error = await response.json().catch(() => ({}));
          commentError.textContent = getErrorMessage(error);
          commentError.classList.remove('d-none');
        }
      } catch (err) {
        console.error('Error posting comment:', err);
        commentError.textContent = 'Something went wrong, please try again.';
        commentError.classList.remove('d-none');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Comment';
      }
    });
  }

  // Delete comment handler attachment
  function attachDeleteHandlers(postId, currentUserId) {
    const deleteButtons = document.querySelectorAll('.delete-comment-btn');
    for (const btn of deleteButtons) {
      if (btn.dataset.deleteInitialized === 'true') continue;
      btn.dataset.deleteInitialized = 'true';

      btn.addEventListener('click', async () => {
        const commentId = btn.dataset.commentId;
        if (!commentId) return;

        const token = getToken();
        if (!token) {
          window.location.href = '/login';
          return;
        }

        if (!confirm('Are you sure you want to delete this comment?')) return;

        btn.disabled = true;
        btn.textContent = 'Deleting...';

        try {
          const response = await fetch(
            `${COMMENTS_ENDPOINT}/${postId}/comments/${commentId}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (response.status === 401) {
            window.location.href = '/login';
            return;
          }

          if (response.status === 403) {
            // Shouldn't happen if we hide the button, but guard anyway
            btn.disabled = false;
            btn.textContent = 'Delete';
            return;
          }

          if (response.status === 204) {
            const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentEl) {
              commentEl.remove();
            }
            // If no comments left, show empty message
            if (commentsList.children.length === 0) {
              commentsList.innerHTML = '<p class="text-body-secondary">No comments yet. Be the first to comment!</p>';
            }
          } else {
            btn.disabled = false;
            btn.textContent = 'Delete';
          }
        } catch (err) {
          console.error('Error deleting comment:', err);
          btn.disabled = false;
          btn.textContent = 'Delete';
        }
      });
    }
  }

  // Initial load
  await loadComments();
}