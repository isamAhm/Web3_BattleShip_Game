FROM node:20-alpine AS builder

WORKDIR /app

# Copy engine package first (local dep)
COPY ../../packages/engine ./packages/engine
RUN cd packages/engine && npm install && npm run build

# Copy server
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 4000
CMD ["node", "dist/index.js"]
