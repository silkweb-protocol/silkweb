"""Authentication service — API key generation, hashing, JWT tokens.

Security measures:
- API keys are 256-bit random (64 hex chars) with sw_live_ prefix
- Keys are Argon2id-hashed before storage (never plaintext)
- JWT tokens have short expiry and are signed with HS256
- Constant-time comparison to prevent timing attacks
"""

import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from api.config import settings

# Argon2id — memory-hard, resistant to GPU/ASIC attacks
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,  # 64MB
    argon2__time_cost=3,
    argon2__parallelism=4,
)


def generate_api_key() -> str:
    """Generate a cryptographically secure API key.

    Format: sw_live_<64 hex chars> (256-bit entropy)
    """
    random_bytes = secrets.token_hex(32)  # 256 bits
    return f"{settings.api_key_prefix}{random_bytes}"


def hash_api_key(api_key: str) -> str:
    """Hash an API key with Argon2id. Never store keys in plaintext."""
    return pwd_context.hash(api_key)


def verify_api_key(plain_key: str, hashed_key: str) -> bool:
    """Verify an API key against its hash. Constant-time comparison."""
    return pwd_context.verify(plain_key, hashed_key)


def create_jwt_token(silk_id: str, extra_claims: dict | None = None) -> str:
    """Create a short-lived JWT token for a registered agent."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": silk_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expiry_minutes),
        "iss": "silkweb",
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_jwt_token(token: str) -> dict | None:
    """Decode and validate a JWT token. Returns None if invalid/expired."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={
                "require_exp": True,
                "require_iat": True,
                "require_sub": True,
            },
        )
        return payload
    except JWTError:
        return None


def generate_silk_id() -> str:
    """Generate a unique Silk ID for agent registration.

    Format: sw_<uuid-like hex> — 36 chars total
    """
    return f"sw_{secrets.token_hex(18)}"
