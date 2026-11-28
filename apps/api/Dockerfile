FROM node:20.19.0-bookworm-slim AS builder

# Prisma picks its engine binaries from the OpenSSL it detects during `npm ci` /
# `prisma generate`. Without openssl here it falls back to openssl-1.1.x engines, which
# do not match the runner (OpenSSL 3), so Prisma would try to download engines at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

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
    texlive-fonts-recommended \
    fonts-open-sans \
    fonts-texgyre \
    fonts-noto-core \
    poppler-utils \
    fontconfig \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=apps/api"]

