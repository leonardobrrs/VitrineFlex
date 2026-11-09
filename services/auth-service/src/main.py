import os
import uvicorn
from auth_app import app

if __name__ == "__main__":
    port = int(os.environ.get("AUTH_SERVICE_PORT", 8001))
    uvicorn.run("auth_app:app", host="0.0.0.0", port=port, reload=False)
