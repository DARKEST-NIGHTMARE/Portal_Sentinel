import os
from dotenv import load_dotenv
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, ".env")

print(f"🔍 Looking for .env at: {env_path}")
if os.path.exists(env_path):
    print("FILE FOUND!")
    
    with open(env_path, "r") as f:
        content = f.read()
        if not content.strip():
            print("ERROR: File is empty!")
        else:
            print("File Start:", content[:50].replace("\n", " ") + "...")
else:
    print("FILE NOT FOUND. Please check the file name.")
    print("   (Common mistake: naming it '.env.txt' or just 'env')")

load_dotenv(env_path)
print(f"💡 TEST: DATABASE_URL = {os.getenv('DATABASE_URL')}")