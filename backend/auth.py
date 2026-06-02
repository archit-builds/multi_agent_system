from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import os
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer(auto_error=False)

# Clerk's JWKS endpoint — public keys, no auth header needed
CLERK_JWKS_URL = "https://api.clerk.com/v1/jwks"


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
        # Fetch Clerk's public JWKS (no auth header required for the public JWKS endpoint)
        async with httpx.AsyncClient() as client:
            resp = await client.get(CLERK_JWKS_URL)
            resp.raise_for_status()
            jwks = resp.json()

        # Match the key by kid
        header = jwt.get_unverified_header(token)
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
            options={"verify_aud": False},
        )

        # Clerk puts the primary email in `email` (when the email session claim
        # is enabled in the Clerk dashboard) or inside `email_addresses`.
        # We try the flat field first, then fall back gracefully.
        email: str = payload.get("email") or ""
        if not email:
            email_addresses = payload.get("email_addresses", [])
            if email_addresses and isinstance(email_addresses, list):
                first = email_addresses[0]
                if isinstance(first, dict):
                    email = first.get("email_address", "")
                else:
                    email = str(first)

        return {
            "userId": payload.get("sub"),
            "email": email,
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")