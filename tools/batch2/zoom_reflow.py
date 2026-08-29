"""Batch 2 closeout: 200% zoom reflow evidence (media-query accurate).

CSS `zoom: 2` scales layout but leaves media queries evaluating at the
unzoomed width, so a desktop sidebar can persist and report false overflow.
Real browser zoom halves the CSS viewport, so this pass emulates 200% zoom as
a 640x450 CSS viewport at deviceScaleFactor 2 and records reflow, overflow and
content loss. Both methods are reported; neither is presented as the other.
"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import session as S
from playwright.async_api import async_playwright

OUT = "/dev-server/docs/batch2-evidence"
ROUTES = [("Today","/app","memberA"),("Meals","/app/meals","memberA"),("Progress","/app/progress","memberA"),
          ("Workouts","/app/workouts","memberA"),("Learn","/app/learn","memberA"),("Ask","/app/ask","memberA"),
          ("Profile","/app/profile","memberA"),("Settings","/app/settings","memberA"),
          ("Billing","/app/billing","memberA"),("Support","/app/support","memberA"),
          ("Admin: Subscriptions","/admin/subscriptions","admin")]

async def main():
    results = []
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        for name, path, who in ROUTES:
            c = await b.new_context(viewport={"width": 640, "height": 450}, device_scale_factor=2)
            pg = await S.signed_in(c, who)
            await pg.goto(S.BASE + path, wait_until="domcontentloaded")
            await pg.wait_for_timeout(2500)
            data = await pg.evaluate("""() => ({
              scroll_width: document.documentElement.scrollWidth,
              client_width: document.documentElement.clientWidth,
              horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
              h1: (document.querySelector('h1')||{}).textContent || null,
              main_visible: !!document.querySelector('main'),
              nav_visible: [...document.querySelectorAll('nav')].some(n => n.getBoundingClientRect().height > 0)
            })""")
            slug = name.lower().replace(": ", "-").replace(" ", "-")
            await pg.screenshot(path=f"{OUT}/screenshots/{slug}-zoom200-reflow.png")
            results.append({"route": name, **data,
                            "screenshot": f"screenshots/{slug}-zoom200-reflow.png"})
            print(name, data["horizontal_overflow"], data["scroll_width"])
            await c.close()
        await b.close()
    json.dump({
        "method": "200% zoom emulated as a 640x450 CSS viewport at deviceScaleFactor 2, "
                  "which reproduces browser-zoom reflow including media-query breakpoints",
        "limitation": "Chromium DevTools page zoom cannot be driven from Playwright; the CSS `zoom: 2` "
                      "pass in accessibility.json keeps 1280px media queries and is reported separately",
        "routes": results,
    }, open(f"{OUT}/zoom-200-reflow.json", "w"), indent=2)

asyncio.run(main())
