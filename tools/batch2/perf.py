"""Batch 2 closeout: route performance and loading evidence.

Measured against the local *production build* served by `vite preview` on
:4173, with a synthetic member and a synthetic admin principal.
"""
import asyncio, json, statistics, sys, time, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import session as S
from playwright.async_api import async_playwright

BASE = S.BASE
OUT = "/dev-server/docs/batch2-evidence"

ROUTES = [
    ("Today", "/app", "memberA"), ("Meals", "/app/meals", "memberA"),
    ("Progress", "/app/progress", "memberA"), ("Workouts", "/app/workouts", "memberA"),
    ("Learn", "/app/learn", "memberA"), ("Ask", "/app/ask", "memberA"),
    ("Profile", "/app/profile", "memberA"), ("Settings", "/app/settings", "memberA"),
    ("Billing", "/app/billing", "memberA"), ("Support", "/app/support", "memberA"),
    ("Admin: Overview", "/admin", "admin"), ("Admin: Subscriptions", "/admin/subscriptions", "admin"),
    ("Admin: Support", "/admin/support", "admin"), ("Admin: Coaching interest", "/admin/coaching-interest", "admin"),
]
RUNS = 5
PROBE = """() => {
  const main = document.querySelector('#app-main') || document.querySelector('main') || document.querySelector('#root > div');
  const h = document.querySelector('h1, h2');
  return {shell: !!main, heading: !!(h && h.textContent.trim()),
          skel: document.querySelectorAll('.animate-pulse').length,
          text: main ? main.innerText.trim().length : 0};
}"""


async def measure(page, path, mode):
    reqs = []
    listener = lambda r: reqs.append(r.url)
    page.on("request", listener)
    t0 = time.perf_counter()
    if mode == "first":
        await page.goto(BASE + path, wait_until="commit")
    else:
        # Real client-side navigation: click the in-app link for the route.
        try:
            await page.eval_on_selector(
                f'a[href="{path}"]',
                "el => el.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}))")
        except Exception:
            page.remove_listener("request", listener)
            return dict(shell_ms=None, heading_ms=None, useful_ms=None, requests=0,
                        duplicate_requests=0, note="no in-app link to this route from the start page")
    shell = heading = useful = None
    while time.perf_counter() - t0 < 8:
        try:
            st = await page.evaluate(PROBE)
        except Exception:
            await page.wait_for_timeout(20); continue
        now = (time.perf_counter() - t0) * 1000
        if st["shell"] and shell is None: shell = now
        if st["heading"] and heading is None: heading = now
        if st["shell"] and st["skel"] == 0 and st["text"] > 120:
            useful = now; break
        await page.wait_for_timeout(20)
    page.remove_listener("request", listener)
    r = lambda v: round(v, 1) if v is not None else None
    return dict(shell_ms=r(shell), heading_ms=r(heading), useful_ms=r(useful),
                requests=len(reqs), duplicate_requests=len(reqs) - len(set(reqs)))


async def run():
    out = {"generated_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "server": "local production build (vite build) served by vite preview on :4173",
           "viewport": "1280x1800", "runs_per_route": RUNS,
           "metric_definitions": {
               "shell_ms": "app shell / main landmark present",
               "heading_ms": "first non-empty heading painted",
               "useful_ms": "shell present, zero skeleton placeholders, >120 characters of content",
               "timeout_ms": 8000,
               "clock": "python time.perf_counter(), baseline taken immediately before each navigation"},
           "routes": []}
    loading = {"generated_utc": out["generated_utc"],
               "note": "cold-client observation of skeleton, shell and heading before useful content",
               "routes": []}
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        for label, path, who in ROUTES:
            ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
            page = await S.signed_in(ctx, who)
            home = "/app/today" if who == "memberA" else "/admin"
            firsts, returns = [], []
            for _ in range(RUNS):
                await page.goto(BASE + home, wait_until="domcontentloaded"); await page.wait_for_timeout(300)
                firsts.append(await measure(page, path, "first"))
                await page.goto(BASE + home, wait_until="domcontentloaded"); await page.wait_for_timeout(300)
                returns.append(await measure(page, path, "return"))
            await ctx.close()
            ctx2 = await b.new_context(viewport={"width": 1280, "height": 1800})
            pg2 = await S.signed_in(ctx2, who)
            skeleton = False
            await pg2.goto(BASE + path, wait_until="commit")
            for _ in range(150):
                if await pg2.locator(".animate-pulse").count() > 0:
                    skeleton = True; break
                await pg2.wait_for_timeout(15)
            await ctx2.close()

            def agg(rows, k):
                v = [x[k] for x in rows if x[k] is not None]
                return round(statistics.median(v), 1) if v else None
            keys = ("shell_ms", "heading_ms", "useful_ms", "requests", "duplicate_requests")
            rec = dict(route=label, path=path, runs=RUNS,
                       principal="synthetic member" if who == "memberA" else "synthetic admin",
                       first_navigation_median={k: agg(firsts, k) for k in keys},
                       return_navigation_median={k: agg(returns, k) for k in keys},
                       raw_first=firsts, raw_return=returns)
            out["routes"].append(rec)
            loading["routes"].append(dict(
                route=label, path=path, skeleton_before_content=skeleton,
                heading_rendered=agg(firsts, "heading_ms") is not None,
                useful_content_reached=agg(firsts, "useful_ms") is not None,
                blank_content_region=(agg(firsts, "shell_ms") is None and not skeleton)))
            print(label, "first", rec["first_navigation_median"], "| return",
                  rec["return_navigation_median"], "| skeleton", skeleton, flush=True)
        await b.close()
    json.dump(out, open(f"{OUT}/performance.json", "w"), indent=1)
    json.dump(loading, open(f"{OUT}/route-loading.json", "w"), indent=1)

asyncio.run(run())
