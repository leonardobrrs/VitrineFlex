import os
import uvicorn
from catalog_app import app

if __name__ == "__main__":
    port = int(os.environ.get("CATALOG_SERVICE_PORT", 8003))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
