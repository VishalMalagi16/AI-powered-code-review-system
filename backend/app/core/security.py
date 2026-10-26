import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
import jwt
from app.core.config import settings

# Cryptographically secure password hashing using PBKDF2-HMAC-SHA256
# Standard, portable, zero external native binary dependencies, OWASP compliant
HASH_ITERATIONS = 120_000
SALT_SIZE = 32

def hash_password(password: str) -> str:
    """Hash a plaintext password with a unique cryptographic salt."""
    salt = secrets.token_bytes(SALT_SIZE)
    hash_bytes = hashlib.pbkdf2_hmac(
        hash_name="sha256",
        password=password.encode("utf-8"),
        salt=salt,
        iterations=HASH_ITERATIONS,
    )
    # Format: alg$iterations$salt_hex$hash_hex
    return f"pbkdf2_sha256${HASH_ITERATIONS}${salt.hex()}${hash_bytes.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify that a plaintext password matches the stored hash."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_hash = bytes.fromhex(parts[3])
        
        computed_hash = hashlib.pbkdf2_hmac(
            hash_name="sha256",
            password=plain_password.encode("utf-8"),
            salt=salt,
            iterations=iterations,
        )
        return secrets.compare_digest(computed_hash, expected_hash)
    except Exception:
        return False

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "iss": settings.PROJECT_NAME,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            issuer=settings.PROJECT_NAME,
        )
        return payload
    except jwt.PyJWTError:
        return None
