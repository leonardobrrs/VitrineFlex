import os
import uvicorn
from payments_app import app

if __name__ == "__main__":
    port = int(os.environ.get("PAYMENTS_SERVICE_PORT", 8006))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
