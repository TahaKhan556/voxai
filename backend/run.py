import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(__file__))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8300)
    args = parser.parse_args()
    uvicorn.run(app, host="0.0.0.0", port=args.port)
