import os
import uvicorn
from lps_app import app

if __name__ == "__main__":
    port = int(os.environ.get("LPS_CONFIG_SERVICE_PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
