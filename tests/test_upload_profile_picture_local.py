from io import BytesIO
from pathlib import Path

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, create_test_user, login_user


## Test Upload Profile Picture (local storage)
@pytest.mark.anyio
async def test_upload_profile_picture_local(client: AsyncClient):
    user = await create_test_user(client)
    token = await login_user(client)

    test_image_path = Path(__file__).parent / "test_image.jpg"
    image_bytes = test_image_path.read_bytes()

    response = await client.patch(
        f"/api/users/{user['id']}/picture",
        files={"file": ("profile.jpg", BytesIO(image_bytes), "image/jpeg")},
        headers=auth_header(token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["image_file"] is not None
    assert data["image_file"].endswith(".jpg")
    assert "/media/profile_pics/" in data["image_path"]