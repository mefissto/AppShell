# =========================
# Backend Dockerfile (explained)
# =========================
# This image is for local development with NestJS watch mode.
# It favors reproducibility (`npm ci`) and container health visibility (`curl` for healthcheck).

# Pin Node + Alpine image by digest for repeatable builds.
# Why: same base image bits across machines and over time.
FROM node:lts-alpine3.22@sha256:d28696cabe6a72c5addbb608b344818e5a158d849174abd4b1ae85ab48536280

# Set default working directory for all subsequent commands.
# Why: keeps file operations predictable and avoids repeating absolute paths.
WORKDIR /app

# Copy only package manifests first.
# Why: this maximizes Docker layer cache reuse for dependency installation when source code changes.
COPY package*.json ./

# Install exact dependency tree from package-lock.json.
# Why: `npm ci` is deterministic and faster/safer for container builds than `npm install`.
# Then clear npm cache.
# Why: reduces final image size by removing temporary package cache files.
RUN npm ci && npm cache clean --force

# Install curl used by Docker Compose healthcheck.
# Why: backend healthcheck runs `curl http://localhost:<port>/health/ready`.
# Without curl, the app can be healthy but container is marked unhealthy.
RUN apk add --no-cache curl

# Copy project files into the image.
# Why: app source is needed for `start:dev` and TypeScript watch mode.
COPY . .

# Default app port inside container.
# Why: documents intended internal port and supports tooling that reads `PORT`.
ENV PORT=3000

# Metadata: container listens on 3000.
# Why: informative for humans and some tooling; does not publish the port by itself.
EXPOSE 3000

# Start Nest in development watch mode.
# Why: enables hot-reload-like behavior in your dev Docker workflow.
CMD ["npm", "run", "start:dev"]

# -----------------------------------------------------------------------------
# Previous simpler version (reference only; commented out intentionally)
# -----------------------------------------------------------------------------
# FROM node:lts-alpine3.22@sha256:d28696cabe6a72c5addbb608b344818e5a158d849174abd4b1ae85ab48536280
#
# WORKDIR /app
#
# COPY package*.json ./
#
# RUN npm install
# RUN apk add --no-cache curl
#
# COPY . .
#
# ENV PORT=3000
#
# EXPOSE 3000
#
# CMD ["npm", "run", "start:dev"]