import os
import sys
import time
import subprocess
import signal

SERVICES = [
    {"name": "API Gateway", "dir": "services/api-gateway", "app": "gateway_app:app", "port": 8000},
    {"name": "Auth Service", "dir": "services/auth-service", "app": "auth_app:app", "port": 8001},
    {"name": "LPS Config Service", "dir": "services/lps-config-service", "app": "lps_app:app", "port": 8002},
    {"name": "Catalog Service", "dir": "services/catalog-service", "app": "catalog_app:app", "port": 8003},
    {"name": "Cart Service", "dir": "services/cart-service", "app": "cart_app:app", "port": 8004},
    {"name": "Orders Service", "dir": "services/orders-service", "app": "orders_app:app", "port": 8005},
    {"name": "Payments Service", "dir": "services/payments-service", "app": "payments_app:app", "port": 8006},
    {"name": "Shipping Service", "dir": "services/shipping-service", "app": "shipping_app:app", "port": 8007},
    {"name": "Recommendation Service", "dir": "services/recommendation-service", "app": "recommendation_app:app", "port": 8008},
]

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PYTHON_EXE = os.path.join(ROOT_DIR, ".venv", "Scripts", "python.exe")
if not os.path.exists(PYTHON_EXE):
    PYTHON_EXE = sys.executable

SHARED_SRC = os.path.join(ROOT_DIR, "packages", "shared", "src")

processes = []

def stop_all(sig=None, frame=None):
    print("\nEncerrando todos os microsserviços do VitrineFlex...")
    for proc, name in processes:
        try:
            proc.terminate()
        except Exception:
            pass
    time.sleep(1)
    for proc, name in processes:
        try:
            proc.kill()
        except Exception:
            pass
    print("Todos os serviços foram finalizados.")
    sys.exit(0)

signal.signal(signal.SIGINT, stop_all)
signal.signal(signal.SIGTERM, stop_all)

def main():
    print("==================================================")
    print(" INICIALIZANDO ECOSSISTEMA VITRINEFLEX (9 SERVIÇOS)")
    print("==================================================")

    for svc in SERVICES:
        svc_src = os.path.join(ROOT_DIR, svc["dir"], "src")
        env = os.environ.copy()
        env["PYTHONPATH"] = f"{svc_src}{os.pathsep}{SHARED_SRC}"
        env["PORT"] = str(svc["port"])
        
        cmd = [
            PYTHON_EXE,
            "-m", "uvicorn",
            svc["app"],
            "--host", "0.0.0.0",
            "--port", str(svc["port"]),
            "--app-dir", svc_src,
            "--no-access-log",
        ]

        print(f"-> Iniciando {svc['name']:<25} na porta {svc['port']}...")
        p = subprocess.Popen(
            cmd,
            env=env,
            cwd=ROOT_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        processes.append((p, svc["name"]))

    print("\n✓ Todos os 9 microsserviços foram disparados em background.")
    print("Pressione Ctrl+C para encerrar.\n")

    try:
        while True:
            for p, name in processes:
                if p.poll() is not None:
                    print(f"AVISO: O serviço {name} encerrou com código {p.returncode}")
            time.sleep(2)
    except KeyboardInterrupt:
        stop_all()

if __name__ == "__main__":
    main()
