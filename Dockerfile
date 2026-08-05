# ============================================
# Stage 1: Builder
# ============================================
FROM node:18-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/requirements.txt ./backend/

# Install dependencies
RUN npm ci --only=production
RUN pip3 install -r backend/requirements.txt --no-cache-dir

# Copy source code
COPY . .

# Build Next.js
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:18-slim

WORKDIR /app

# Install Python and system dependencies
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend ./backend

# Create data directory
RUN mkdir -p ./data/models ./data/raw ./logs

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PYTHONUNBUFFERED=1
ENV MODEL_PATH=./data/models/titanic_ensemble.pkl

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]