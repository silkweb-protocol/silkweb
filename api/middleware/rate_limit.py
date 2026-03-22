"""Redis-based rate limiting middleware.

Uses sliding window counters per API key per endpoint category.
Fails closed — if Redis is down, requests are denied (safe default).
"""

import time

from redis.asyncio import Redis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from api.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting per API key using Redis sliding window."""

    def __init__(self, app, redis: Redis):
        super().__init__(app)
        self.redis = redis

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ("/health", "/docs", "/openapi.json"):
            return await call_next(request)

        # Extract API key from Authorization header
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            # No auth header — let the auth dependency handle rejection
            return await call_next(request)

        api_key = auth_header[7:]  # Strip "Bearer "

        # Determine rate limit category
        path = request.url.path
        if "/discover" in path:
            limit = settings.rate_limit_discovery
            category = "discover"
        elif "/tasks" in path:
            limit = settings.rate_limit_tasks
            category = "tasks"
        elif "/agents" in path and request.method == "POST":
            limit = settings.rate_limit_registration
            category = "register"
        else:
            limit = 1000  # generous default
            category = "general"

        # Sliding window counter (1 hour window)
        # Key includes first 16 chars of API key (enough for uniqueness, not the full key)
        key_prefix = api_key[:24] if len(api_key) > 24 else api_key
        redis_key = f"ratelimit:{category}:{key_prefix}"
        window = 3600  # 1 hour

        try:
            now = time.time()
            pipe = self.redis.pipeline()

            # Remove expired entries
            pipe.zremrangebyscore(redis_key, 0, now - window)
            # Add current request
            pipe.zadd(redis_key, {str(now): now})
            # Count requests in window
            pipe.zcard(redis_key)
            # Set TTL on key
            pipe.expire(redis_key, window)

            results = await pipe.execute()
            request_count = results[2]

            if request_count > limit:
                retry_after = int(window - (now - float(await self.redis.zrange(redis_key, 0, 0))[0]))
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "rate_limited",
                        "message": f"Rate limit exceeded. {limit} requests per hour for {category}.",
                        "retry_after_seconds": max(retry_after, 1),
                    },
                    headers={
                        "Retry-After": str(max(retry_after, 1)),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                    },
                )

            # Add rate limit headers to response
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(max(0, limit - request_count))
            return response

        except Exception:
            # Fail closed — if Redis is down, deny the request
            # This prevents abuse when the rate limiter is unavailable
            if settings.is_production:
                return JSONResponse(
                    status_code=503,
                    content={"error": "service_unavailable", "message": "Rate limiter unavailable."},
                )
            # In development, let it through
            return await call_next(request)
