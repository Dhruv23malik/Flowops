# FlowOps frontend — built from the repo root (build context: .)
# Serves the production build with `serve` on port 4173.
FROM node:20-alpine

WORKDIR /app

ARG VITE_API_URL=http://localhost:3001

# Install workspace dependencies first (better layer caching)
COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/schemas/package.json packages/schemas/package.json
RUN npm ci --ignore-scripts --workspace=@flowops/frontend --workspace=@flowops/schemas

# Copy sources and build (VITE_API_URL is baked in at build time)
COPY packages/schemas packages/schemas
COPY apps/frontend apps/frontend
RUN npm run build --workspace=@flowops/schemas && npm run build --workspace=@flowops/frontend

# Install a production-grade static file server
RUN npm install -g serve

WORKDIR /app/apps/frontend
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
