# Stage 1: Build
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
# Bun can use package-lock.json or bun.lockb if it exists
COPY package-lock.json* bun.lockb* ./
COPY prisma ./prisma/

RUN bun install

# Copy source and build
COPY . .
RUN bunx prisma generate
RUN bun run build

# Stage 2: Runtime
FROM oven/bun:1-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json ./
COPY package-lock.json* bun.lockb* ./
RUN bun install --production

# Copy built files and prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3000

# Run the app with bun
CMD ["bun", "dist/index.js"]

