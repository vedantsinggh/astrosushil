FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# API base baked into the bundle at build time. The default is the production API
# (unchanged behaviour); the testing stack passes a relative value (/api/v1).
ARG VITE_API_URL=https://backend.astrosushil.com/api/v1
ENV VITE_API_URL=$VITE_API_URL
# Testing-only switches (apps/website/vite.config.js). Empty = production build unchanged.
ARG VITE_DEPLOY_ENV=
ENV VITE_DEPLOY_ENV=$VITE_DEPLOY_ENV
ARG VITE_NOINDEX=
ENV VITE_NOINDEX=$VITE_NOINDEX

RUN npm run build

FROM nginx:1.28.0-alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]