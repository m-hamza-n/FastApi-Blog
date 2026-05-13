# FastAPI Blog

A full-featured blog application built with FastAPI, PostgreSQL, and Jinja2 templates. Built by following Corey Schafer's FastAPI tutorial series as a learning project and reference implementation.

---

## Features

- **User authentication** — register, login, logout via JWT (HS256) with argon2 password hashing
- **Posts** — create, read, update, delete with pagination
- **Comments** — per-post comment threads
- **Likes** — like/unlike posts
- **Profile pictures** — upload and update, stored locally or on AWS S3
- **Password reset** — via email with secure tokenized reset links
- **Security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS applied globally via middleware
- **Async throughout** — async SQLAlchemy, async email, async file handling
- **Database migrations** — managed with Alembic
- **Dockerized** — runs fully with `docker compose up`, migrations run automatically on startup
- **Test suite** — pytest with async support, covers users, posts, comments, and profile picture uploads

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy (async) |
| Migrations | Alembic |
| Auth | JWT via PyJWT + argon2 via pwdlib |
| Validation | Pydantic v2 |
| Templates | Jinja2 |
| File storage | Local filesystem or AWS S3 |
| Email | aiosmtplib |
| Package manager | uv |
| Containerization | Docker + Docker Compose |
| Testing | pytest + anyio |

---

## Project Structure

```
fastapi_blog/
├── main.py               # App entry point, middleware, router registration
├── config.py             # Settings via pydantic-settings, loaded from .env
├── database.py           # Async engine, session, Base
├── models.py             # SQLAlchemy ORM models
├── schemas.py            # Pydantic v2 request/response schemas
├── auth.py               # JWT, password hashing, get_current_user
├── email_utils.py        # Async email sending
├── image_utils.py        # Profile picture handling (local + S3)
├── routers/
│   ├── users.py          # Auth, registration, profile endpoints
│   └── posts.py          # Posts, comments, likes endpoints
├── templates/            # Jinja2 HTML templates
├── static/               # CSS, JS, icons
├── alembic/              # Database migrations
├── tests/                # pytest test suite
├── Dockerfile
├── docker-compose.yml
└── entrypoint.sh         # Runs migrations then starts the app
```

---

## Running Locally with Docker

**Requirements:** Docker and Docker Compose installed.

```bash
git clone https://github.com/m-hamza-n/fastapi-blog.git
cd fastapi-blog

cp .env.docker.example .env.docker
# Fill in SECRET_KEY at minimum — see .env.docker.example for all variables

docker compose up --build
```

Visit `http://localhost:8080`

On first run, Alembic migrations execute automatically before the app starts.

---

## Running Locally without Docker

**Requirements:** Python 3.13+, uv, PostgreSQL running locally.

```bash
git clone https://github.com/m-hamza-n/fastapi-blog.git
cd fastapi-blog

cp .env.example .env
# Fill in DATABASE_URL, SECRET_KEY, and other variables

uv sync
alembic upgrade head
fastapi dev main.py
```

---

## Environment Variables

See `.env.example` for all available variables. Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret |
| `S3_BUCKET_NAME` | AWS S3 bucket (optional, falls back to local storage) |
| `MAIL_SERVER` | SMTP server for password reset emails |
| `FRONTEND_URL` | Base URL used in email links |

---

## Running Tests

```bash
uv run pytest
```

Tests use a separate test database and never touch the real one.
