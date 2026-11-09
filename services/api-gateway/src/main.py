import os
import uvicorn
from gateway_app import app

if __name__ == "__main__":
    port = int(os.environ.get("API_GATEWAY_PORT", 8000))
    uvicorn.run("gateway_app:app", host="0.0.0.0", port=port, reload=False)
