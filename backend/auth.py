from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import os
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer(auto_error=False)
CLERK_PEM_URL = f"https://api.clerk.dev/v1/jwks"

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict | None:
    """
    Returns user dict if valid JWT, None if no token (guest).
    Raises 401 if token is invalid.
    """
    if not credentials:
        return None

    token = credentials.credentials

    try:
        # Fetch Clerk public keys
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.clerk.com/v1/jwks",
                headers={"Authorization": f"Bearer {os.getenv('CLERK_SECRET_KEY')}"}
            )
            jwks = resp.json()

        # Decode and verify
        header = jwt.get_unverified_header(token)
        key = next((k for k in jwks["keys"] if k["kid"] == header["kid"]), None)

        if not key:
            raise HTTPException(status_code=401, detail="Invalid token")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )

        return {
            "userId": payload.get("sub"),
            "email": payload.get("email", ""),
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")