# Build stage
FROM node:20.19-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# npm 10 (bundled with the node:18 image) can exit 0 from npm ci after
# aborting with "Exit handler never called!", leaving node_modules empty.
# Use a newer npm so the clean install either succeeds or fails loudly.
RUN npm install --global npm@11.10.0

# Install the exact dependency versions recorded in package-lock.json.
RUN npm ci --no-audit --no-fund

# Guard against the silent-failure mode above: the build needs these to resolve.
RUN test -d node_modules/postcss && test -d node_modules/tailwindcss && test -d node_modules/vite

# Copy source code
COPY . .

# build-css.js writes into dist2/, which is gitignored and absent in a clean
# checkout. Without this the CSS step fails silently.
RUN mkdir -p dist2

# Build the browser bundle served by Nginx.
RUN npm run build:frontend

# Fail here rather than shipping an empty document root.
RUN test -f dist/index.html && test -f dist/main.js

# Production stage
FROM nginx:alpine

# Default for plain docker run; Railway overrides PORT at runtime.
ENV PORT=8080

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the templated nginx configuration. The official nginx image expands
# ${PORT} at container start, so Railway can route to its assigned port.
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Railway supplies PORT at runtime. This is documentation for local Docker
# users; nginx ultimately listens on the value of PORT.
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
