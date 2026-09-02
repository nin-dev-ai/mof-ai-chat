# Build stage
FROM node:20.19-alpine AS build

# Proxy arguments passed during docker build
ARG HTTP_PROXY
ARG HTTPS_PROXY

# Make proxy available inside the build container
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV http_proxy=${HTTP_PROXY}
ENV https_proxy=${HTTPS_PROXY}

WORKDIR /app

# Copy package files
COPY package*.json ./

# Explicitly configure npm to use the proxy
RUN npm config set proxy ${HTTP_PROXY} \
    && npm config set https-proxy ${HTTPS_PROXY}

# Use newer npm so npm ci fails properly if something goes wrong
RUN npm install --global npm@11.10.0

# Install exact dependency versions from package-lock.json
RUN npm ci --no-audit --no-fund

# Guard against silent dependency installation failure
RUN test -d node_modules/postcss \
    && test -d node_modules/tailwindcss \
    && test -d node_modules/vite

# Copy source code
COPY . .

# build-css.js writes into dist2/, which is gitignored
RUN mkdir -p dist2

# Build frontend
RUN npm run build:frontend

# Ensure frontend output actually exists
RUN test -f dist/index.html \
    && test -f dist/main.js

# Production stage
FROM nginx:alpine

# Default port
ENV PORT=8080

# Copy built frontend assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
