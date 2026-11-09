import os
import pytest
from sqlalchemy import text
from python_common.database import DatabaseEngineFactory
from python_common.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    validate_internal_token,
    get_internal_service_key,
)
from python_common.errors import AppError


def test_sqlite_wal_pragmas(tmp_path):
    db_file = tmp_path / "test_wal.db"
    engine = DatabaseEngineFactory.create_sqlite_engine(db_file)
    with engine.connect() as conn:
        journal_mode = conn.execute(text("PRAGMA journal_mode;")).scalar()
        busy_timeout = conn.execute(text("PRAGMA busy_timeout;")).scalar()

    assert journal_mode.lower() == "wal"
    assert busy_timeout == 5000
    engine.dispose()


def test_argon2id_password_hashing():
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)
    hashed2 = hash_password(password)

    assert hashed != password
    assert hashed.startswith("$argon2id$")
    assert hashed != hashed2, "Argon2id deve gerar salts aleatórios e individuais por senha"
    assert verify_password(password, hashed) is True
    assert verify_password(password, hashed2) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_lifecycle():
    user_id = "user-1234-uuid"
    email = "leonardo@ufal.br"
    role = "STORE_ADMIN"

    token = create_access_token(user_id=user_id, email=email, role=role, expires_in_seconds=3600)
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload["user_id"] == user_id
    assert payload["email"] == email
    assert payload["role"] == role


def test_jwt_token_invalid():
    with pytest.raises(AppError) as exc_info:
        decode_access_token("invalid.token.signature")
    assert exc_info.value.status_code == 401
    assert exc_info.value.code == "INVALID_TOKEN"


def test_validate_internal_token():
    valid_key = get_internal_service_key()

    # Valid token passes without exception
    validate_internal_token(valid_key)

    # Missing token raises 403
    with pytest.raises(AppError) as exc_missing:
        validate_internal_token(None)
    assert exc_missing.value.status_code == 403
    assert exc_missing.value.code == "INVALID_INTERNAL_TOKEN"

    # Forged/wrong token raises 403
    with pytest.raises(AppError) as exc_wrong:
        validate_internal_token("forged-client-secret")
    assert exc_wrong.value.status_code == 403
    assert exc_wrong.value.code == "INVALID_INTERNAL_TOKEN"
