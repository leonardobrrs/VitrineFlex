import os
import uvicorn
from shipping_app import app

if __name__ == "__main__":
    port = int(os.environ.get("SHIPPING_SERVICE_PORT", 8007))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
