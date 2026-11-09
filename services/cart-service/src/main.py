import os
import uvicorn
from cart_app import app

if __name__ == "__main__":
    port = int(os.environ.get("CART_SERVICE_PORT", 8004))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
