# Policy Claims Tracker API

Backend API for insurance adjusters and administrators to manage users, policies, and claims.

## Tech Stack

- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT authentication

## Server architecture

- Entry point: `src/server.ts`
- Express app module: `src/app.ts`
- All API routes are mounted under `/api` via `src/routes/index.ts`

## Setup

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - `cp .env.example .env`
   - Update `.env` values
3. Run development server:
   - `npm run dev`

## Scripts

- `npm run dev`: Run API in watch mode with `tsx`
- `npm run build`: Compile TypeScript to `dist/`
- `npm start`: Run compiled API from `dist/server.js`
- `npm run seed`: Seed database with demo users/policies/claims
- `npm test`: Run Vitest test suite

## Environment variables

- `PORT` Application port (default: `4000`)
- `CLIENT_ORIGIN` Allowed CORS origin (default: `http://localhost:5173`)
- `MONGODB_URI` MongoDB connection string (primary)
- `JWT_SECRET` Secret used to sign JWT tokens
- `JWT_EXPIRES_IN` Optional token lifetime (default: `1d`)

Compatibility note: the API also accepts `MONGO_URI` as a fallback for older configurations.

## Build and run

- Build: `npm run build`
- Start built app: `npm start`

## Testing

The API includes Vitest integration tests using:

- `supertest` for HTTP assertions
- `mongodb-memory-server` for isolated in-memory MongoDB

Run tests:

- `npm test`

Primary test file:

- `tests/api.integration.test.ts`

## Docker

- Build image:
  - `docker build -t capstone-api .`
- Run container:
  - `docker run --rm -p 4000:4000 --add-host=host.docker.internal:host-gateway -e MONGODB_URI=mongodb://host.docker.internal:27017/policy-claims -e JWT_SECRET=replace-with-a-strong-secret capstone-api`

Note: when running the API as a standalone container, `localhost` inside the container is not your host MongoDB process. Use `host.docker.internal` (as above) or use Docker Compose for API+Mongo together.

Default MongoDB URI by runtime:

- Local API: `mongodb://localhost:27017/policy-claims`
- Docker Compose API: `mongodb://mongo:27017/policy-claims`
- Kind/Kubernetes API: `mongodb://mongo:27017/policy-claims`

For the easiest local container workflow with API + Mongo already wired, prefer the root-level `docker compose up --build`.

The Dockerfile uses a multi-stage build:

- builder stage installs all deps and compiles TypeScript
- runtime stage installs production deps only and runs `dist/server.js`

## API overview

- `GET /api/health` Health check
- `POST /api/auth/register` Register adjuster/admin
- `POST /api/auth/login` Login
- `GET /api/auth/me` Get authenticated user profile
- `GET /api/users` Admin-only user list
- `GET /api/policies` List policies (filters + pagination)
- `GET /api/policies/:id` Get policy details
- `POST /api/policies` Create policy (owner = authenticated user)
- `PUT /api/policies/:id` Update policy
- `DELETE /api/policies/:id` Delete policy
- `GET /api/claims` List claims (filters + pagination)
- `GET /api/claims/stats` Claim aggregate statistics
- `GET /api/claims/:id` Get claim details (with policy + assignee)
- `POST /api/claims` Create claim (assignedTo = authenticated user)
- `PUT /api/claims/:id` Update claim
- `POST /api/claims/:id/notes` Add claim note
- `DELETE /api/claims/:id` Delete claim
- `GET /api/dashboard` Dashboard aggregate data

## Quick Diagnostics

Run API commands from `capstone-api` directory (or prefix with `npm --prefix capstone-api` from root):

```bash
# API process + health
npm run dev
curl -s -o /dev/null -w 'api-health:%{http_code}\n' http://localhost:4000/api/health

# Type check/build + tests
npm run build
npm test

# Seed local API database
npm run seed
```

If the API runs in Docker Compose (run from project root):

```bash
docker compose ps
docker compose exec api node dist/seed.js
curl -s -o /dev/null -w 'api-health:%{http_code}\n' http://localhost:4000/api/health
```

## Troubleshooting

- **`Missing required environment variable` on startup**
  - Ensure `.env` exists and includes at least `MONGODB_URI` and `JWT_SECRET`.

- **Mongo connection errors**
  - Verify MongoDB is running and the `MONGODB_URI` value is reachable from where the API process runs.

- **Login works in one environment but not another**
  - You may have seeded a different database than the API instance serving requests.
  - Reseed the active environment (`npm run seed` for local API, or run seed inside the active API container).

- **TypeScript error for `supertest` types**
  - Ensure dev dependencies are installed (`npm install`) including `@types/supertest`.
