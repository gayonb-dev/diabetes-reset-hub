"""Restore a synthetic Batch 2 session inside a Playwright context."""
import json, os

PROJECT = "wqennhjdojjqmmqzjhti"
STORAGE_KEY = f"sb-{PROJECT}-auth-token"
BASE = os.environ.get("B2_BASE", "http://localhost:4173")
PRINCIPALS = json.load(open("/tmp/b2/principals.json"))["principals"]


async def signed_in(ctx, who):
    p = PRINCIPALS[who]
    page = await ctx.new_page()
    await page.goto(BASE + "/", wait_until="domcontentloaded")
    sess = {
        "access_token": p["access_token"],
        "refresh_token": p.get("refresh_token", ""),
        "token_type": "bearer",
        "expires_in": 3600,
        "expires_at": p.get("expires_at", 9999999999),
        "user": {"id": p["id"], "email": p["email"]},
    }
    await page.evaluate(
        "([k, v]) => localStorage.setItem(k, v)", [STORAGE_KEY, json.dumps(sess)]
    )
    return page
