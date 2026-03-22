# SilkWeb API — Production Dockerfile
# Multi-stage build for minimal attack surface

FROM python:3.12-slim AS base

# Security: run as non-root user
RUN groupadd -r silkweb && useradd -r -g silkweb -d /app -s /sbin/nologin silkweb

WORKDIR /app

# Install system dependencies for argon2
RUN apt-get update && \
    apt-get install -y --no-install-recommends libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY api/ ./api/
COPY migrations/ ./migrations/
COPY alembic.ini .

# Switch to non-root user
USER silkweb

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health').raise_for_status()"

# Run with production settings
EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--no-access-log"]
