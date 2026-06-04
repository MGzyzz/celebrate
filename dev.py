#!/usr/bin/env python3
"""
dev.py — one command to start ngrok, update .env files, and register webhook.

Usage:
    python dev.py           # start ngrok + update .env + set webhook
    python dev.py --env     # only update .env (ngrok already running)
    python dev.py --info    # show current ngrok tunnels
"""

import json
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
BACKEND_ENV = ROOT / "backend" / ".env"
FRONTEND_ENV = ROOT / "frontend" / ".env"
NGROK_API = "http://localhost:4040/api/tunnels"

# Which tunnel name maps to which service
FRONTEND_TUNNEL = "frontend"
BACKEND_TUNNEL = "backend1"


# ── ngrok ─────────────────────────────────────────────────────────────────────

def ngrok_running():
    try:
        urllib.request.urlopen(NGROK_API, timeout=2)
        return True
    except Exception:
        return False


def start_ngrok():
    kwargs = {}
    if sys.platform == "win32":
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
    subprocess.Popen(
        ["ngrok", "start", "--all"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        **kwargs,
    )


def wait_for_tunnels(retries=25, delay=1.0):
    for i in range(retries):
        try:
            with urllib.request.urlopen(NGROK_API, timeout=3) as resp:
                data = json.loads(resp.read())
                tunnels = data.get("tunnels", [])
                if len(tunnels) >= 2:
                    return tunnels
        except Exception:
            pass
        print(f"  waiting for ngrok... ({i + 1}/{retries})", end="\r")
        time.sleep(delay)
    print()
    raise SystemExit("ngrok API not available after waiting. Is ngrok installed?")


def find_tunnel(tunnels, name):
    for t in tunnels:
        if t.get("name") == name:
            return t
    return None


def host_from_url(url):
    return url.replace("https://", "").replace("http://", "").rstrip("/")


# ── .env editing ──────────────────────────────────────────────────────────────

def set_env_key(path, key, value):
    """Update key=value in .env, add if missing."""
    content = path.read_text(encoding="utf-8")
    pattern = rf"^{re.escape(key)}=.*$"
    new_line = f"{key}={value}"
    if re.search(pattern, content, re.MULTILINE):
        content = re.sub(pattern, new_line, content, flags=re.MULTILINE)
    else:
        content = content.rstrip("\n") + f"\n{new_line}\n"
    path.write_text(content, encoding="utf-8")


def update_allowed_hosts(path, ngrok_host):
    """Replace any *.ngrok* entry in ALLOWED_HOSTS, keep the rest."""
    content = path.read_text(encoding="utf-8")
    pattern = r"^(ALLOWED_HOSTS=)(.*)$"
    m = re.search(pattern, content, re.MULTILINE)
    if m:
        hosts = [h for h in m.group(2).split(",") if h and "ngrok" not in h]
        hosts.append(ngrok_host)
        content = re.sub(pattern, f"ALLOWED_HOSTS={','.join(hosts)}", content, flags=re.MULTILINE)
    else:
        content = content.rstrip("\n") + f"\nALLOWED_HOSTS=127.0.0.1,localhost,{ngrok_host}\n"
    path.write_text(content, encoding="utf-8")


# ── webhook ───────────────────────────────────────────────────────────────────

def set_webhook(backend_url):
    webhook_url = backend_url.rstrip("/") + "/api/bot/webhook/"
    result = subprocess.run(
        ["poetry", "run", "python", "manage.py", "set_webhook", webhook_url],
        cwd=ROOT / "backend",
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        print(f"  webhook: {result.stdout.strip() or 'OK'}")
    else:
        print(f"  webhook error: {result.stderr.strip()}")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]

    if "--info" in args:
        tunnels = wait_for_tunnels(retries=1, delay=0)
        for t in tunnels:
            print(f"  {t['name']:12} {t['public_url']}")
        return

    only_env = "--env" in args

    if not only_env:
        if ngrok_running():
            print("ngrok already running, skipping start")
        else:
            print("starting ngrok...")
            start_ngrok()

    print("waiting for tunnels...")
    tunnels = wait_for_tunnels()
    print()

    fe = find_tunnel(tunnels, FRONTEND_TUNNEL)
    be = find_tunnel(tunnels, BACKEND_TUNNEL)

    if not fe:
        raise SystemExit(f"Tunnel '{FRONTEND_TUNNEL}' not found. Check ngrok.yml tunnel names.")
    if not be:
        raise SystemExit(f"Tunnel '{BACKEND_TUNNEL}' not found. Check ngrok.yml tunnel names.")

    fe_url = fe["public_url"]
    be_url = be["public_url"]
    fe_host = host_from_url(fe_url)
    be_host = host_from_url(be_url)

    print(f"  frontend  {fe_url}")
    print(f"  backend   {be_url}")
    print()

    print("updating .env files...")
    update_allowed_hosts(BACKEND_ENV, be_host)
    set_env_key(BACKEND_ENV, "MINI_APP_URL", fe_url)
    set_env_key(FRONTEND_ENV, "VITE_ALLOWED_HOSTS", fe_host)
    print("  backend/.env  — ALLOWED_HOSTS, MINI_APP_URL updated")
    print("  frontend/.env — VITE_ALLOWED_HOSTS updated")
    print()

    print("registering webhook...")
    set_webhook(be_url)
    print()
    print("done! restart backend to apply new .env values.")


if __name__ == "__main__":
    main()
