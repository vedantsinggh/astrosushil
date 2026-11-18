FROM node:20.19.0-bookworm-slim AS builder

WORKDIR /app

# Copy root monorepo manifest and configs
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/package.json
COPY apps/admin/ ./apps/admin/

# Install dependencies and build workspace packages + Next.js Admin
RUN npm ci
RUN npm run build:packages
RUN npm run build:admin

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=apps/admin"]
