# Stage 1: Build
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
# Support both new bun.lock and old bun.lockb
COPY bun.lock* bun.lockb* ./
COPY prisma ./prisma/

RUN bun install

# Copy source and generate Prisma client
COPY . .
RUN bun run prisma:generate

# Stage 2: Runtime
FROM oven/bun:1-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json ./
COPY bun.lock* bun.lockb* ./
RUN bun install --production

# Copy source and prisma client from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3000

# Run the app
CMD ["bun", "src/index.ts"]
