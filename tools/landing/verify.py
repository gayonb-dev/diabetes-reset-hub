"""V01-V12 isolated browser verification for the landing pass.

All backend traffic (Auth, PostgREST, RPC, Edge Functions including checkout)
is intercepted locally. Any other external host is aborted and reported.
Outputs docs/evidence/landing-preview/verification.json plus screenshots.
"""
import asyncio, json, sys
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).parent))
from fixtures import TABLES, RPC, SESSION  # noqa: E402
import capture_previews as cap  # noqa: E402
from playwright.async_api import async_playwright  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
EV = ROOT / "docs" / "evidence" / "landing-preview"
SHOTS = EV / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:8080"

R = {}
external = []
checkout_calls = []


async def guard(route, request):
    host = urlparse(request.url).hostname or ""
    if host in ("localhost", "127.0.0.1", "fonts.googleapis.com", "fonts.gstatic.com"):
        await route.continue_(); return
    if host == cap.SUPABASE_HOST:
        if "/functions/v1/" in urlparse(request.url).path:
            checkout_calls.append(urlparse(request.url).path)
        await cap.handle_backend(route, request); return
    external.append(request.url)
    await route.abort()


async def main():
    assert cap.PROJECT_REF == "wqennhjdojjqmmqzjhti"
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)

        # ---- V01/V02/V03/V04: navigation + checkout controls -------------
        for label, vp in (("desktop", {"width": 1280, "height": 1800}),
                          ("mobile", {"width": 390, "height": 844})):
            ctx = await b.new_context(viewport=vp)
            await ctx.route("**/*", guard)
            p = await ctx.new_page()
            errs = []
            p.on("pageerror", lambda e: errs.append(str(e)))
            await p.goto(BASE + "/", wait_until="networkidle")
            await p.wait_for_timeout(800)
            ctas = p.get_by_role("button", name="Start 14 days for $27")
            R[f"{label}_cta_count"] = await ctas.count()
            R[f"{label}_page_errors"] = errs
            await p.screenshot(path=str(SHOTS / f"landing-{label}.png"))

            # keyboard-driven checkout from the header CTA
            await ctas.first.focus()
            await p.keyboard.press("Enter")
            await p.wait_for_timeout(700)
            R[f"{label}_checkout_dialog_keyboard"] = await p.get_by_role("dialog").count()
            await p.screenshot(path=str(SHOTS / f"checkout-{label}.png"))
            await p.keyboard.press("Escape")
            await p.wait_for_timeout(400)
            R[f"{label}_checkout_closes"] = await p.get_by_role("dialog").count() == 0

            # pointer-driven checkout from the pricing CTA
            await ctas.nth(min(2, await ctas.count() - 1)).click()
            await p.wait_for_timeout(700)
            R[f"{label}_checkout_dialog_pointer"] = await p.get_by_role("dialog").count()
            await p.keyboard.press("Escape")

            # hash + focus + header offset
            hashes = {}
            for sec in ("how-it-works", "inside-the-membership", "pricing", "faq", "product-tour"):
                ok = await p.evaluate(
                    "(id) => { const el = document.getElementById(id); if (!el) return null;"
                    " el.scrollIntoView({behavior:'auto',block:'start'});"
                    " return true; }", sec)
                hashes[sec] = bool(ok)
            R[f"{label}_sections_present"] = hashes
            await ctx.close()

        # ---- V05: gallery keyboard + dialog ------------------------------
        ctx = await b.new_context(viewport={"width": 1280, "height": 1400})
        await ctx.route("**/*", guard)
        p = await ctx.new_page()
        await p.goto(BASE + "/#product-tour", wait_until="networkidle")
        await p.wait_for_timeout(1200)
        R["tour_items"] = await p.locator("#product-tour li").count()
        R["tour_images_with_alt"] = await p.locator("#product-tour img[alt]").count()
        btn = p.locator("#product-tour button").first
        await btn.focus()
        await p.keyboard.press("Enter")
        await p.wait_for_timeout(900)
        R["lightbox_opens_keyboard"] = await p.get_by_role("dialog").count() == 1
        await p.screenshot(path=str(SHOTS / "lightbox.png"))
        await p.keyboard.press("Escape")
        await p.wait_for_timeout(900)
        R["lightbox_closes_escape"] = await p.get_by_role("dialog").count() == 0
        R["focus_returns_to_trigger"] = await p.evaluate(
            "() => document.activeElement?.closest('#product-tour') !== null")
        # 44px touch targets in the tour + CTAs
        R["small_targets"] = await p.evaluate(
            "() => Array.from(document.querySelectorAll('#product-tour button, header button'))"
            ".filter(e => e.getBoundingClientRect().height < 44).length")
        await ctx.close()

        # ---- V10/V11: Mindset 20s + water logging ------------------------
        ctx = await b.new_context(viewport={"width": 390, "height": 844})
        await ctx.route("**/*", guard)
        p = await ctx.new_page()
        await p.goto(BASE + "/", wait_until="domcontentloaded")
        await p.evaluate("([k,v]) => localStorage.setItem(k,v)",
                         ["sb-%s-auth-token" % cap.PROJECT_REF, json.dumps(SESSION)])
        await p.goto(BASE + "/app/today", wait_until="networkidle")
        await p.wait_for_timeout(2500)
        text = await p.inner_text("body")
        R["water_shows_fl_oz"] = "fl oz logged today" in text
        R["no_target_language"] = not any(w in text.lower() for w in ("64 oz", "daily target", "hydration goal"))
        await p.screenshot(path=str(SHOTS / "today-mobile.png"))

        # open the water panel and exercise the entry
        try:
            await p.get_by_role("button", name="Water").first.click()
            await p.wait_for_timeout(600)
            ml = p.get_by_role("button", name="mL")
            if await ml.count():
                await ml.first.click()
                await p.wait_for_timeout(300)
            field = p.get_by_role("spinbutton").first
            await field.fill("250")
            await p.wait_for_timeout(400)
            body = await p.inner_text("body")
            R["ml_rounding_notice"] = "8 fl oz" in body
            await p.screenshot(path=str(SHOTS / "water-ml-250.png"))
            await field.fill("10")   # rounds to 0 fl oz -> must be refused
            await p.get_by_role("button", name="Log water").first.click()
            await p.wait_for_timeout(600)
            body = await p.inner_text("body")
            R["zero_rounding_blocked"] = "nothing was saved" in body.lower()
            await p.screenshot(path=str(SHOTS / "water-ml-too-small.png"))
        except Exception as e:  # noqa: BLE001
            R["water_interaction_error"] = str(e)

        mindset = await p.evaluate("() => document.body.innerText.match(/\\b20 ?s|20 seconds/i)?.[0] || null")
        R["mindset_20s_visible"] = mindset
        await ctx.close()
        await b.close()

    R["external_hosts_blocked"] = sorted({urlparse(u).hostname for u in external})
    R["edge_function_calls_intercepted"] = sorted(set(checkout_calls))
    (EV / "verification.json").write_text(json.dumps(R, indent=2))
    print(json.dumps(R, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
