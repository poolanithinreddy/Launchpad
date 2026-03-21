# Launchpad Phase 2

Launchpad is a self-hosted deployment platform for Nithin Reddy Poola. Phase 2 extends the Phase 1 authenticated product shell with queued deployments, a Redis-backed BullMQ worker, Docker-based builds, framework detection, local preview URLs, and deployment history.

## Stack

- Turborepo + pnpm workspaces
- `apps/web`: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn-style UI, TanStack Query, axios
- `apps/server`: Express, TypeScript, Prisma, BullMQ, Docker worker integration
- `packages/db`: Prisma schema, generated Prisma client wrapper, SQL migrations
- `packages/types`: shared DTOs and deployment types
- PostgreSQL 15 + Redis 7 via `docker-compose.yml`

## Repo Structure

```text
Launchpad/
├── apps/
│   ├── server/
│   └── web/
├── packages/
│   ├── db/
│   └── types/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## Phase 2 Features

- GitHub OAuth with backend-issued `httpOnly` JWT cookies
- Protected dashboard and project management
- Deployment model and deployment history
- Redis-backed BullMQ deployment queue
- Dedicated deployment worker process
- Docker-based repo build and runtime provisioning
- Framework detection for Next.js, React static builds, and Node.js apps with a start script
- Local preview URL creation on configurable host ports
- Deployment status transitions:
  `QUEUED`, `CLONING`, `DETECTING`, `BUILDING`, `STARTING`, `READY`, `FAILED`, `STOPPED`

## Environment Setup

1. Copy the env files:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.local.example apps/web/.env.local
```

2. Fill in GitHub OAuth values in `apps/server/.env`:

```env
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
GITHUB_REDIRECT_URI=http://localhost:4000/auth/github/callback
```

3. Review the deployment/queue settings in `apps/server/.env`:

```env
REDIS_URL=redis://localhost:6379
PREVIEW_HOST=localhost
PREVIEW_PROTOCOL=http
PREVIEW_PORT_RANGE_START=3100
PREVIEW_PORT_RANGE_END=3199
```

## Setup Commands

Install dependencies:

```bash
pnpm install
```

Start PostgreSQL and Redis:

```bash
docker compose up -d
```

## Migration Commands

Generate Prisma client:

```bash
pnpm run db:generate
```

Apply migrations:

```bash
pnpm run db:migrate
```

Open Prisma Studio:

```bash
pnpm run db:studio
```

## Run Commands

Run the full workspace in development:

```bash
pnpm dev
```

Run only the API server:

```bash
pnpm --filter @launchpad/server dev:api
```

Run only the deployment worker:

```bash
pnpm --filter @launchpad/server dev:worker
```

Run only the web app:

```bash
pnpm --filter @launchpad/web dev
```

Create production builds:

```bash
pnpm build
```

Run built services:

```bash
pnpm --filter @launchpad/server start
pnpm --filter @launchpad/server start:worker
pnpm --filter @launchpad/web start
```

## API Surface

### Auth

- `GET /auth/github`
- `GET /auth/github/callback`
- `GET /auth/me`
- `POST /auth/logout`

### Projects

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

### Environment Variables

- `GET /api/projects/:id/env`
- `POST /api/projects/:id/env`
- `DELETE /api/projects/:id/env/:envId`

### Deployments

- `GET /api/projects/:id/deployments`
- `POST /api/projects/:id/deployments`
- `GET /api/deployments/:deploymentId`

### GitHub

- `GET /api/github/repos`

Errors use this JSON shape:

```json
{
  "error": "message here",
  "code": "ERROR_CODE"
}
```

## Manual Verification Checklist

1. Start Docker Desktop.
2. Run `docker compose up -d`.
3. Run `pnpm run db:migrate`.
4. Run `pnpm dev`.
5. Open `http://localhost:3000/login`.
6. Sign in with GitHub.
7. Confirm `/dashboard` loads and project cards render.
8. Create or open a project.
9. On `/project/[id]`, click `Deploy latest`.
10. Confirm a deployment appears in history with status `QUEUED`.
11. Confirm the worker advances the deployment through `CLONING`, `DETECTING`, `BUILDING`, and `STARTING`.
12. Confirm the deployment reaches `READY` or `FAILED`.
13. If it reaches `READY`, open the preview URL and confirm the app responds.
14. Trigger another deployment and confirm history shows both runs in reverse chronological order.
15. Confirm the previous active preview becomes `STOPPED` when a newer deployment becomes `READY`.
16. Delete the project and confirm associated preview containers are removed.
17. Confirm unauthenticated access to deployment routes returns `401` with the expected `{ error, code }` shape.

## What Was Verified In This Environment

- `pnpm install`
- `pnpm run typecheck`
- `pnpm run build`
- The built API server started on `http://localhost:4000`
- The built web app started on `http://localhost:3000`
- The built deployment worker started and surfaced a clear Redis connection failure when Redis was unavailable
- `GET /api/projects/:id/deployments` returned `401` with the expected error shape when unauthenticated
- `GET /api/deployments/:deploymentId` returned `401` with the expected error shape when unauthenticated
- The updated project detail route responded from the built web app

## Known Limitations

- Full queue-backed deployment execution was not verified here because the Docker daemon was not available, so Redis/PostgreSQL containers could not be started from this environment.
- Full GitHub OAuth callback and repo build verification still require real GitHub OAuth credentials.
- Docker builds currently target standalone Next.js apps, standalone React static apps, and Node.js apps with a `start` script. More complex monorepo/workspace deployment topologies are not covered yet.
- MongoDB log persistence, live log streaming, GitHub webhooks, AI failure analysis, analytics, and Azure integration are intentionally not included in Phase 2.

## Phase 3 Not Yet Implemented

- MongoDB build log persistence
- frontend live log streaming
- GitHub webhooks
- AI failure analysis
- analytics
- Azure integration
