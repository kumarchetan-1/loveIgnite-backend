# Love Ignite Backend

The backend service for the Love Ignite app, providing user authentication, cloud synchronization for achievements, and unlocked challenge tracking.

## 🚀 Tech Stack

- **Runtime**: [Bun](https://bun.sh/) (Fastest JavaScript runtime)
- **Framework**: Express (v5)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT & Bcrypt
- **Proxy/SSL**: Caddy (Automatic HTTPS)
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions

## 🛠 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime installed.
- [Docker](https://www.docker.com/) & Docker Compose.

### Installation & Local Development

1. Clone the repository and navigate to the backend folder:
   ```bash
   cd loveIgnite-backend
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure Environment Variables:
   Copy the example file and fill in your values:
   ```bash
   cp .env.example .env
   ```

4. Run Database Migrations:
   ```bash
   bun run prisma:migrate
   ```

5. Start the development server:
   ```bash
   bun run dev
   ```

---

## 🐳 Running with Docker

This project uses a production-ready multi-stage Docker setup.

### Local Docker Run
To run the entire stack (App + Postgres + Caddy) locally:
```bash
docker-compose up --build
```
*Note: Ensure your `.env` is configured correctly for the internal database service.*

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup`: Create account (`email`, `password`, `name`).
- `POST /api/auth/login`: Authenticate and receive JWT.

### User Data (Protected)
- `GET /api/user/profile`: Retrieve user profile, achievements, and unlocked cards.
- `POST /api/user/sync-achievements`: Sync an array of `achievementIds`.
- `POST /api/user/sync-cards`: Sync an array of `cardIds`.

---

## ☁️ Deployment (DigitalOcean Droplet)

This project is configured for automated deployment via GitHub Actions to a DigitalOcean Droplet.

### 1. Droplet Setup
1. Install Docker & Docker Compose on your Droplet.
2. Clone this repo into `~/loveIgnite-backend`.
3. Create a `.env` file in the project folder with your production secrets.
4. Set up an A record for your domain to point to the Droplet's IP.

### 2. GitHub Actions Configuration
Add the following to your GitHub Repository Secrets:
- `DROPLET_IP` (in Variables): Your Droplet's IP.
- `DROPLET_USER`: Usually `root`.
- `MY_PRIVATE_KEY`: Your SSH private key content.
- `MY_PRIVATE_KEY_PASSPHRASE`: The passphrase for your SSH key.

### 3. Continuous Deployment
Whenever you push to the `main` branch, the `Backend CD` workflow will:
1. SSH into your Droplet.
2. Pull the latest code.
3. Rebuild and restart containers using `docker-compose`.
4. Run Prisma migrations automatically.
5. Clean up old images.

---

## 📂 Project Structure

```text
src/
├── controllers/    # Request handlers
├── middleware/     # Auth and validation logic
├── routes/         # API route definitions
├── lib/            # Shared utilities (Prisma client)
└── index.ts        # Server entry point
prisma/
└── schema.prisma   # Database schema & models
```

## 📜 License
ISC
