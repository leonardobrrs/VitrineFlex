#!/usr/bin/env python3
"""
Cria (ou promove) explicitamente uma conta LPS_ADMIN diretamente no banco do Auth Service.

O cadastro público NUNCA cria administradores; este script é o caminho de bootstrap, executado
manualmente por quem opera o ambiente. A senha é lida de forma interativa (ou de --password)
e armazenada com Argon2id; nunca é impressa.

Uso:
  .venv\\Scripts\\python.exe scripts/create_admin.py --email admin@exemplo.com --name "Admin"
"""
import argparse
import getpass
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "packages" / "python-common"))
sys.path.insert(0, str(BASE_DIR / "services" / "auth-service" / "src"))
os.environ.setdefault("AUTH_DB_NAME", "auth.db")

from python_common.security import hash_password  # noqa: E402
from auth_database import init_db, SessionFactory  # noqa: E402
from auth_models import User, UserPreference  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--email", required=True)
    ap.add_argument("--name", default="Administrador")
    ap.add_argument("--password", help="Se omitida, será solicitada de forma interativa")
    args = ap.parse_args()

    password = args.password or getpass.getpass("Senha do administrador (mín. 8 caracteres): ")
    if len(password) < 8:
        print("Senha muito curta (mínimo 8 caracteres).")
        return 1

    init_db()
    email = args.email.strip().lower()
    with SessionFactory() as db:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.role = "LPS_ADMIN"
            user.is_active = True
            user.deleted_at = None
            user.password_hash = hash_password(password)
            action = "promovido/atualizado"
        else:
            user = User(email=email, name=args.name, role="LPS_ADMIN", is_active=True,
                        password_hash=hash_password(password))
            db.add(user)
            db.flush()
            db.add(UserPreference(user_id=user.id, categories="[]"))
            action = "criado"
        db.commit()
    print(f"Administrador {action}: {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
