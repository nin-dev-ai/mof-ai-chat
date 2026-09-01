# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build:mobile  

# Production stage
FROM nginx:alpine

# Used for local `docker run` commands. Railway overrides this with the PORT
# it assigns to the service.
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
