# LGM Sports

Football mixto pa' los pibes de la empresa.

The site is split in two:

- **Backend**: PHP 7+ with [Slim 3](https://www.slimframework.com/), exposing the
  REST API under `/api/*` and serving the SPA shell.
- **Frontend**: React 19 + TypeScript single-page app (Vite + Tailwind +
  shadcn/ui) under `frontend/`.

## Project layout

```
.
├── index.php              # Slim app entry: API routes + SPA fallback
├── src/                   # PHP models, API routers, session, db
├── web/                   # Built SPA bundle (generated, gitignored)
├── frontend/              # React SPA source (Vite + Tailwind + shadcn/ui)
└── cli/                   # SQL dumps and seeds
```

## Backend (PHP API)

### Run with Docker (recommended)

```bash
docker compose up --build
```

This starts two services:

- `php` — PHP 7.4 built-in server on http://localhost:8000 (uses `index.php`
  as the front controller).
- `db` — MySQL 8 on `localhost:3306`. The `futbolmixto` database is created
  automatically and seeded from `cli/dump.sql` and `cli/data.sql` on first
  start. Credentials: `dev` / `dev` (root password: `root`). Data persists in
  the named volume `db_data`.

The PHP container reads its DB connection settings from `DB_HOST`, `DB_NAME`,
`DB_USER`, `DB_PASSWORD` env vars (set in `docker-compose.yml`); defaults in
`src/Database.php` still match a local `php -S` setup, so non-Docker workflows
keep working.

To re-seed the database from scratch:

```bash
docker compose down -v && docker compose up --build
```

### Run without Docker

1. Install PHP dependencies:
   ```bash
   composer install
   ```
2. Create the MySQL database `futbolmixto` and load the dumps in `cli/`.
3. Adjust DB credentials via env vars (`DB_HOST`, `DB_NAME`, `DB_USER`,
   `DB_PASSWORD`) or rely on the defaults baked into `src/Database.php`
   (`localhost` / `futbolmixto` / `dev` / empty password).
4. Start the server:
   ```bash
   php -S localhost:8000 index.php
   ```

The PHP built-in server uses `index.php` as the router. Static files inside the
project root (e.g. `web/img/...`, `web/dist/assets/...`) are served directly;
unknown routes go through Slim, which dispatches the API or returns the SPA
shell.

## Frontend (React SPA)

### Setup

```bash
cd frontend
npm install
```

### Run (dev)

```bash
cd frontend
npm run dev
```

This starts Vite on http://localhost:5173 and proxies `/api/*` to PHP at
`http://localhost:8000`. Open http://localhost:5173/web/ to use the dev SPA.

### Build (production)

```bash
cd frontend
npm run build
```

The bundle is emitted into `../web/dist/` so it is served by Slim's SPA
catch-all on any `/web[/...]` URL.

### Useful scripts

- `npm run dev` — Vite dev server
- `npm run build` — typecheck + production bundle
- `npm run preview` — preview the production bundle
- `npm run lint` — ESLint

## URLs

- `/` → redirects to `/web/`
- `/web/login`, `/web/register`, `/web/`, `/web/events`, `/web/event/:id`,
  `/web/admin` — handled client-side by React Router
- `/api/*` — PHP API, session-cookie auth (PHPSESSID + remember-me cookies)

## Auth

Auth is unchanged from the legacy site: `POST /api/login` sets a PHP session
cookie, the SPA calls all subsequent endpoints with `credentials: "include"`.
A 401 from any endpoint redirects the user back to `/web/login`.

## Stack

| Concern        | Choice                                  |
|----------------|-----------------------------------------|
| Build          | Vite (rolldown) + TypeScript            |
| UI             | Tailwind CSS v4 + shadcn/ui (Radix)     |
| Theme          | Dark sporty + neon lime/cyan accent     |
| Routing        | react-router-dom v7                     |
| Data           | TanStack Query                          |
| Forms          | react-hook-form + zod                   |
| Dates          | date-fns (Spanish locale)               |
| Toasts         | sonner                                  |
| Icons          | lucide-react                            |
