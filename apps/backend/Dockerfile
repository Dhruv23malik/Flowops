# FlowOps backend — built from the repo root (build context: .)
FROM node:20-alpine

WORKDIR /app

# Install workspace dependencies first (better layer caching)
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/schemas/package.json packages/schemas/package.json
RUN npm ci --ignore-scripts --workspace=@flowops/backend --workspace=@flowops/schemas

# Copy sources and build
COPY packages/schemas packages/schemas
COPY apps/backend apps/backend
RUN npm run build --workspace=@flowops/schemas && npm run build --workspace=@flowops/backend

WORKDIR /app/apps/backend
EXPOSE 3001
# Apply pending Prisma migrations (incl. 0002_drop_dead_schema), then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
