# Policy Claims Tracker

Policy Claims Tracker is a full-stack web application for managing insurance policies and claims. It provides JWT-based authentication, role-aware operations for adjusters/admins, and dashboards for claim/policy visibility.

## Architecture Overview

The project is organized as a small microservice-style stack:

- **Client**: React + Vite SPA served by Nginx (`capstone-client`)
- **API**: Express + TypeScript REST API (`capstone-api`)
- **Database**: MongoDB 7

High-level flow:

1. Browser loads the SPA from the client service.
2. SPA calls `/api/*` endpoints.
3. Nginx (client) proxies `/api/*` to API (`:4000`).
4. API reads/writes claim and policy data in MongoDB.

Repository layout:

```text
claims-tracker/
├─ capstone-client/   # React UI + Nginx config
├─ capstone-api/      # Express API + Mongo models/routes
├─ k8s/               # Kubernetes manifests (Kind-ready)
├─ docker-compose.yml
├─ docker-compose.prod.yml
└─ generate-certs.sh
```

## Quick Start (Docker Compose)

Run the full development stack (MongoDB + API + client):

```bash
docker compose up --build
```

Access:

- App: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`

Note:

- In dev compose mode, MongoDB is published on host `27018` (`27018:27017`) and data persists via the `mongo-data` named volume.

Stop services:

```bash
docker compose down
```

If you started compose with a custom project name, include it when stopping:

```bash
docker compose -p <project-name> down
```

Note:

- Avoid running multiple development compose projects that publish the same host ports (`3000`, `4000`, `27018`) at the same time, unless you remap ports.

## Local Development (Without Docker)

Prerequisites:

- Node.js 20+
- npm 10+
- Local MongoDB running on `mongodb://localhost:27017`

Default MongoDB URI by runtime:

- Local: `mongodb://localhost:27017/policy-claims`
- Docker Compose (dev): `mongodb://mongo:27017/policy-claims`
- Kind Kubernetes: `mongodb://mongo:27017/policy-claims`

1. Install dependencies:

```bash
npm install
npm --prefix capstone-api install
npm --prefix capstone-client install
```

2. Create API env file:

```bash
cp capstone-api/.env.example capstone-api/.env
```

3. Start both API + client from project root:

```bash
npm run dev
```

Useful dev command if ports are busy:

```bash
npm run dev:clean
```

Access:

- Frontend: `http://localhost:5173`
- API direct: `http://localhost:4000`

## Common Run Modes

| Mode                      | Start command                                                                                 | Stop command                                     | App URL                  | Notes                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------- |
| Local dev (no Docker)     | `npm run dev`                                                                                 | `Ctrl+C` (in terminal)                           | `http://localhost:5173`  | Uses `mongodb://localhost:27017/policy-claims`                                      |
| Docker Compose (dev)      | `docker compose up --build`                                                                   | `docker compose down`                            | `http://localhost:3000`  | Uses `mongodb://mongo:27017/policy-claims`; Mongo also exposed at `localhost:27018` |
| Docker Compose (prod SSL) | `docker compose -f docker-compose.prod.yml up --build -d`                                     | `docker compose -f docker-compose.prod.yml down` | `https://localhost:8443` | Run `bash ./generate-certs.sh` first; `http://localhost:8080` redirects to HTTPS    |
| Kind Kubernetes           | `kind create cluster --name policy-claims --config k8s/kind-config.yaml` then apply manifests | `kind delete cluster --name policy-claims`       | `http://localhost:30080` | Uses `mongodb://mongo:27017/policy-claims`; rebuild/load images after changes       |

## Testing

Run all tests from project root:

```bash
npm test
```

Run suites individually:

```bash
npm run test:api
npm run test:client
```

## Dev Test Users

The seed script creates the following users:

- **Admin**: `ava.admin@example.com` / `AdminPass123`
- **Adjuster**: `liam.adjuster@example.com` / `AdjusterPass123`
- **Adjuster**: `noah.adjuster@example.com` / `AdjusterPass456`

Reseed depending on how your API is running:

- **Local API process**: `npm run seed`
- **Docker API container (dev compose)**: `docker compose exec api node dist/seed.js`
- **Docker API container (prod compose)**: `docker compose -f docker-compose.prod.yml exec api node dist/seed.js`

## Production Build with SSL

1. Generate self-signed certificates:

```bash
bash ./generate-certs.sh
```

This creates:

- `certs/server.crt`
- `certs/server.key`

2. Start production stack:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Access:

- HTTPS app: `https://localhost:8443`
- HTTP endpoint (redirects to HTTPS): `http://localhost:8080`

Notes:

- Browser warning is expected for self-signed certs.
- For CLI testing, use `curl -k https://localhost:8443/api/health`.
- The HTTP redirect may resolve to `https://localhost/` (without `:8443`) depending on host headers; open `https://localhost:8443` directly for local access.

Stop production stack:

```bash
docker compose -f docker-compose.prod.yml down
```

## Kind Deployment Instructions

This repo includes Kind/Kubernetes manifests in `k8s/` and host-to-NodePort mapping in `k8s/kind-config.yaml`.

1. Create cluster:

```bash
kind create cluster --name policy-claims --config k8s/kind-config.yaml
```

2. Build local images with tags expected by manifests:

```bash
docker build -t capstone-api:latest ./capstone-api
docker build -t capstone-client:latest ./capstone-client
```

3. Load images into Kind:

```bash
kind load docker-image capstone-api:latest --name policy-claims
kind load docker-image capstone-client:latest --name policy-claims
```

4. Apply manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/client.yaml
```

5. Verify resources:

```bash
kubectl get pods,svc -n policy-claims
```

6. Open app:

- `http://localhost:30080`

## API Endpoint Reference

Base URL:

- Local API direct: `http://localhost:4000`
- Through client proxy: `/api/*`

| Method | Endpoint                | Auth        | Description                          |
| ------ | ----------------------- | ----------- | ------------------------------------ |
| GET    | `/api/health`           | No          | Service health check                 |
| POST   | `/api/auth/register`    | No          | Register a user                      |
| POST   | `/api/auth/login`       | No          | Login and receive JWT                |
| GET    | `/api/auth/me`          | Yes         | Current authenticated user           |
| GET    | `/api/users`            | Yes (Admin) | List users                           |
| GET    | `/api/policies`         | Yes         | List policies (filters + pagination) |
| GET    | `/api/policies/:id`     | Yes         | Get policy details                   |
| POST   | `/api/policies`         | Yes         | Create policy                        |
| PUT    | `/api/policies/:id`     | Yes         | Update policy                        |
| DELETE | `/api/policies/:id`     | Yes         | Delete policy                        |
| GET    | `/api/claims`           | Yes         | List claims (filters + pagination)   |
| GET    | `/api/claims/stats`     | Yes         | Claim stats aggregates               |
| GET    | `/api/claims/:id`       | Yes         | Get claim details                    |
| POST   | `/api/claims`           | Yes         | Create claim                         |
| PUT    | `/api/claims/:id`       | Yes         | Update claim                         |
| POST   | `/api/claims/:id/notes` | Yes         | Add claim note                       |
| DELETE | `/api/claims/:id`       | Yes         | Delete claim                         |
| GET    | `/api/dashboard`        | Yes         | Dashboard aggregates                 |

## Tech Stack Summary

- **Frontend**: React 19, TypeScript, Vite, Axios, React Router
- **Backend**: Node.js, Express 5, TypeScript, Mongoose, JWT, express-validator
- **Database**: MongoDB 7
- **Testing**: Vitest, React Testing Library, Supertest, MongoDB Memory Server
- **Containers**: Docker multi-stage builds, Docker Compose (dev + prod)
- **Orchestration**: Kubernetes manifests + Kind cluster

## Quick Diagnostics

Run from project root:

```bash
# Frontend/API reachability (local dev)
curl -s -o /dev/null -w 'vite-5173:%{http_code}\n' http://localhost:5173
curl -s -o /dev/null -w 'api-4000-health:%{http_code}\n' http://localhost:4000/api/health

# Docker Compose endpoints
curl -s -o /dev/null -w 'compose-dev-3000:%{http_code}\n' http://localhost:3000
curl -k -s -o /dev/null -w 'compose-prod-8443:%{http_code}\n' https://localhost:8443

# Kind endpoint
curl -s -o /dev/null -w 'kind-30080:%{http_code}\n' http://localhost:30080

# Containers and Kubernetes resources
docker ps --format 'table {{.Names}}\t{{.Ports}}'
kubectl get pods,svc -n policy-claims
```

## Troubleshooting

- **`Invalid credentials` on `http://localhost:5173`**
  - Vite proxies `/api` to `http://localhost:4000`. Make sure the API running on port `4000` is seeded.
  - For local API process: `npm run seed`
  - For Docker API container: `docker compose exec api node dist/seed.js`

- **`Bind for 0.0.0.0:4000 failed: port is already allocated`**
  - Another local process or compose project is using port `4000`.
  - Stop conflicting stacks/processes, then restart your intended stack.

- **`http://localhost:3000` not reachable in Docker dev**
  - Check whether compose actually started: `docker compose ps`.
  - If startup failed with `Bind for 0.0.0.0:27018 failed`, another process is already using Docker dev Mongo's host port.
  - Stop the conflicting process/stack, then recover with `docker compose down && docker compose up -d --build`.

- **UI changes not visible in Docker/K8s**
  - Rebuild and restart the client image/container.
  - Kind flow: rebuild image, `kind load docker-image ...`, then `kubectl rollout restart deployment/client -n policy-claims`.

- **Self-signed HTTPS warning at `https://localhost:8443`**
  - Expected for local self-signed certs.
  - Use `curl -k` for CLI checks.
