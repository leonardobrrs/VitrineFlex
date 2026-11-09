import os
import uvicorn
from orders_app import app

if __name__ == "__main__":
    port = int(os.environ.get("ORDERS_SERVICE_PORT", 8005))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
