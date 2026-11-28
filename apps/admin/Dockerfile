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

# Optional API base baked into the client bundle at build time (NEXT_PUBLIC_*).
# Unset or empty leaves NEXT_PUBLIC_API_URL unset, exactly as before this ARG existed
# (the app then falls back to its own default). Not persisted with ENV on purpose:
# `ENV X=$X` with an unset ARG would set X to an empty string.
ARG NEXT_PUBLIC_API_URL
# Optional environment label for the admin header badge (same unset-when-empty rule).
ARG NEXT_PUBLIC_APP_ENV
RUN if [ -n "${NEXT_PUBLIC_API_URL:-}" ]; then export NEXT_PUBLIC_API_URL; else unset NEXT_PUBLIC_API_URL; fi \
    && if [ -n "${NEXT_PUBLIC_APP_ENV:-}" ]; then export NEXT_PUBLIC_APP_ENV; else unset NEXT_PUBLIC_APP_ENV; fi \
    && npm run build:admin

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=apps/admin"]
