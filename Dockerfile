# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
# Use the owner's photo as the human avatar
COPY knowledge/pic.jpg ./public/avatar-human.png
RUN npm run build

# Stage 2: Python backend + serve frontend
FROM python:3.12-slim AS final

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Copy backend dependencies and install
COPY backend/pyproject.toml backend/uv.lock* ./backend/
RUN cd backend && uv sync --frozen --no-dev

# Copy backend source
COPY backend/ ./backend/

# Copy knowledge files
COPY knowledge/ ./knowledge/

# Copy portfolio static site
COPY portfolio/ ./portfolio/
# Use the owner's photo in the portfolio assets folder
RUN cp ./knowledge/pic.jpg ./portfolio/assets/pic.jpg

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 8000

# Run
CMD ["bash", "-c", "cd /app/backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
