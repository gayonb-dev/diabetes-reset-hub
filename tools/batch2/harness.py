"""Batch 2 closeout helper: calls the temporary synthetic-fixture harness.

The harness secret is read from the sandbox environment and is never printed.
"""
import json as _json
import os
import urllib.request

PROJECT = "wqennhjdojjqmmqzjhti"
FUNCTIONS = f"https://{PROJECT}.supabase.co/functions/v1"
ANON = os.environ.get(
    "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
) or os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")
SECRET = os.environ.get("BATCH2_HARNESS_SECRET_V2") or os.environ["BATCH2_HARNESS_SECRET"]


def call(action, **kw):
    body = _json.dumps({"action": action, **kw}).encode()
    req = urllib.request.Request(
        f"{FUNCTIONS}/batch2-harness",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ANON}",
            "x-harness-secret": SECRET,
            "apikey": ANON,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return _json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"http_error": e.code, "body": e.read().decode()[:600]}


if __name__ == "__main__":
    import sys
    print(_json.dumps(call(sys.argv[1] if len(sys.argv) > 1 else "ping"), indent=1)[:2000])
