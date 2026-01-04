# Stage 1: Build
FROM oven/bun:1 AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
# Support both new bun.lock and old bun.lockb
COPY bun.lock* bun.lockb* ./
COPY prisma ./prisma/

# Install all dependencies (including dev deps for prisma)
RUN bun install

# Copy source and generate Prisma client
COPY . .
# Provide a dummy URL so prisma:generate doesn't fail during build
RUN DATABASE_URL="postgresql://unused:unused@localhost:5432/unused" bun run prisma:generate

# Stage 2: Runtime
FROM oven/bun:1

# Install SSL certificates (required for Prisma to connect to DB)
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production dependencies only
COPY package.json ./
COPY bun.lock* bun.lockb* ./
RUN bun install --production

# Copy source and prisma client from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.js ./prisma.config.js
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3000

# Run the app
CMD ["bun", "src/index.ts"]
