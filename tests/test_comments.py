import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, create_test_user, login_user


## Test Get Comments — Empty
@pytest.mark.anyio
async def test_get_comments_empty(client: AsyncClient):
    await create_test_user(client)
    token = await login_user(client)

    response = await client.post(
        "/api/posts",
        json={"title": "Test Post", "content": "Test content"},
        headers=auth_header(token),
    )
    post_id = response.json()["id"]

    response = await client.get(f"/api/posts/{post_id}/comments")

    assert response.status_code == 200
    assert response.json() == []


## Test Get Comments — Post Not Found
@pytest.mark.anyio
async def test_get_comments_post_not_found(client: AsyncClient):
    response = await client.get("/api/posts/999/comments")

    assert response.status_code == 404
    assert response.json()["detail"] == "Post not found"


## Test Create Comment — Success
@pytest.mark.anyio
async def test_create_comment_success(client: AsyncClient):
    await create_test_user(client)
    token = await login_user(client)

    response = await client.post(
        "/api/posts",
        json={"title": "Test Post", "content": "Test content"},
        headers=auth_header(token),
    )
    post_id = response.json()["id"]

    response = await client.post(
        f"/api/posts/{post_id}/comments",
        json={"content": "Great post!"},
        headers=auth_header(token),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["content"] == "Great post!"
    assert data["post_id"] == post_id
    assert "id" in data
    assert "date_posted" in data
    assert data["author"]["username"] == "testuser"
    assert "password" not in data
    assert "password_hash" not in data


## Test Create Comment — Unauthorized
@pytest.mark.anyio
async def test_create_comment_unauthorized(client: AsyncClient):
    await create_test_user(client)
    token = await login_user(client)

    response = await client.post(
        "/api/posts",
        json={"title": "Test Post", "content": "Test content"},
        headers=auth_header(token),
    )
    post_id = response.json()["id"]

    response = await client.post(
        f"/api/posts/{post_id}/comments",
        json={"content": "Great post!"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


## Test Delete Comment — Success
@pytest.mark.anyio
async def test_delete_comment_success(client: AsyncClient):
    await create_test_user(client)
    token = await login_user(client)

    response = await client.post(
        "/api/posts",
        json={"title": "Test Post", "content": "Test content"},
        headers=auth_header(token),
    )
    post_id = response.json()["id"]

    response = await client.post(
        f"/api/posts/{post_id}/comments",
        json={"content": "This will be deleted"},
        headers=auth_header(token),
    )
    comment_id = response.json()["id"]

    response = await client.delete(
        f"/api/posts/{post_id}/comments/{comment_id}",
        headers=auth_header(token),
    )

    assert response.status_code == 204


## Test Delete Comment — Wrong User
@pytest.mark.anyio
async def test_delete_comment_wrong_user(client: AsyncClient):
    await create_test_user(client, username="user1", email="user1@example.com")
    token1 = await login_user(client, email="user1@example.com")

    response = await client.post(
        "/api/posts",
        json={"title": "Test Post", "content": "Test content"},
        headers=auth_header(token1),
    )
    post_id = response.json()["id"]

    response = await client.post(
        f"/api/posts/{post_id}/comments",
        json={"content": "User 1's comment"},
        headers=auth_header(token1),
    )
    comment_id = response.json()["id"]

    await create_test_user(client, username="user2", email="user2@example.com")
    token2 = await login_user(client, email="user2@example.com")

    response = await client.delete(
        f"/api/posts/{post_id}/comments/{comment_id}",
        headers=auth_header(token2),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to delete this comment"