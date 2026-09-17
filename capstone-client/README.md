# Policy Claims Tracker Client

Frontend SPA for the Policy Claims Tracker application.

## Tech Stack

- React 19 + TypeScript
- Vite 8
- React Router
- Axios
- Vitest + React Testing Library

## Development

From the `capstone-client` directory:

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production assets: `npm run build`
- Preview build: `npm run preview`
- Run tests: `npm run test`

Default dev URL: `http://localhost:5173`

## API Integration

In development, Vite proxies API calls to the backend:

- Proxy path: `/api/*`
- Target: `http://localhost:4000`
- Config file: `vite.config.ts`

This lets the client call relative endpoints (for example, `/api/auth/login`) without hard-coding hostnames.

## Docker

Build the image:

- `docker build -t capstone-client .`

Run the container:

- `docker run --rm -p 80:80 capstone-client`

Note: this standalone run serves the UI, but `/api/*` proxy calls expect an upstream named `api` (`http://api:4000`). Use Docker Compose/Kubernetes for full UI+API connectivity, or provide an Nginx config that points `/api` to a reachable backend host.

The Docker image uses a multi-stage build:

1. `node:20-alpine` builder compiles the app
2. `nginx:alpine` runtime serves static assets

Nginx configuration:

- `nginx.conf`: HTTP serving + SPA fallback + `/api` reverse proxy to `http://api:4000`
- `nginx-ssl.conf`: production SSL config with HTTP-to-HTTPS redirect and `/api` reverse proxy

## Notes

- In Docker Compose and Kubernetes, backend service discovery expects the API service name to be `api`.
- Responsive behavior is implemented in `src/index.css` and `src/App.css`.

## Quick Diagnostics

Run from `capstone-client` directory (or prefix with `npm --prefix capstone-client` from root):

```bash
# Start dev server and check UI
npm run dev
curl -s -o /dev/null -w 'client-5173:%{http_code}\n' http://localhost:5173

# Confirm API proxy path reaches backend
curl -s -o /dev/null -w 'proxy-api-health:%{http_code}\n' http://localhost:5173/api/health

# Build + test
npm run build
npm run test
```

If using Docker Compose:

```bash
docker compose ps
curl -s -o /dev/null -w 'compose-client-3000:%{http_code}\n' http://localhost:3000
```

## Troubleshooting

- **`ECONNREFUSED 127.0.0.1:4000` in dev**
  - The Vite proxy target (`http://localhost:4000`) is not reachable.
  - Start the API (from project root: `npm run dev:api`, or start the Docker Compose API service).

- **`Invalid credentials` in UI**
  - The API is reachable, but the active database may not contain expected seeded users.
  - Seed the database for the API instance currently behind port `4000`.

- **`http://localhost:3000` not reachable in Docker dev**
  - Check whether compose actually started: `docker compose ps`.
  - If startup failed with `Bind for 0.0.0.0:27018 failed`, another process is already using Docker dev Mongo's host port.
  - Stop the conflicting process/stack, then recover with `docker compose down && docker compose up -d --build`.

- **UI changes not appearing in Docker**
  - Rebuild the client image and restart container/service so new `dist` assets are served.

- **Unexpected API route behavior in containers**
  - Confirm the client is using the intended Nginx config (`nginx.conf` vs `nginx-ssl.conf`) and that `/api/` proxies to service `api:4000`.
