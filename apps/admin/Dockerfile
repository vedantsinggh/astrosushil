FROM node:20-alpine AS builder

WORKDIR /app

# Copy root monorepo manifest and configs
COPY package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/admin/ ./apps/admin/

# Install dependencies and build workspace packages + Next.js Admin
RUN npm install
RUN npm run build:packages
RUN npm run build:admin

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=apps/admin"]
