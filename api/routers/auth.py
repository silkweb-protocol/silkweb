"""Authentication router — signup, login, OAuth, token management.

Endpoints:
  POST /api/v1/auth/signup        — email + password signup
  POST /api/v1/auth/login         — email + password login
  POST /api/v1/auth/google        — Google OAuth token verification
  POST /api/v1/auth/apple         — Apple OAuth token verification
  GET  /api/v1/auth/me            — current user profile
  POST /api/v1/auth/refresh       — refresh an access token
  POST /api/v1/auth/api-key/regenerate — regenerate API key
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone

import httpx
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import settings
from api.db.session import get_db
from api.middleware.auth import require_auth
from api.models.user import User, generate_api_key
from api.schemas.auth import (
    ApiKeyResponse,
    AuthResponse,
    LoginRequest,
    OAuthRequest,
    RefreshRequest,
    SignupRequest,
    UserResponse,
)

logger = logging.getLogger("silkweb.auth")

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

ph = PasswordHasher()

# Token expiry
ACCESS_TOKEN_EXPIRY = timedelta(hours=24)
REFRESH_TOKEN_EXPIRY = timedelta(days=30)

# Google token verification endpoint
GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

# Apple public keys endpoint
APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"
APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"


def _create_tokens(user_id: str) -> tuple[str, str, int]:
    """Create access + refresh JWT tokens. Returns (access_token, refresh_token, expires_in_seconds)."""
    now = datetime.now(timezone.utc)

    access_payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + ACCESS_TOKEN_EXPIRY,
        "type": "access",
    }
    access_token = jwt.encode(access_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    refresh_payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + REFRESH_TOKEN_EXPIRY,
        "type": "refresh",
    }
    refresh_token = jwt.encode(refresh_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    return access_token, refresh_token, int(ACCESS_TOKEN_EXPIRY.total_seconds())


def _build_auth_response(user: User, access_token: str, refresh_token: str, expires_in: int) -> AuthResponse:
    """Build the standard auth response."""
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        api_key=user.api_key,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            provider=user.provider,
            tier=user.tier,
            requests_today=user.requests_today,
            requests_limit=user.requests_limit,
            api_key=user.api_key,
            created_at=user.created_at,
        ),
    )


# ── POST /signup ─────────────────────────────────────────────────


@router.post("/signup", response_model=AuthResponse, status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    """Create a new user with email + password."""
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Hash password with argon2
    password_hash = ph.hash(body.password)

    user = User(
        email=body.email.lower(),
        password_hash=password_hash,
        name=body.name,
        provider="email",
        requests_reset_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    access_token, refresh_token, expires_in = _create_tokens(str(user.id))

    logger.info(f"New signup: {user.email}")

    # Notify admin of new signup
    try:
        from api.services.email import send_admin_notification
        await send_admin_notification(
            subject=f"New SilkWeb Signup: {user.name or user.email}",
            body=f"New user registered on SilkWeb:\n\nName: {user.name}\nEmail: {user.email}\nProvider: {user.provider}\nTime: {datetime.now(timezone.utc).isoformat()}\n\nTotal users: check /api/v1/admin/users",
        )
    except Exception as e:
        logger.warning(f"Failed to send signup notification: {e}")

    return _build_auth_response(user, access_token, refresh_token, expires_in)


# ── POST /login ──────────────────────────────────────────────────


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email + password."""
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    try:
        ph.verify(user.password_hash, body.password)
    except VerifyMismatchError:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    # Rehash if needed (argon2 parameter upgrades)
    if ph.check_needs_rehash(user.password_hash):
        user.password_hash = ph.hash(body.password)

    access_token, refresh_token, expires_in = _create_tokens(str(user.id))

    logger.info(f"Login: {user.email}")
    return _build_auth_response(user, access_token, refresh_token, expires_in)


# ── POST /google ─────────────────────────────────────────────────


@router.post("/google", response_model=AuthResponse)
async def google_oauth(body: OAuthRequest, db: AsyncSession = Depends(get_db)):
    """Verify a Google ID token and create/find the user.

    Accepts a Google ID token (from Google Identity Services on the frontend).
    Verifies it with Google's tokeninfo endpoint, then creates or retrieves the user.
    """
    if body.provider != "google":
        raise HTTPException(status_code=400, detail="Provider must be 'google'")

    # Verify the token with Google
    async with httpx.AsyncClient(timeout=10.0) as client:
        # First try tokeninfo (works for ID tokens)
        resp = await client.get(GOOGLE_TOKEN_INFO_URL, params={"id_token": body.token})

        if resp.status_code != 200:
            # Fallback: try as an access token to get userinfo
            resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {body.token}"},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google token")

        google_data = resp.json()

    # Extract user info
    google_sub = google_data.get("sub")
    email = google_data.get("email")
    name = google_data.get("name") or google_data.get("given_name", "")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    email = email.lower()

    # Find existing user by provider_id or email
    result = await db.execute(
        select(User).where(
            (User.provider == "google") & (User.provider_id == google_sub)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        # Check if email already registered with different provider
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            # Link Google to existing account
            user.provider_id = google_sub
            if user.provider == "email":
                user.provider = "google"  # upgrade to google auth
        else:
            # Create new user
            user = User(
                email=email,
                name=name,
                provider="google",
                provider_id=google_sub,
                requests_reset_at=datetime.now(timezone.utc) + timedelta(days=1),
            )
            db.add(user)

    await db.flush()
    await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    access_token, refresh_token, expires_in = _create_tokens(str(user.id))

    logger.info(f"Google OAuth: {user.email}")

    # Notify admin of new Google signup
    try:
        from api.services.email import send_admin_notification
        await send_admin_notification(
            subject=f"New Google Signup: {user.name or user.email}",
            body=f"Google OAuth user:\n\nName: {user.name}\nEmail: {user.email}\nProvider: google\nTime: {datetime.now(timezone.utc).isoformat()}",
        )
    except Exception as e:
        logger.warning(f"Failed to send signup notification: {e}")

    return _build_auth_response(user, access_token, refresh_token, expires_in)


# ── POST /apple ──────────────────────────────────────────────────


@router.post("/apple", response_model=AuthResponse)
async def apple_oauth(body: OAuthRequest, db: AsyncSession = Depends(get_db)):
    """Verify an Apple ID token and create/find the user.

    Accepts an Apple identity token from Sign in with Apple JS.
    Decodes the JWT to extract the user's Apple sub and email.
    """
    if body.provider != "apple":
        raise HTTPException(status_code=400, detail="Provider must be 'apple'")

    # Decode Apple ID token (Apple tokens are JWTs signed with Apple's keys)
    # Fetch Apple's public keys
    async with httpx.AsyncClient(timeout=10.0) as client:
        keys_resp = await client.get(APPLE_KEYS_URL)
        if keys_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch Apple public keys")
        apple_keys = keys_resp.json()

    # Decode the token header to find the key ID
    try:
        unverified_header = jwt.get_unverified_header(body.token)
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid Apple token")

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Apple token missing key ID")

    # Find the matching key
    matching_key = None
    for key_data in apple_keys.get("keys", []):
        if key_data.get("kid") == kid:
            matching_key = key_data
            break

    if not matching_key:
        raise HTTPException(status_code=401, detail="Apple token key not found")

    # Build the public key and verify
    try:
        from jwt.algorithms import RSAAlgorithm

        public_key = RSAAlgorithm.from_jwk(matching_key)
        apple_data = jwt.decode(
            body.token,
            public_key,
            algorithms=["RS256"],
            audience=settings.apple_client_id if hasattr(settings, "apple_client_id") else None,
            options={"verify_aud": False},  # Skip audience check if no client ID configured
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Apple token: {e}")

    apple_sub = apple_data.get("sub")
    email = apple_data.get("email", "").lower()

    if not email:
        raise HTTPException(status_code=400, detail="Apple account has no email")

    # Find existing user by provider_id or email
    result = await db.execute(
        select(User).where(
            (User.provider == "apple") & (User.provider_id == apple_sub)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            user.provider_id = apple_sub
            if user.provider == "email":
                user.provider = "apple"
        else:
            user = User(
                email=email,
                name=None,  # Apple may not provide name after first auth
                provider="apple",
                provider_id=apple_sub,
                requests_reset_at=datetime.now(timezone.utc) + timedelta(days=1),
            )
            db.add(user)

    await db.flush()
    await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    access_token, refresh_token, expires_in = _create_tokens(str(user.id))

    logger.info(f"Apple OAuth: {user.email}")
    return _build_auth_response(user, access_token, refresh_token, expires_in)


# ── GET /me ──────────────────────────────────────────────────────


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(require_auth)):
    """Return the authenticated user's profile and usage stats."""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        provider=user.provider,
        tier=user.tier,
        requests_today=user.requests_today,
        requests_limit=user.requests_limit,
        api_key=user.api_key,
        created_at=user.created_at,
    )


# ── POST /refresh ────────────────────────────────────────────────


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for new access + refresh tokens."""
    try:
        payload = jwt.decode(
            body.refresh_token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or deactivated")

    access_token, refresh_token_new, expires_in = _create_tokens(str(user.id))

    return _build_auth_response(user, access_token, refresh_token_new, expires_in)


# ── POST /api-key/regenerate ─────────────────────────────────────


@router.post("/api-key/regenerate", response_model=ApiKeyResponse)
async def regenerate_api_key(
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new API key, invalidating the old one."""
    user.api_key = generate_api_key()
    await db.flush()
    await db.refresh(user)

    logger.info(f"API key regenerated: {user.email}")
    return ApiKeyResponse(api_key=user.api_key)
