# Love Ignite Backend

This is the backend service for the Love Ignite app, built with Node.js, Express, TypeScript, and Prisma.

## Prerequisites

- Node.js (v18 or later)
- Docker and Docker Compose (optional, for local DB)
- PostgreSQL (if not using Docker)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory and add the following:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/loveignite?schema=public"
   JWT_SECRET="your-secret-key"
   PORT=3000
   ```

3. **Database Migration:**
   If you have a PostgreSQL instance running, run the following to create the tables:
   ```bash
   npx prisma migrate dev --name init
   ```

## Running the App

### Using Docker (Recommended for development)

```bash
docker-compose up --build
```

This will start both the PostgreSQL database and the Express server.

### Locally

1. Start your PostgreSQL database.
2. Run the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Auth
- `POST /api/auth/signup`: Create a new account. Body: `{ "email": "...", "password": "..." }`
- `POST /api/auth/login`: Log in. Body: `{ "email": "...", "password": "..." }`

### User (Requires Bearer Token)
- `GET /api/user/profile`: Get user achievements and unlocked cards.
- `POST /api/user/sync-achievements`: Sync achievements. Body: `{ "achievements": ["id1", "id2"] }`
- `POST /api/user/sync-cards`: Sync unlocked cards. Body: `{ "cardIds": ["id1", "id2"] }`

## Deployment to GCP

This project is ready to be deployed to **Google Cloud Run**.

1. Build the Docker image:
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT-ID]/loveignite-backend
   ```

2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy loveignite-backend --image gcr.io/[PROJECT-ID]/loveignite-backend --platform managed
   ```

Make sure to set the `DATABASE_URL` (pointing to Cloud SQL) and `JWT_SECRET` in the Cloud Run environment variables.

