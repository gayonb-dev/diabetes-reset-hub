"""Batch 2 closeout: responsive and accessibility evidence.

Runs against the local production build on :4173 with synthetic principals.
Viewports: 320 / 390 / 768 / 1280 CSS px, plus an actual Chromium page zoom of
200% applied through CSS `zoom` on the document element (Chromium reflows this
the same way as browser zoom; it is not a devicePixelRatio trick).
"""
import asyncio, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import session as S
from playwright.async_api import async_playwright

BASE = S.BASE
OUT = "/dev-server/docs/batch2-evidence"
SHOTS = f"{OUT}/screenshots"
VIEWPORTS = [320, 390, 768, 1280]

ROUTES = [
    ("Today", "/app", "memberA"), ("Meals", "/app/meals", "memberA"),
    ("Progress", "/app/progress", "memberA"), ("Workouts", "/app/workouts", "memberA"),
    ("Learn", "/app/learn", "memberA"), ("Ask", "/app/ask", "memberA"),
    ("Profile", "/app/profile", "memberA"), ("Settings", "/app/settings", "memberA"),
    ("Billing", "/app/billing", "memberA"), ("Support", "/app/support", "memberA"),
    ("Admin: Subscriptions", "/admin/subscriptions", "admin"),
]

AUDIT = r"""() => {
  const px = v => parseFloat(v) || 0;
  const vis = el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && px(cs.opacity) > 0.05;
  };
  const srgb = c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  const lum = ([r,g,b]) => 0.2126*srgb(r)+0.7152*srgb(g)+0.0722*srgb(b);
  const parse = s => { const m = s.match(/[\d.]+/g); return m ? m.slice(0,4).map(Number) : null; };
  const bgOf = el => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && (c.length < 4 || c[3] > 0.85)) return c.slice(0,3);
      n = n.parentElement;
    }
    return [255,255,255];
  };
  const ratio = (a,b) => { const l1 = lum(a), l2 = lum(b); const [hi,lo] = l1>l2?[l1,l2]:[l2,l1]; return (hi+0.05)/(lo+0.05); };

  const contrast = [], targets = [], fonts = [];
  document.querySelectorAll('body *').forEach(el => {
    if (!vis(el)) return;
    const cs = getComputedStyle(el);
    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (own) {
      const size = px(cs.fontSize), weight = parseInt(cs.fontWeight) || 400;
      const fg = parse(cs.color).slice(0,3);
      const r = ratio(fg, bgOf(el));
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      if (r < (large ? 3 : 4.5)) contrast.push({text: own.slice(0,40), size, weight, ratio: Math.round(r*100)/100, required: large?3:4.5});
      if (size < 12) fonts.push({text: own.slice(0,40), size});
    }
    const tag = el.tagName.toLowerCase();
    const interactive = tag === 'button' || tag === 'a' || tag === 'select' ||
      (tag === 'input' && !['hidden'].includes(el.type)) || el.getAttribute('role') === 'button';
    if (interactive) {
      const r = el.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) {
        targets.push({label: (el.innerText || el.getAttribute('aria-label') || el.value || tag).slice(0,32),
                      w: Math.round(r.width), h: Math.round(r.height)});
      }
    }
  });

  const heads = Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim()).filter(Boolean);
  const de = document.documentElement;
  return {
    h1_count: heads.length, h1: heads[0] || null,
    landmarks: {
      main: document.querySelectorAll('main, [role=main]').length,
      nav: document.querySelectorAll('nav, [role=navigation]').length,
      banner_or_header: document.querySelectorAll('header, [role=banner]').length,
      skip_link: !!document.querySelector('a[href="#main"], a[href="#app-main"], .skip-link'),
    },
    horizontal_overflow: de.scrollWidth > de.clientWidth + 2,
    scroll_width: de.scrollWidth, client_width: de.clientWidth,
    low_contrast: contrast.slice(0, 25), low_contrast_count: contrast.length,
    small_fonts: fonts.slice(0, 10), small_font_count: fonts.length,
    small_targets: targets.slice(0, 15), small_target_count: targets.length,
    tables_with_headers: Array.from(document.querySelectorAll('table')).map(t => t.querySelectorAll('th').length),
    canvas_or_svg_charts: document.querySelectorAll('svg.recharts-surface, canvas').length,
    chart_text_alternative: !!document.querySelector('svg.recharts-surface [aria-label], table, figcaption'),
  };
}"""


async def audit_page(page):
    return await page.evaluate(AUDIT)


async def run():
    os.makedirs(SHOTS, exist_ok=True)
    out = {
        "generated_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "server": "local production build served by vite preview on :4173",
        "zoom_technique": ("200% applied with CSS `zoom: 2` on document.documentElement at a 1280px "
                           "viewport; Chromium reflows CSS zoom like browser zoom. deviceScaleFactor "
                           "was NOT used as a zoom substitute."),
        "contrast_method": ("computed foreground colour against the nearest ancestor with an opaque "
                            "background; gradients, images and semi-transparent overlays are approximated "
                            "and are reported as review items rather than definitive failures"),
        "routes": [], "reduced_motion": None, "keyboard": [],
    }
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        for label, path, who in ROUTES:
            rec = {"route": label, "path": path, "viewports": {}}
            for w in VIEWPORTS:
                ctx = await b.new_context(viewport={"width": w, "height": 900})
                page = await S.signed_in(ctx, who)
                await page.goto(BASE + path, wait_until="domcontentloaded")
                await page.wait_for_timeout(2200)
                rec["viewports"][str(w)] = await audit_page(page)
                shot = f"{label.replace(':','').replace(' ','-').lower()}-{w}.png"
                await page.screenshot(path=f"{SHOTS}/{shot}")
                rec["viewports"][str(w)]["screenshot"] = f"screenshots/{shot}"
                await ctx.close()
            # actual 200% zoom
            ctx = await b.new_context(viewport={"width": 1280, "height": 900})
            page = await S.signed_in(ctx, who)
            await page.goto(BASE + path, wait_until="domcontentloaded")
            await page.evaluate("() => { document.documentElement.style.zoom = '2'; }")
            await page.wait_for_timeout(1800)
            z = await audit_page(page)
            shot = f"{label.replace(':','').replace(' ','-').lower()}-zoom200.png"
            await page.screenshot(path=f"{SHOTS}/{shot}")
            z["screenshot"] = f"screenshots/{shot}"
            rec["zoom_200"] = z
            await ctx.close()

            # keyboard focus walk on the widest viewport
            ctx = await b.new_context(viewport={"width": 1280, "height": 900})
            page = await S.signed_in(ctx, who)
            await page.goto(BASE + path, wait_until="domcontentloaded")
            await page.wait_for_timeout(1500)
            seen, no_ring = [], 0
            for _ in range(18):
                await page.keyboard.press("Tab")
                info = await page.evaluate("""() => { const a = document.activeElement; if (!a || a === document.body) return null;
                    const cs = getComputedStyle(a); const r = a.getBoundingClientRect();
                    return {tag: a.tagName.toLowerCase(), label: (a.innerText || a.getAttribute('aria-label') || '').slice(0,28),
                            outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0,
                            ring: cs.boxShadow !== 'none', visible: r.width > 0 && r.height > 0}; }""")
                if info:
                    seen.append(info)
                    if not (info["outline"] or info["ring"]):
                        no_ring += 1
            out["keyboard"].append({"route": label, "focusable_reached": len(seen),
                                    "without_visible_focus_indicator": no_ring,
                                    "first_stops": seen[:5]})
            await ctx.close()
            out["routes"].append(rec)
            print(label, {k: (v["low_contrast_count"], v["small_target_count"], v["horizontal_overflow"])
                          for k, v in rec["viewports"].items()}, flush=True)

        # reduced motion
        ctx = await b.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
        page = await S.signed_in(ctx, "memberA")
        await page.goto(BASE + "/app", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)
        out["reduced_motion"] = await page.evaluate("""() => {
            const still = Array.from(document.querySelectorAll('*')).filter(el => {
              const cs = getComputedStyle(el);
              return cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0.05;
            }).length;
            return {media_matches: matchMedia('(prefers-reduced-motion: reduce)').matches, still_animating: still};
        }""")
        await ctx.close()
        await b.close()
    json.dump(out, open(f"{OUT}/accessibility.json", "w"), indent=1)
    print("reduced motion", out["reduced_motion"])

asyncio.run(run())
