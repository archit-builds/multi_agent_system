from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import os
import time
from pathlib import Path
from jose import jwt, JWTError
from dotenv import load_dotenv

_ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ROOT_ENV, override=True)

# Also load frontend .env.local so NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is available
_FRONTEND_ENV = Path(__file__).resolve().parent.parent / "frontend" / ".env.local"
load_dotenv(dotenv_path=_FRONTEND_ENV, override=False)  # don't override root values

security = HTTPBearer(auto_error=False)


def _build_jwks_url() -> str:
    """
    Derive the public JWKS URL from the Clerk publishable key.

    Clerk publishable key format:  pk_<env>_<base64(frontend-api-domain$)>
    Decoding the base64 suffix gives the per-instance domain, e.g.:
        ample-molly-22.clerk.accounts.dev
    The public JWKS endpoint (no auth required) is:
        https://<domain>/.well-known/jwks.json

    Do NOT use https://api.clerk.com/v1/jwks — that's the private Backend API
    which requires a CLERK_SECRET_KEY Bearer token.
    """
    import base64

    pk = os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "").strip()
    if pk:
        try:
            # e.g. "pk_test_YW1wbGUt..." → take the part after the second "_"
            b64 = pk.split("_", 2)[-1]
            # Fix base64 padding
            b64 += "=" * (-len(b64) % 4)
            domain = base64.b64decode(b64).decode().rstrip("$").strip()
            if domain:
                url = f"https://{domain}/.well-known/jwks.json"
                print(f"[auth] JWKS URL derived from publishable key: {url}")
                return url
        except Exception as e:
            print(f"[auth] Could not derive JWKS URL from publishable key: {e}")

    # Hard fallback — update this if your Clerk instance domain changes
    fallback = "https://ample-molly-22.clerk.accounts.dev/.well-known/jwks.json"
    print(f"[auth] Using hardcoded fallback JWKS URL: {fallback}")
    return fallback


CLERK_JWKS_URL: str = _build_jwks_url()

# ── JWKS cache — avoid a network round-trip on every request ─────────────────
_jwks_cache: dict = {}
_jwks_fetched_at: float = 0.0
_JWKS_TTL: float = 3600.0        # re-fetch after 1 hour


async def _get_jwks() -> dict:
    """Return cached JWKS, re-fetching from Clerk only when the cache is stale."""
    global _jwks_cache, _jwks_fetched_at

    now = time.monotonic()
    if _jwks_cache and (now - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_cache

    # Public endpoint — no Authorization header needed
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(CLERK_JWKS_URL)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_fetched_at = now
        return _jwks_cache


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict | None:
    """
    Returns user dict if a valid Clerk JWT is supplied.
    Returns None for guests (no Authorization header).
    Raises 401 if a token is present but invalid.
    """
    if not credentials:
        return None

    token = credentials.credentials

    try:
        jwks = await _get_jwks()

        # Match the signing key by kid
        header = jwt.get_unverified_header(token)
        key = next(
            (k for k in jwks.get("keys", []) if k["kid"] == header.get("kid")),
            None,
        )

        # Key not found — maybe a key rotation happened; bust cache and retry once
        if not key:
            global _jwks_fetched_at
            _jwks_fetched_at = 0.0
            jwks = await _get_jwks()
            key = next(
                (k for k in jwks.get("keys", []) if k["kid"] == header.get("kid")),
                None,
            )

        if not key:
            raise HTTPException(status_code=401, detail="Unknown signing key")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={
                "verify_aud": False,
                # Allow up to 60s clock skew (for Windows clock drift)
                "leeway": 60,
            },
        )

        # Clerk puts email in a flat `email` claim or inside `email_addresses`
        email: str = payload.get("email") or ""
        if not email:
            email_addresses = payload.get("email_addresses", [])
            if email_addresses and isinstance(email_addresses, list):
                first = email_addresses[0]
                email = (
                    first.get("email_address", "")
                    if isinstance(first, dict)
                    else str(first)
                )

        return {
            "userId": payload.get("sub"),
            "email":  email,
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")