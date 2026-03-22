# Launchpad

> A self-hosted cloud deployment platform. Connect a GitHub repo, push code, and get a live preview URL with real-time build logs, AI-powered failure analysis, and a polished dashboard.

Built by **Nithin Reddy Poola** — MS CS @ UMBC

## Live Demo
[https://launchpad-demo.up.railway.app](https://launchpad-demo.up.railway.app)

![Dashboard screenshot placeholder](https://placehold.co/1200x675?text=Launchpad+Dashboard)

## What it does
- Connect any GitHub repository and deploy it in one click
- Real-time build logs stream to your browser as Docker builds your app
- AI explains what went wrong when a build fails
- GitHub webhooks auto-trigger deployments on every push
- Analytics dashboards track deployment history and build performance

## Architecture

Launchpad clones a GitHub repository, detects a supported framework, builds it into an isolated Docker image, starts a preview container on a local port, and surfaces the result in a web dashboard. Deployment work runs through a Redis-backed BullMQ queue so the API server stays responsive while builds are executing. Docker build output is persisted to MongoDB when available and broadcast to browsers over Socket.io in real time. Failed deployments can be summarized by Azure OpenAI or the OpenAI API using the latest saved log lines.

### Key engineering decisions
| Decision | Why |
|---|---|
| Isolated Docker images and containers per deployment | Prevents one build from polluting another preview runtime |
| Redis + BullMQ job queue | Handles deployment work asynchronously without blocking the API |
| Socket.io for live terminal output | Streams deployment logs to the browser without polling |
| MongoDB for build log persistence | Stores append-heavy deployment logs independently from the relational data model |
| PostgreSQL + Prisma for product data | Keeps auth, projects, deployments, and settings strongly typed and relational |
| Optional AI failure analysis | Turns the last 50 error lines into actionable explanations when API keys are configured |

## Tech stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, TanStack Query, Recharts, Socket.io-client |
| Backend | Node.js, Express, TypeScript, Prisma, BullMQ, Socket.io, Mongoose |
| Build engine | Docker CLI, git |
| AI analysis | Azure OpenAI or OpenAI Chat Completions |
| Databases | PostgreSQL, MongoDB, Redis |
| Infrastructure | Docker Compose, Turborepo, pnpm workspaces |

## Getting started

### Prerequisites
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker Desktop running locally

### Setup
```bash
git clone https://github.com/poolanithinreddy/Launchpad.git
cd Launchpad
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.local.example apps/web/.env.local
# Add your GitHub OAuth credentials to apps/server/.env
docker compose up -d
pnpm run db:migrate
pnpm dev
```

Open `http://localhost:3000`.

### Environment variables

#### Server
| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | Runtime mode. Defaults to `development`. |
| `PORT` | No | Express API port. Defaults to `4000`. |
| `FRONTEND_URL` | Yes | Allowed frontend origin for CORS and auth redirects. |
| `JWT_SECRET` | Yes | Secret used to sign the Launchpad session cookie JWT. |
| `JWT_EXPIRES_IN` | Yes | JWT lifetime, for example `7d`. |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID. |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret. |
| `GITHUB_REDIRECT_URI` | Yes | GitHub OAuth callback URL. |
| `DATABASE_URL` | Yes | PostgreSQL connection string for Prisma. |
| `REDIS_URL` | Yes | Redis connection string for BullMQ and deployment event fan-out. |
| `MONGODB_URI` | No | MongoDB connection string for build log persistence. If MongoDB is unavailable, Launchpad keeps deploying without saved logs. |
| `OPENAI_API_KEY` | No | Standard OpenAI API key for failure analysis. |
| `AZURE_OPENAI_KEY` | No | Azure OpenAI API key. Takes priority over `OPENAI_API_KEY`. |
| `AZURE_OPENAI_ENDPOINT` | No | Azure OpenAI resource endpoint, for example `https://your-resource.openai.azure.com`. |
| `AZURE_OPENAI_DEPLOYMENT` | No | Azure OpenAI deployment name used for chat completions. |
| `AZURE_CONTAINER_REGISTRY_URL` | No | Reserved environment slot if you later extend Launchpad toward registry-backed image publishing. |
| `PREVIEW_HOST` | No | Host used to construct local preview URLs. |
| `PREVIEW_PROTOCOL` | No | Preview URL scheme, `http` or `https`. |
| `PREVIEW_PORT_RANGE_START` | No | First allocatable local preview port. |
| `PREVIEW_PORT_RANGE_END` | No | Last allocatable local preview port. |

#### Web
| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Base URL for the Launchpad API. |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Base URL for the Socket.io server used for live build logs. |

## Development workflow

```bash
pnpm dev
```

Useful commands:

```bash
pnpm run typecheck
pnpm run build
pnpm run db:migrate
docker compose up -d
```

## Manual verification

1. Start Docker Desktop.
2. Run `docker compose up -d`.
3. Run `pnpm run db:migrate`.
4. Run `pnpm dev`.
5. Sign in with GitHub at `http://localhost:3000/login`.
6. Create a project from a GitHub repository in the new project wizard.
7. Confirm the first deployment starts automatically after project creation.
8. Open the project page and watch logs stream in real time.
9. Confirm a successful deployment exposes a preview URL.
10. Configure the project webhook in GitHub and push to the configured branch.
11. Confirm a new deployment is queued automatically.
12. Visit `/analytics` and verify charts render against real deployment data.

## Author
**Nithin Reddy Poola**  
MS Computer Science @ UMBC  
GitHub: [@poolanithinreddy](https://github.com/poolanithinreddy)  
LinkedIn: [linkedin.com/in/nithinreddypoola](https://linkedin.com/in/nithinreddypoola)
