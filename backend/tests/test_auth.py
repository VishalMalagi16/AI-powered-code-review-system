import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

def test_password_hashing():
    raw = "MySuperSecret123!"
    hashed = hash_password(raw)
    assert hashed.startswith("pbkdf2_sha256$")
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_flow():
    user_id = "user-12345-uuid"
    token = create_access_token(user_id)
    assert isinstance(token, str)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == user_id
