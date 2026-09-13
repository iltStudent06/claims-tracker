# Policy Claims Tracker API

Backend API for insurance adjusters and administrators to manage users, policies, and claims.

## Tech stack

- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT authentication

## Server architecture

- Entry point: `src/server.ts`
- All API routes are mounted under `/api` via `src/routes/index.ts`

## Setup

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - `cp .env.example .env`
   - Update `.env` values
3. Run development server:
   - `npm run dev`

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
