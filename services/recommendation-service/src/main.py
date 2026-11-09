import os
import uvicorn
from recommendation_app import app

if __name__ == "__main__":
    port = int(os.environ.get("RECOMMENDATION_SERVICE_PORT", 8008))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
