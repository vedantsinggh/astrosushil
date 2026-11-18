FROM node:20.19.0-bookworm-slim AS builder

WORKDIR /app

# Copy root monorepo manifest and configs
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/api/ ./apps/api/

# Install dependencies and build workspace packages + Fastify API
RUN npm ci
RUN npm run db:generate --workspace=apps/api
RUN npm run build:packages
RUN npm run build:api

FROM node:20.19.0-bookworm-slim AS runner

WORKDIR /app

# Install XeLaTeX and LaTeX packages for PDF report compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-xetex \
    texlive-latex-extra \
    fonts-open-sans \
    fonts-texgyre \
    fontconfig \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=apps/api"]

