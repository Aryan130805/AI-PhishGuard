import sys
import os
import urllib.request
import json

# Read anon key from frontend/.env or backend/.env
env_paths = [
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
]

anon_key = ""
for env_path in env_paths:
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("VITE_SUPABASE_ANON_KEY=") or line.startswith("SUPABASE_ANON_KEY="):
                    key = line.split("=", 1)[1].strip()
                    if key:
                        anon_key = key
                        break

url = "https://ezjmrpdqgiicfprkgadi.supabase.co/rest/v1/"
req = urllib.request.Request(url)

print(f"1. Checking Supabase URL: https://ezjmrpdqgiicfprkgadi.supabase.co")
if anon_key:
    print(f"2. Found Anon Key in .env: {anon_key[:10]}...{anon_key[-5:]}")
    req.add_header("apikey", anon_key)
    req.add_header("Authorization", f"Bearer {anon_key}")
else:
    print("2. No Anon Key found yet in .env file on disk.")

try:
    with urllib.request.urlopen(req) as response:
        print(f"3. HTTP Status: {response.status} OK")
        data = response.read().decode('utf-8')
        print("4. Supabase OpenAPI REST endpoints available!")
        print("[SUCCESS] Supabase project ezjmrpdqgiicfprkgadi is LIVE & REACHABLE!")
except urllib.error.HTTPError as e:
    print(f"3. HTTP Error: {e.code} - {e.reason}")
    if e.code == 401:
        print("[UNAUTHORIZED] Please make sure to SAVE the file containing your VITE_SUPABASE_ANON_KEY (Ctrl+S / Cmd+S).")
except Exception as e:
    print(f"[ERROR] Connection error: {e}")
