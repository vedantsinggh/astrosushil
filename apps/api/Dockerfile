FROM node:20-alpine AS builder

WORKDIR /app

# Copy root monorepo manifest and configs
COPY package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies and build workspace packages + Fastify API
RUN npm install
RUN npm run build:packages
RUN npm run build:api

EXPOSE 3000

CMD ["npm", "run", "start:prod", "--workspace=apps/api"]
