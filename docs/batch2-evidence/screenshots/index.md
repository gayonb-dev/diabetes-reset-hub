# Batch 2 — screenshot index

Generated: 2026-08-29T16:17:54Z · server: local production build served by vite preview on :4173

Viewports are CSS pixels. Every member route is captured at 320 / 390 / 768 / 1280 plus both
200% zoom methods. Synthetic principals only; no real member identifiers appear in any capture.

| Route | 320 | 390 | 768 | 1280 | 200% (CSS zoom) | 200% (reflow) |
|---|---|---|---|---|---|---|
| Today | [png](./today-320.png) | [png](./today-390.png) | [png](./today-768.png) | [png](./today-1280.png) | [png](./today-zoom200.png) | [png](./today-zoom200-reflow.png) |
| Meals | [png](./meals-320.png) | [png](./meals-390.png) | [png](./meals-768.png) | [png](./meals-1280.png) | [png](./meals-zoom200.png) | [png](./meals-zoom200-reflow.png) |
| Progress | [png](./progress-320.png) | [png](./progress-390.png) | [png](./progress-768.png) | [png](./progress-1280.png) | [png](./progress-zoom200.png) | [png](./progress-zoom200-reflow.png) |
| Workouts | [png](./workouts-320.png) | [png](./workouts-390.png) | [png](./workouts-768.png) | [png](./workouts-1280.png) | [png](./workouts-zoom200.png) | [png](./workouts-zoom200-reflow.png) |
| Learn | [png](./learn-320.png) | [png](./learn-390.png) | [png](./learn-768.png) | [png](./learn-1280.png) | [png](./learn-zoom200.png) | [png](./learn-zoom200-reflow.png) |
| Ask | [png](./ask-320.png) | [png](./ask-390.png) | [png](./ask-768.png) | [png](./ask-1280.png) | [png](./ask-zoom200.png) | [png](./ask-zoom200-reflow.png) |
| Profile | [png](./profile-320.png) | [png](./profile-390.png) | [png](./profile-768.png) | [png](./profile-1280.png) | [png](./profile-zoom200.png) | [png](./profile-zoom200-reflow.png) |
| Settings | [png](./settings-320.png) | [png](./settings-390.png) | [png](./settings-768.png) | [png](./settings-1280.png) | [png](./settings-zoom200.png) | [png](./settings-zoom200-reflow.png) |
| Billing | [png](./billing-320.png) | [png](./billing-390.png) | [png](./billing-768.png) | [png](./billing-1280.png) | [png](./billing-zoom200.png) | [png](./billing-zoom200-reflow.png) |
| Support | [png](./support-320.png) | [png](./support-390.png) | [png](./support-768.png) | [png](./support-1280.png) | [png](./support-zoom200.png) | [png](./support-zoom200-reflow.png) |
| Admin: Subscriptions | [png](./admin-subscriptions-320.png) | [png](./admin-subscriptions-390.png) | [png](./admin-subscriptions-768.png) | [png](./admin-subscriptions-1280.png) | [png](./admin-subscriptions-zoom200.png) | [png](./admin-subscriptions-zoom200-reflow.png) |

## Other captures


## Zoom methods

- `accessibility.json` → `zoom_200`: CSS `zoom: 2` at a 1280px viewport. Chromium scales layout but keeps
  media queries at 1280px, so the desktop rail persists and three routes report horizontal overflow.
  This is a method artefact, not a product defect.
- `zoom-200-reflow.json`: 200% zoom emulated as a 640x450 CSS viewport at deviceScaleFactor 2, which reproduces browser-zoom reflow including media-query breakpoints. All 11 routes reflow with no horizontal overflow.
- Limitation: Chromium's DevTools page-zoom control cannot be driven from Playwright, so neither pass is
  labelled 'native browser zoom'.

