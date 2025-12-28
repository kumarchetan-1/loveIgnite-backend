# Love Ignite Backend

The backend service for the Love Ignite app, providing user authentication, cloud synchronization for achievements, and unlocked challenge tracking.

## 🚀 Tech Stack

- **Runtime**: Node.js (Bun recommended)
- **Framework**: Express (v5)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT & Bcrypt
- **Containerization**: Docker

## 🛠 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime installed.
- [Docker](https://www.docker.com/) (optional, for local database).
- [PostgreSQL](https://www.postgresql.org/) instance.

### Installation

1. Clone the repository and navigate to the backend folder:
   ```bash
   cd loveIgnite-backend
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/loveignite?schema=public"
   JWT_SECRET="your-secure-key"
   PORT=3000
   ```

4. Run Database Migrations:
   ```bash
   bun run prisma:migrate
   ```

### Running the Server

#### Development Mode (Bun)
```bash
bun run dev
```

#### Production Mode
```bash
bun run build
bun start
```

#### Using Docker
```bash
docker-compose up --build
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup`: Create account (`email`, `password`, `name`).
- `POST /api/auth/login`: Authenticate and receive JWT.

### User Data (Protected)
- `GET /api/user/profile`: Retrieve user profile, achievements, and unlocked cards.
- `POST /api/user/sync-achievements`: Sync an array of `achievementIds`.
- `POST /api/user/sync-cards`: Sync an array of `cardIds`.

## 📂 Project Structure

```text
src/
├── controllers/    # Request handlers
├── middleware/     # Auth and validation logic
├── routes/         # API route definitions
├── lib/            # Shared utilities (Prisma client)
└── index.ts        # Server entry point
```

## ☁️ Deployment

This project is Docker-compatible and ready for deployment to **Google Cloud Run** or any container-based platform.

1. Build the image: `docker build -t loveignite-backend .`
2. Push and deploy to your preferred cloud provider.
