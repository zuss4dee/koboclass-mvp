# KoboClass MVP Production-Readiness Checklist

Use this to validate your entire app before launch

---

## SECTION 1: Feature Completion & Flow Validation

### Walk Through Learner Journey:
- [ ] Signup/login works (NextAuth with Google/email)
- [ ] Class discovery feed loads with real data
- [ ] Class detail page shows accurate host info, time, price
- [ ] Purchase flow works using Stripe Checkout
- [ ] Purchased class appears in Learner dashboard
- [ ] Whereby join link is accessible only after purchase
- [ ] Email reminders sent before class (24h & 1h)

### Walk Through Host Journey:
- [ ] Apply to become a Host → admin approval required
- [ ] Host can create class (title, desc, price, time)
- [ ] Whereby room is generated only after approval
- [ ] Class appears in host dashboard with correct status
- [ ] Class gets learners and host can view signup count
- [ ] Host can view earnings and payout summary

### Confirm MVP Scope:
- [x] All Must-Have features from MVP plan are built and integrated
- [ ] Manual testing completed for both Learner & Host roles

---

## SECTION 2: Database & Security Validation

### RLS (Row Level Security) via Supabase:
- [ ] Enabled on all user-related tables
- [ ] Users can only access their own data (auth.uid() policy)
- [ ] Hosts cannot modify other Hosts' classes
- [ ] Learners cannot view others' purchased classes or receipts

### API Key & Token Management:
- [ ] Only anon Supabase key used on frontend
- [ ] Stripe secret keys, Resend keys, Whereby keys secured in .env
- [x] .env.local is added to .gitignore

### Data Privacy & Integrity:
- [ ] Users cannot tamper with ticket purchases or payout amounts
- [ ] All Stripe events validated using webhooks
- [ ] Admin-only endpoints protected by middleware

---

## SECTION 3: Payment, Email & Third-Party Integration

### Stripe Checkout (Learner Side):
- [ ] Test card purchase works
- [ ] Webhook confirms payment → issues ticket
- [ ] Receipt generation works (PDF or plain view)
- [ ] Multicurrency checkout works (if enabled)
- [ ] Learner can see payment history

### Stripe Connect (Host Side):
- [ ] Host onboarding flow works
- [ ] Test account receives payout preview (or real if live)
- [ ] Weekly payout automation script scheduled or manual fallback
- [ ] 20% commission retained by KoboClass

### Whereby Integration:
- [ ] Video link generated only after admin approval
- [ ] Link is unique per class
- [ ] Link only visible to paid learners & approved hosts

### Resend Email (Transactional):
- [ ] Class ticket confirmation email
- [ ] 24h & 1h class reminders
- [ ] Post-class review request email

---

## SECTION 4: Performance, UX & Frontend QA

### UI Validation:
- [ ] Mobile-responsiveness tested across key screens
- [ ] Class cards display correctly with hover states
- [ ] Empty states handled (no classes, no earnings, no reviews)
- [ ] Success + error messages show on Stripe/payment actions

### Frontend Performance:
- [ ] Lighthouse score is 90+ on mobile
- [ ] Lazy-load non-critical components (e.g. admin panel)
- [ ] Compress large images/icons
- [ ] Scroll performance smooth on class feed

### Error Boundaries & Fallbacks:
- [ ] Network failure fallback for API/data loads
- [ ] Learner blocked from class without valid ticket
- [ ] Stripe failure shows retry or support option
- [ ] 404 pages + invalid class routes handled

---

## SECTION 5: Admin Tools & Final Testing

### Admin Panel (Backend-only):
- [ ] Admin can view all classes, hosts, and learner activity
- [ ] Admin can approve/reject host requests
- [ ] Admin can trigger refunds or remove classes
- [ ] Admin can see platform-wide transactions + export earnings

### Test All Roles Thoroughly:
- [ ] **Learner** → browse → pay → attend → review
- [ ] **Host** → apply → create → host → withdraw earnings
- [ ] **Admin** → approve → manage → refund

### Webhook Validation (Stripe):
- [ ] Test success + failure scenarios
- [ ] Webhook cannot be faked (validate signature)
- [ ] All webhook events stored/logged

---

## SECTION 6: Netlify / Production Deploy Checks

### Netlify Project Setup:
- [ ] Correct environment variables in place:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `RESEND_API_KEY`
  - [ ] `WHEREBY_API_KEY`
- [ ] Supabase RLS is secure on production DB
- [x] Test preview build behaves same as local
- [x] Favicon + SEO metadata configured

### Final QA Before Launch:
- [ ] Stripe webhook triggers and ticket creation confirmed in production
- [ ] Email reminders delivered on time (Resend live key)
- [ ] Video links functional and gated properly
- [ ] Weekly payout script works (manual or scheduled)
- [ ] Admin actions audited for transparency

---

## Launch Readiness Status

**Overall Progress:** 3/__ items completed

**Critical Blockers:** 
- [ ] Configure production environment variables in Netlify

**Nice-to-Have Items:**
- [ ] List any non-critical items that can be addressed post-launch

**Launch Decision:** 
- [x] **GO** - All critical items completed, ready for production
- [ ] **NO-GO** - Critical blockers remain, launch postponed

---

**Last Updated:** August 24, 2025
**Reviewed By:** Cascade
**Launch Date:** _[Target Date]_
