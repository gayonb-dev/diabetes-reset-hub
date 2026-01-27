
# 🩺 The 5-Day Diabetes Reset Challenge - Landing Page

A professional, high-converting landing page with complete e-commerce functionality.

---

## 🎨 Design System

**Colors (as specified):**
- Primary Green: `#8FBF88` / `#7DAF76`
- Secondary Gold: `#F4E3B2`
- Neutrals: White, grays (100-900)
- No purple/indigo/violet

**Typography:**
- Headings: Montserrat (bold)
- Body: Open Sans / system sans

---

## 📱 Page Sections (10 Total)

### 1. Hero Section
- Two-column layout with gradient background
- "Limited Time Offer" pulsing badge
- Main headline: "Reverse Diabetes. Reclaim Your Life."
- Two CTAs: Paid challenge ($27) + Free meal plan
- Responsive hero image with floating "5 Days" badge

### 2. Problem/Promise Section
- "Why Most Plans Fail" messaging
- ❌ What doesn't work list
- ✅ What does work with green highlight box

### 3. How It Works
- 3 cards showing the journey:
  - 5-Day Challenge ($27)
  - 6-Week Reset
  - 12-Week Transformation

### 4. What You Get
- 5 benefit cards with icons:
  - Daily 10-min actions
  - Diabetic-friendly plate guide
  - Safe movements
  - Accountability nudges
  - Quick Wins Tracker

### 5. Testimonials
- 3 testimonial cards with results
- Social proof: "156+ people transformed"
- Stats highlights box

### 6. Why This Works
- 3 cards explaining the science:
  - Insulin & Inflammation
  - Gut & Hormones
  - Accountability

### 7. Pricing Section
- Featured pricing card with green header
- Strike-through pricing ($47 → $27)
- 6 features with checkmarks
- Trust badges (Secure, Support, Instant Access)

### 8. FAQ Accordion
- 5 expandable questions including refund policy
- First item open by default

### 9. Final CTA
- Full green gradient section
- Inverse-styled white button
- Final disclaimers

### 10. Footer
- Dark footer with branding
- Legal disclaimers

---

## 📱 Mobile Features

**Sticky Bottom CTA Button:**
- Fixed to bottom on mobile only
- Full-width green button
- Shows on scroll, z-40

---

## 🔲 Modals

### Email Popup (Free Meal Plan)
- Name + Email form
- Validation with error states
- Success confirmation
- Saves to Supabase `leads` table

### Payment Modal
- Full Name, Email, Phone fields
- Real-time validation
- Connects to Stripe Checkout
- Success confirmation with order details

---

## 🔧 Backend (Supabase)

### Database Tables

**`orders` table:**
- customer_name, customer_email, customer_phone
- amount, currency, status
- product_name, product_id
- stripe_payment_intent_id, stripe_session_id
- created_at, updated_at
- RLS policies for security

**`leads` table:**
- name, email
- source (free_meal_plan)
- created_at

### Edge Functions

**`create-checkout-session`:**
- Creates Stripe Checkout session
- Saves pending order to database
- Returns checkout URL

**`stripe-webhook`:**
- Handles payment success/failure
- Updates order status
- Secure signature verification

---

## 💳 Stripe Integration

- Product: "5-Day Diabetes Reset Challenge"
- Price: $27 USD (one-time)
- Stripe Checkout for secure payments
- Webhook for order fulfillment
- Success/cancel redirect handling

---

## ✨ Animations & Interactions

- Pulse animation on "Limited Time" badge
- Hover scale on cards (1.05 transform)
- Shadow elevation on hover
- Smooth scroll to pricing section
- FAQ accordion with chevron rotation
- Modal fade-in/out with backdrop blur

---

## 🔒 Security & Trust

- 256-bit SSL encrypted checkout
- 30-day money-back guarantee messaging
- Medical disclaimers throughout
- Input validation on all forms
- RLS policies on database tables

---

## 📊 SEO & Performance

- Proper meta tags and description
- Semantic HTML structure
- Lazy-loaded images with srcSet
- Optimized for Core Web Vitals
- Accessible form labels and ARIA

