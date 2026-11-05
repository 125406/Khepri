# ==========================================
# Stage 1: Base / Dependencies
# ==========================================
FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# ==========================================
# Stage 2: Development (Vite Dev Server)
# ==========================================
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ==========================================
# Stage 3: Build (Production Bundle)
# ==========================================
FROM base AS build
COPY . .
RUN npm run build

# ==========================================
# Stage 4: Production (Nginx Static Server)
# ==========================================
FROM nginx:stable-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
