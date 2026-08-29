# Batch 2 — screenshot index

Generated: 2026-08-29T16:17:54Z · server: local production build served by vite preview on :4173

Viewports are CSS pixels. Every member route is captured at 320 / 390 / 768 / 1280 plus both
200% zoom methods. Synthetic principals only; no real member identifiers appear in any capture.

| Route | 320 | 390 | 768 | 1280 | 200% (CSS zoom) | 200% (reflow) |
|---|---|---|---|---|---|---|
| Today | [png](screenshots/today-320.png) | [png](screenshots/today-390.png) | [png](screenshots/today-768.png) | [png](screenshots/today-1280.png) | [png](screenshots/today-zoom200.png) | [png](screenshots/today-zoom200-reflow.png) |
| Meals | [png](screenshots/meals-320.png) | [png](screenshots/meals-390.png) | [png](screenshots/meals-768.png) | [png](screenshots/meals-1280.png) | [png](screenshots/meals-zoom200.png) | [png](screenshots/meals-zoom200-reflow.png) |
| Progress | [png](screenshots/progress-320.png) | [png](screenshots/progress-390.png) | [png](screenshots/progress-768.png) | [png](screenshots/progress-1280.png) | [png](screenshots/progress-zoom200.png) | [png](screenshots/progress-zoom200-reflow.png) |
| Workouts | [png](screenshots/workouts-320.png) | [png](screenshots/workouts-390.png) | [png](screenshots/workouts-768.png) | [png](screenshots/workouts-1280.png) | [png](screenshots/workouts-zoom200.png) | [png](screenshots/workouts-zoom200-reflow.png) |
| Learn | [png](screenshots/learn-320.png) | [png](screenshots/learn-390.png) | [png](screenshots/learn-768.png) | [png](screenshots/learn-1280.png) | [png](screenshots/learn-zoom200.png) | [png](screenshots/learn-zoom200-reflow.png) |
| Ask | [png](screenshots/ask-320.png) | [png](screenshots/ask-390.png) | [png](screenshots/ask-768.png) | [png](screenshots/ask-1280.png) | [png](screenshots/ask-zoom200.png) | [png](screenshots/ask-zoom200-reflow.png) |
| Profile | [png](screenshots/profile-320.png) | [png](screenshots/profile-390.png) | [png](screenshots/profile-768.png) | [png](screenshots/profile-1280.png) | [png](screenshots/profile-zoom200.png) | [png](screenshots/profile-zoom200-reflow.png) |
| Settings | [png](screenshots/settings-320.png) | [png](screenshots/settings-390.png) | [png](screenshots/settings-768.png) | [png](screenshots/settings-1280.png) | [png](screenshots/settings-zoom200.png) | [png](screenshots/settings-zoom200-reflow.png) |
| Billing | [png](screenshots/billing-320.png) | [png](screenshots/billing-390.png) | [png](screenshots/billing-768.png) | [png](screenshots/billing-1280.png) | [png](screenshots/billing-zoom200.png) | [png](screenshots/billing-zoom200-reflow.png) |
| Support | [png](screenshots/support-320.png) | [png](screenshots/support-390.png) | [png](screenshots/support-768.png) | [png](screenshots/support-1280.png) | [png](screenshots/support-zoom200.png) | [png](screenshots/support-zoom200-reflow.png) |
| Admin: Subscriptions | [png](screenshots/admin-subscriptions-320.png) | [png](screenshots/admin-subscriptions-390.png) | [png](screenshots/admin-subscriptions-768.png) | [png](screenshots/admin-subscriptions-1280.png) | [png](screenshots/admin-subscriptions-zoom200.png) | [png](screenshots/admin-subscriptions-zoom200-reflow.png) |

## Other captures


## Zoom methods

- `accessibility.json` → `zoom_200`: CSS `zoom: 2` at a 1280px viewport. Chromium scales layout but keeps
  media queries at 1280px, so the desktop rail persists and three routes report horizontal overflow.
  This is a method artefact, not a product defect.
- `zoom-200-reflow.json`: 200% zoom emulated as a 640x450 CSS viewport at deviceScaleFactor 2, which reproduces browser-zoom reflow including media-query breakpoints. All 11 routes reflow with no horizontal overflow.
- Limitation: Chromium's DevTools page-zoom control cannot be driven from Playwright, so neither pass is
  labelled 'native browser zoom'.

