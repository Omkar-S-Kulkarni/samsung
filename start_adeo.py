import subprocess
import time
import sys
import os

def start_adeo():
    print("🚀 Starting ADEO Health Intelligence Platform...")
    
    # 1. Start FastAPI Backend
    print("📦 Booting Backend (Uvicorn)...")
    backend_process = subprocess.Popen(
        ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd="backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    # Wait for backend to be ready
    time.sleep(3)
    if backend_process.poll() is not None:
        print("❌ Failed to start Backend. Check logs.")
        return

    print("✅ Backend running on http://localhost:8000")

    # 2. Start React Frontend
    print("⚛️ Starting Frontend (Vite)...")
    try:
        # Using shell=True for npm on Windows
        subprocess.run(["npm", "run", "dev"], shell=True)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down ADEO...")
    finally:
        backend_process.terminate()
        print("👋 Goodbye!")

if __name__ == "__main__":
    start_adeo()
