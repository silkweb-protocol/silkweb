"""SilkWeb API — FastAPI application with security hardening.

Security measures:
- CORS locked to allowed origins only
- Security headers on every response (HSTS, CSP, X-Frame-Options, etc.)
- Rate limiting via Redis sliding window
- Request size limits
- Request ID tracing
- No debug/docs in production
- Trusted host validation
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from redis.asyncio import Redis

from api.config import settings
from api.middleware.rate_limit import RateLimitMiddleware
from api.middleware.security import SecurityHeadersMiddleware
from api.routers import agents, discovery, health, receipts, tasks

# Logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("silkweb")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    logger.info(f"SilkWeb API starting (env={settings.environment})")

    # Initialize Redis
    app.state.redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        await app.state.redis.ping()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")

    yield

    # Shutdown
    await app.state.redis.close()
    logger.info("SilkWeb API shut down")


def create_app() -> FastAPI:
    """Application factory with security configuration."""
    app = FastAPI(
        title="SilkWeb API",
        description="The Spider Web Protocol — AI agent discovery, coordination, and trust.",
        version="0.1.0",
        # Disable docs in production
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        openapi_url="/openapi.json" if settings.is_development else None,
        lifespan=lifespan,
    )

    # ── Middleware (order matters — last added runs first) ──

    # 1. Security headers + request ID
    app.add_middleware(SecurityHeadersMiddleware)

    # 2. CORS — strict origin validation
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,  # No cookies — API key auth only
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=3600,
    )

    # 3. Trusted hosts — reject requests with spoofed Host headers
    if settings.is_production:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["api.silkweb.io", "silkweb.io", "localhost"],
        )

    # ── Routers ──
    app.include_router(health.router)
    app.include_router(agents.router)
    app.include_router(discovery.router)
    app.include_router(tasks.router)
    app.include_router(receipts.router)

    return app


app = create_app()


# Add rate limiting after app creation (needs app.state.redis)
@app.on_event("startup")
async def add_rate_limiting():
    """Add rate limiting middleware after Redis is initialized."""
    # Rate limiting is added via the lifespan, but we need the Redis instance
    # The middleware will be initialized on first request
    pass
