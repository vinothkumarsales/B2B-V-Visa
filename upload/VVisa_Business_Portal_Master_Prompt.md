# VVisa.in — Business Visa Portal: Master Build Prompt
**For: Bolt.new / Lovable / v0 / Cursor / Codex**
**Version: 1.0 | Brand: business.vvisa.in**

---

## 🎯 THE MISSION

Build a **premium, production-ready B2B visa services platform** for `business.vvisa.in` — targeting Indian travel agencies, visa consultants, and B2B travel companies. The product is a direct competitor to `business.atlys.com`, but with a richer, more modern UI inspired by `growthx.club/learn` (dark-first, high-density information, clean card-based layout, Lucide icons, smooth micro-animations).

This is not a prototype. Deliver a fully routed, multi-page application with real component depth, TypeScript strict mode, and production-grade code quality.

---

## 🧱 TECH STACK (Best-in-class from reference analysis)

### Core Framework
- **Next.js 15** (App Router, RSC where applicable)
- **TypeScript** — strict mode, no `any`
- **React 19**

### Styling & UI
- **Tailwind CSS v4** — utility-first, JIT
- **shadcn/ui** — base component library (Radix UI primitives underneath)
- **Framer Motion** — page transitions, micro-interactions, scroll-triggered reveals
- **Lucide React** — icon system (same as GrowthX, consistent outline style)
- **Geist Font** (Vercel) — `Geist Sans` for UI, `Geist Mono` for data/codes

### State & Data
- **Zustand** — lightweight global state (auth, cart, application flow)
- **TanStack Query v5** — server state, caching, background refetch
- **React Hook Form + Zod** — all forms with schema validation

### Auth & Backend
- **Firebase v10** — Auth (phone OTP + email), Firestore for real-time data
- **Firebase Storage** — passport/document uploads

### Payments
- **Razorpay** — wallet top-up, visa payments (Indian payment gateway)

### Analytics & Monitoring
- **PostHog** — product analytics, session replay
- **Sentry** — error tracking
- **Google Tag Manager** — tag container

### Infrastructure
- **Cloudflare** — CDN, edge caching
- **Vercel** — deployment (zero-config Next.js)

### Dev Quality
- **ESLint + Prettier** — enforced formatting
- **Husky + lint-staged** — pre-commit hooks

---

## 🎨 DESIGN SYSTEM

### Visual DNA
Inspired by **GrowthX** (dark, premium, high-information density) combined with **Atlys Business** (clean workflow, trust signals). The result: a **dark-first SaaS portal** that feels like a Bloomberg terminal meets a modern fintech app.

### Color Palette
```
Primary Background:   #0A0A0F  (near-black, not pure black)
Secondary Surface:    #111118  (cards, panels)
Tertiary Surface:     #1A1A24  (hover states, sidebars)
Border Default:       #2A2A38  (subtle, low contrast)
Border Active:        #3D3D54  (focused, selected)

Brand Indigo:         #4F46E5  (primary CTA, active states)
Brand Indigo Light:   #6366F1  (hover)
Brand Indigo Glow:    rgba(79, 70, 229, 0.15)  (glow effects)

Accent Gold:          #F59E0B  (premium badges, earnings)
Accent Green:         #10B981  (approved, success states)
Accent Red:           #EF4444  (rejected, error states)
Accent Blue:          #3B82F6  (info, links)

Text Primary:         #F9FAFB  (headings, primary content)
Text Secondary:       #9CA3AF  (labels, captions)
Text Muted:           #6B7280  (placeholders, disabled)
```

### Typography
```
Display / Hero:      Geist Sans, 800 weight, -0.04em letter-spacing
Headings (H1-H3):   Geist Sans, 700 weight, -0.02em letter-spacing
Body:               Geist Sans, 400 weight, 1.6 line-height
Data / Reference:   Geist Mono, 500 weight (passport numbers, amounts, codes)
Labels / Caps:      Geist Sans, 600 weight, 0.08em letter-spacing, uppercase, 11px
```

### Component Signature
- **Cards**: `bg-[#111118] border border-[#2A2A38] rounded-xl` — no drop shadow, only border
- **CTAs**: `bg-indigo-600 hover:bg-indigo-500 transition-all duration-150 rounded-lg font-semibold`
- **Inputs**: `bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white`
- **Badges**: Pill shape, 11px uppercase caps, color-coded by status
- **Tables**: Zebra-striped with `#111118` / `#0A0A0F` alternating rows
- **Sidebar nav**: Active item gets `bg-indigo-950 text-indigo-400 border-l-2 border-indigo-500`

### Animation Conventions
```
Page entry:        Framer Motion, opacity 0→1, y: 8→0, duration: 0.3s ease-out
Card hover:        scale(1.005), border-color transition, 150ms
Button press:      scale(0.97), 100ms
Status badge pulse: Tailwind `animate-pulse` on dot indicator only
Skeleton loading:  Custom shimmer animation, `#1A1A24` → `#222230` gradient sweep
```

---

## 📁 PROJECT STRUCTURE

```
business.vvisa.in/
├── app/
│   ├── (marketing)/           # Public pages (no auth required)
│   │   ├── page.tsx           # Landing / Home
│   │   ├── layout.tsx         # Marketing layout (header + footer)
│   │   └── pricing/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/           # Protected routes
│   │   ├── layout.tsx         # Dashboard shell with sidebar
│   │   ├── dashboard/page.tsx # Main dashboard (post-login landing)
│   │   ├── explore/page.tsx   # Visa search + category browse
│   │   ├── apply/
│   │   │   ├── page.tsx       # Visa type selection
│   │   │   └── [applicationId]/
│   │   │       └── page.tsx   # Application form
│   │   ├── applications/
│   │   │   ├── page.tsx       # All applications list
│   │   │   └── [groupId]/page.tsx  # Group application detail
│   │   ├── wallet/page.tsx
│   │   ├── alliance/page.tsx
│   │   ├── overstay/page.tsx
│   │   └── profile/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── applications/route.ts
│   │   ├── wallet/route.ts
│   │   └── upload/route.ts
│   ├── globals.css
│   └── layout.tsx             # Root layout
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── marketing/             # Landing page sections
│   │   ├── HeroSection.tsx
│   │   ├── TrustBar.tsx
│   │   ├── WhyChooseSection.tsx
│   │   ├── StatsSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   └── FAQSection.tsx
│   ├── dashboard/             # Dashboard-specific components
│   │   ├── Sidebar.tsx
│   │   ├── TopNav.tsx
│   │   ├── WalletBadge.tsx
│   │   └── NotificationBell.tsx
│   ├── applications/
│   │   ├── ApplicationCard.tsx
│   │   ├── GroupApplicationCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── ApplicationTimeline.tsx
│   │   └── ProgressStepper.tsx
│   ├── explore/
│   │   ├── VisaSearchBar.tsx
│   │   ├── VisaCategoryCard.tsx
│   │   └── VisaResultCard.tsx
│   ├── forms/
│   │   ├── PassportUploader.tsx
│   │   ├── DocumentUploader.tsx
│   │   ├── TravelerForm.tsx
│   │   └── ApplicationFormShell.tsx
│   ├── wallet/
│   │   ├── WalletBalance.tsx
│   │   ├── DepositModal.tsx
│   │   └── TransactionTable.tsx
│   └── shared/
│       ├── PageHeader.tsx
│       ├── EmptyState.tsx
│       ├── DataTable.tsx
│       └── ConfirmModal.tsx
├── lib/
│   ├── firebase.ts
│   ├── razorpay.ts
│   ├── utils.ts
│   └── validators/
│       ├── application.schema.ts
│       └── profile.schema.ts
├── store/
│   ├── auth.store.ts
│   ├── application.store.ts
│   └── wallet.store.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useApplications.ts
│   ├── useWallet.ts
│   └── usePassportOCR.ts
├── types/
│   ├── application.types.ts
│   ├── visa.types.ts
│   └── user.types.ts
└── middleware.ts              # Auth protection
```

---

## 📄 PAGE-BY-PAGE SPECIFICATION

---

### PAGE 1: MARKETING HOME (`/`)
**Reference**: `business.atlys.com` (Page_1_portal_Home_page_.pdf)
**UI Inspiration**: GrowthX dark premium aesthetic

#### Layout
Full-width dark page. No sidebar. Marketing header with logo + "Log In" button (ghost style).

#### Section 1 — Hero
- **Headline** (display/H1): `"Visas Done Right,`  
  `Every Time."` (two lines, 72px, 800 weight, white)
- **Subheadline**: `"India's most trusted B2B visa platform for travel agencies. Guaranteed processing. Zero errors."` (18px, muted gray)
- **CTA row**: `[Get Started Free →]` (indigo filled, large) + `[Watch Demo]` (ghost, with ▶ icon)
- **Social proof pill**: `"Trusted by 5,000+ Travel Agents"` — small pill above headline with a green dot
- **Hero visual** (right side): Animated dashboard mockup — a floating card showing "Visa Approved ✓" with confetti particle burst on load. Behind it: faint grid pattern overlay. Add subtle floating stat cards: "₹15,000 Cashback Earned" and "Total Earnings ₹12,570 ↑ 30%"
- **Ticker bar** (below hero): scrolling marquee — "Best Prices for Travel Agents • Quick & Easy Applications • 24/7 Support, Anytime"

#### Section 2 — Trust Bar
- 4 agency logos in a row (Veena World, Affinco, Travel Best, The Journeys) with city labels
- Label above: `"5,000+ Travel Agents trust VVisa for On Time Visas"` — `5,000+` in indigo

#### Section 3 — Why Choose VVisa
- Left: 3 feature blocks (each with indigo icon, bold title, 2 bullet points):
  1. **Best Prices for Travel Agents** — Save more with unbeatable rates · Extra discounts on bulk applications
  2. **Quick & Easy Applications** — Passport scanner to reduce errors · Apply for up to 500 visa applications in one click
  3. **24/7 Support, Anytime** — Your dedicated Account Manager is just a call away · Emergency help around the clock
- Right: Animated product screenshot showing "Guaranteed visa on [date]" notification card. Use Framer Motion slide-in-from-right

#### Section 4 — Stats (Dark band, full-width)
```
99.2% Visas Delivered On Time
[ 5,00,000+ Visas ]  [ 65 Types of Visas ]  [ 5,000+ Agents ]
```
All numbers in indigo, bold. Labels in gray below.

#### Section 5 — How to Apply in 30 Seconds
4-step horizontal process. Each step is a numbered card:
1. Select destination & travel dates → (search form mini preview)
2. Upload passport & photo → (passport OCR preview)
3. Pay from VVisa Wallet → (price breakdown preview)
4. Get your visa within ETA → (approved visa card)

Steps connected by dotted line with arrow. Step number in indigo circle.

#### Section 6 — Travel Insurance Banner
- Full-width indigo gradient band
- `"Looking for travel insurance?"` — large white heading
- Two stats: `98% settlement rate` | `1 Day digital claims`
- CTA: `[Sign up for free]`

#### Section 7 — Testimonials
- Carousel with 5 agency names as tab pills (Burnmiles, RV Holiday, Jetways, Family, Travozone)
- Quote below in large italic text
- Attribution: name + company logo

#### Section 8 — FAQ (Accordion)
Dark accordion, 6 questions:
1. What is ETA and How is it Calculated?
2. Can I Track the Status of My Application?
3. Do You Provide Support After I Submit My Application?
4. How Do I Make a Payment?
5. Do I Get GST Invoices?
6. Do You Offer Support for Group Applications?

Each accordion item: border-bottom divider, `+` → `−` icon transition with Framer Motion.

#### Footer
- Logo + "Built for India ❤️" (use emoji)
- 4-column links: Company, Support, Legal, Social
- 3 office addresses (Mumbai, Delhi, New York)
- Social icons: Facebook, Instagram, Twitter, YouTube (Lucide)
- Copyright line

---

### PAGE 2: AUTH — LOGIN & SIGNUP (`/login`, `/signup`)
**Reference**: Page_2_sign-in-Signup_Page_.pdf

#### Layout
Split layout: Left panel (indigo background) + Right panel (white/dark form area)

#### Left Panel (Indigo)
- VVisa Business logo (white)
- Headline: `"Join 10,000+ Agents growing with VVisa!"`
- 3 feature cards (rounded, semi-transparent white):
  1. Best Prices for Travel Agents
  2. Quick & Easy Applications  
  3. 24/7 Support, Anytime
- Each card: icon + title + 2 bullet points

#### Right Panel (Form)
**Login form:**
- Header: "Login to VVisa"
- Email field (label + input)
- Password field (label + input + show/hide toggle eye icon)
- "Reset My Password" link (small, indigo)
- `[Sign In]` button (full-width, indigo)
- Divider "OR"
- `[Continue with Google]` (ghost button with Google icon)
- Bottom: "Don't have an account? Sign up" link

**Signup form (tab switch):**
- Mobile number field (with India flag + dial code picker)
- `[Send OTP]` → OTP input 6-digit pincode field
- Agency name, Email
- Password + Confirm Password
- `[Create Account]` CTA
- Terms acceptance checkbox

**Validation**: All fields use React Hook Form + Zod. Real-time inline validation. Error messages below each field in red.

---

### PAGE 3: DASHBOARD LANDING (`/dashboard`)
**Reference**: Page_3_landing_page_.pdf — post-login home screen

#### Shell (Persistent across all dashboard pages)
**Sidebar** (left, 240px wide, dark `#111118`):
- Agency logo/avatar circle with initials + agency name + email (truncated)
- `[Explore Visas]` button — full-width, indigo
- Nav items (with Lucide icons):
  - Profile
  - Alliance Dashboard
  - Old Dashboard (gray, deprecated label)
  - Wallet (with balance badge)
  - Overstay
  - Change Password
  - Sign Out (red text, at bottom)
- Active item: left indigo border + indigo-tinted background

**Top Nav** (right of sidebar):
- `[Need help?]` link
- Wallet balance chip: `₹70` with wallet icon
- Notification bell
- User avatar

#### Dashboard Hero (Main content)
- Search bar prominently: `[🏠 India]` `[✈ Going to...]` `[📅 Travel Date]` `[📅 Return Date]` `[🔍 Search]`
- Tab under search: `[✈ Visas]` (underline active tab)
- **Alliance Program Popup/Card**: Floating card (right side) — "Atlys Alliance Program" with badge illustration. "Introducing the VVisa Alliance Program" with benefit bullets and "Connect with the Alliance Specialist Team" CTA. Dismissible with × button.
- **Quick Stats Row** (below search): 3 cards — Total Applications, Approved This Month, Wallet Balance
- **Recent Applications** (below stats): Last 3-5 applications in compact list view

---

### PAGE 4: EXPLORE / VISA SEARCH RESULTS (`/explore`)
**Reference**: Country_category_page_after_selecting_county_and_date.pdf

#### Layout
Full content area (no hero). Sticky search bar at top (same inputs, always visible).

#### Results List
Each result is a category card with a colored header band:
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔵 Lighting Fast (6 Business Hours - Apply Before 11:30 AM)      │
│    Estimated visa arrival by 15th Apr, 2026 (date in indigo)     │
│─────────────────────────────────────────────────────────────────│
│ Entry   Validity   Duration   Documents       Processing Time     │
│ Single  30 days    30 days    [View Here ↗]   6 Business Hours   │
│                                                        ₹8,999 ℹ  [Select →] │
└─────────────────────────────────────────────────────────────────┘
```

- Header band color: **Blue** for fast-track, **Default/Purple** for standard, **Green** for multi-entry
- Price in bold right-aligned. Info `ℹ` tooltip with breakdown on hover
- `[Select →]` button (indigo outline → fills on hover)
- "View Here" opens a slide-over panel with document checklist

**Render at least 3 result cards** for Vietnam:
1. Lighting Fast (6 Business Hours) — ₹8,999
2. Evisa Vietnam 30 Days — ₹2,700
3. Vietnam 90 Days Multiple Entry E-Visa — ₹12,404

---

### PAGE 5: APPLICATION FORM (`/apply/[applicationId]`)
**Reference**: Business-atlys-agencies-customers-create-application-after_selecting_the_categary.pdf (9 pages)

#### Step 0 — Application Setup
- `"Are You Applying For"` — segmented control: `[Individual]` `[Group]`
- If Individual: Internal ID field + Group Name field
- Visa Type dropdown (pre-filled from previous selection)

#### Sidebar Progress Stepper (left panel, sticky)
Vertical stepper with all steps listed. Completed = green checkmark circle. Active = indigo filled circle. Future = gray empty circle.
```
✓ Internal ID
✓ Group Name
● Traveler 1
  ✓ Passport
  ○ Additional Questions
○ Traveler 2
○ Review
○ Submit
```

#### Traveler Section (main content, white card)
**Step: "Traveler 1" / "Traveler 2"**

**Subsection: Upload Passport**
- Instruction banner (amber): "Australia requires a scan of the traveler's passport. Upload a clear passport image and your details will be filled automatically. VVisa has built its own OCR which is 99.9% accurate. However, it is mandatory to review the information before submitting..."

Two-column layout:
- Left: Drag-and-drop upload zone (dashed border, upload icon, "Drag and drop files to upload" / "or" / `[Select file]` button). Accepts JPEG, JPG, PDF, PNG. Max 5MB.
- Right: Auto-populated passport fields:
  - Passport Number (with audio/scan icon)
  - First Name, Last Name
  - Nationality (dropdown), Sex (dropdown), Date of Birth (date picker)
  - Place of Birth
  - Place of Issue
  - Marital Status (dropdown), Date of Issue, Date of Expiry

**Subsection: Additional Required Questions**
Each document in a `<section>` with:
- Document title (bold, 16px)
- Optional: helper text in orange/amber
- Optional: `[Download format]` link in indigo
- Upload zone (same drag-drop pattern)

Documents for Australia Visitors Visa (Subclass 600):
1. National ID (Aadhar or PAN Card) — required ✱
2. Last 3 Years ITR — required ✱
3. Last 6 Months Bank Statement — required ✱ — "Please provide up to date e-statement only, with minimum of 5 Lakhs INR balance maintained for at least last 3 months."
4. Last 3 Months Salary Slip — "Please upload last 3 months salary slip, mandatory if traveller is employed."
5. Leave Letter from the Company or Letter of Employment — `[Download format]`
6. GST Certificate - Company Bank Statement 6 Months — "mandatory if the traveller is self employed or has own business"
7. COVID Vaccination Certificate
8. Marriage Certificate (Optional)
9. All Passport Old & New Used Pages Copies/Scanned Copies — required ✱
10. Covering Letter (Address to Australia High Commission, New Delhi) — required ✱ — `[Download format]`
11. Net Worth Certificate (Optional) — `[Download format]`
12. Other Saving & Investment (PPF, Fix Deposit, Shares) — "Consider filling this in case of not very strong bank balance."
13. Form 54 — required ✱ — `[Download format]`

**Add Traveler** button at bottom with `[+ Add Another Traveler]` and `[Review and Save →]`

**Also at bottom: `[Remove This Traveler]`** (destructive, outlined red)

#### Price Summary (right panel, sticky)
```
┌──────────────────┐
│ Price Details    │
│                  │
│ Traveler 1  ₹13,499 ▼ │
│ Traveler 2  ₹13,499 ▼ │
│ ─────────────────│
│ Total       ₹26,998 ▼ │
│ Current Wallet Balance ₹0 │
│                  │
│ [Review and Save →] │
└──────────────────┘
```

#### Visa Info + Know Before You Pay (bottom)
```
Visa Information:
Australia - Australia Visitors Visa (Subclass 600)
Travelers: 2
Travel Dates: Mar 9, 2026 - Mar 26, 2026

Expected Visa Approval:
📅 4/14/26, if submitted now!

Know Before You Pay:
○ Auto-validation upon submission
  Atlys performs automated validation...
○ Visa processed within 30 seconds
○ Non-refundable after you pay
  If canceled after payment, you will not be refunded.
```

---

### PAGE 6: APPLICATIONS LIST (`/applications`)
**Reference**: applications.pdf

#### Top area
- Page title: "Applications" (H1)
- Subtitle: "Track and manage visa applications"
- Search: `[🔍 Search name or passport]` `[📅 Travel date]` `[Destination ▼]`
- Tabs: `All (27)` | `Approved (25)` | `Pending Payment (2)` → each tab shows count badge

#### Application Cards — Two variants

**Variant A: Group Application Card** (most common)
```
┌──────────────────────────────────────────────────────────┐
│ SAPNA CHHAJER - C7612934 - Mar 24, 2026                   │
│ Created: Mar 7, 2026 at 6:43 PM                           │
│                                                           │
│ Vietnam                          Applicants: 8            │
│ Evisa Vietnam 30 Days            Approved: 8              │
│ Travel: Mar 24, 2026 → Apr 7, 2026                        │
│                                              [View Group →]│
└──────────────────────────────────────────────────────────┘
```

- Approved count shows a green `✓ Approved` badge
- `[View Group →]` button dark/black, rounded

**Variant B: Individual Application Card** (for approved visa — highlighted green banner)
```
┌─ VISA APPROVED ──────────────────────────────────────────┐
│ AKASH KOTHARI                                             │
│ Submitted: Mar 6, 2026 at 1:46 PM                        │
│ Passport: R1213598                                        │
│                                                           │
│ Vietnam — Visa: Evisa Vietnam 30 Days                     │
│ Travel: Feb 26, 2026 → Mar 12, 2026                      │
│ Reference No: E260308INDR12135939 7                       │
│                                                           │
│ Application Details:          Visa Approved Card:         │
│ ✅ Errors Fixed               ✅ Estimated on Mar 13, 2026│
│ ✅ Application Complete       ✅ Delivered on Mar 12, 2026│
│ ✅ Application Paid           ✓ before time               │
│ ✅ Submitted to Immigration                               │
│ ✅ Visa Approved                                         │
│                                                           │
│ [Generate Invoice] [View Application] [Download Visa ↓]  │
└──────────────────────────────────────────────────────────┘
```

- "VISA APPROVED" green banner at top with shield icon
- Green checkmarks for each milestone
- Delivered "before time" badge (green pill)
- 3 action buttons aligned right

#### Render in order:
1. All group cards first (Sapna Chhajer, Vishal Gireeya, Kaushik Jain)
2. Individual approved applications (Akash Kothari, Nisarga Shavahalli Prakash)
3. More group cards below

---

### PAGE 7: GROUP APPLICATION DETAIL (`/applications/[groupId]`)
**Reference**: groups-application-view_and_progress.pdf

#### Breadcrumb
`← Go back to main Dashboard` (link)

#### Header
```
SAPNA CHHAJER - C7612934 - Mar 24, 2026   🔒 Group Locked ℹ
Created On: Mar 7, 2026    Applicants: 8
```

#### Left Sidebar Filters
- Popular Filters accordion:
  - ☐ Visas Only
  - ☐ Date Created On
  - ☐ Departure Date
  - ☐ Destination Country

#### Top Actions Bar
- `[✓ Checking for visas...]` (animated spinner + text)
- `[↓ Download Group Invoice]`
- `[•••]` more options

#### Individual Application Cards (list)
Each traveler in the group shown as a "VISA APPROVED" card:
```
┌─ VISA APPROVED ─────────────────────────────────────────────────┐
│ HIYANSH AMIT CHHAJER    👶 Child                                 │
│ Submitted On: Mar 8, 2026 at 1:54 PM                            │
│ Passport Number: C7819328                                        │
│                                                                  │
│ Vietnam                                                          │
│ Visa: Evisa Vietnam 30 Days                                      │
│ Travel: Mar 24, 2026 → Apr 7, 2026                              │
│ Reference No: E260308INDC761612472                              │
│                                                                  │
│ Application Details:              Visa Approved Card:            │
│ ✅ Errors Fixed                   ✅ Estimated on Mar 13, 2026  │
│ ✅ Application Complete           ✅ Delivered on Mar 12, 2026  │
│ ✅ Application Paid               ✓ before time                  │
│ ✅ Submitted to Immigration                                      │
│ ✅ Visa Approved                                [Download Visa ↓]│
└─────────────────────────────────────────────────────────────────┘
```

Show 8 travelers: Hiyansh Amit Chhajer (Child), Pratiksha Jain, Mukesh Kumar, Sapna Chhajer, Hiyanshi Amit Chhajer (Child), Manya Bohra (Child), Purvansh Bohra (Child), Livi Chhajer (Child).

Child travelers get a 👶 badge next to name.

Error notification in top-right (toast): "Failed to check visa documents. Please refresh the page." with `[Retry]` button.

---

### PAGE 8: WALLET (`/wallet`)
**Reference**: wallet.pdf

#### Header
- Page title: "Wallet"
- Subtitle: "Manage your balance, deposits, and withdrawals"
- Current Balance (top right, large): `₹0.00`

#### Action Tabs
`[↓ Deposit]` (active, indigo) | `[↑ Withdraw]` | `[📋 Transactions]`

#### Warning Banner
Amber banner: "Please wait **30 min – 2 hrs** for payments to reflect. If not received in 2 hrs, check for a refund or **create a support ticket**."

#### Deposit Methods (Sub-tabs)
`[🏦 Bank Transfer (0% fee)]` | `[📱 UPI (0% fee)]` | `[💳 Credit Card (2% fee)]`

**Bank Transfer Tab:**
- Info text: "Only add money to the details below. VVisa is not responsible for transfers to other accounts."
- Two bank account cards side by side:

```
┌─────────────────────┐  ┌─────────────────────┐
│ VVisa Bank 1 [preferred]│  │ VVisa Bank 2         │
│ Account Number      │  │ Account Number      │
│ 1111232280258381... │  │ 2223228247548584    │
│ IFSC Code           │  │ IFSC Code           │
│ YESB0CHSN0C         │  │ UTIB000RAZP         │
│ Account Name        │  │ Account Name        │
│ VVisa               │  │ VVisa               │
└─────────────────────┘  └─────────────────────┘
```

- Tips box: "For instant transfers up to Rs. 2L, use IMPS. For larger transactions use NEFT."
- Footer note about adding as beneficiary

**UPI Tab:**
- UPI ID field with QR code
- Copy button

**Credit Card Tab:**
- Razorpay embedded form

---

### PAGE 9: ALLIANCE (`/alliance`)
**Reference**: alliance.pdf

#### Header
- Page title: "Alliance"
- Subtitle: "View and filter alliance links created for your clients"

#### Filters Bar
- `[Customer phone or name]` input
- `[Destination ▼]` dropdown
- `[📅 Travel On]` date filter
- `[📅 Created At]` date filter

#### Empty State (shown when no links)
- Centered email icon illustration
- `"No alliance links found"`
- `"No alliance links have been created yet."`
- `[+ Create Alliance Link]` indigo CTA

#### When populated (for preview/demo):
Table with columns: Customer, Destination, Travel On, Link, Created At, Actions

---

### PAGE 10: OVERSTAY (`/overstay`)
**Reference**: overstay.pdf

#### Header
- Page title: "Overstay"
- Subtitle: "Manage UAE overstay cases and history"

#### Tabs
`[Overstay]` (active) | `[History]`

#### Search + Table
- Search: `[🔍 Search names...]`
- Table columns: NAME ↕ | PASSPORT NUMBER | DAYS LEFT TO OVERSTAY ↕ | ENTRY DATE ↕ | STATUS | AMOUNT TO PAY | ACTIONS

#### Empty State
```
"No overstay cases"
"None of your travellers have overstayed or absconded."
```
Pagination footer: "Page 1 of 0"

---

### PAGE 11: PROFILE (`/profile`)
**Reference**: profile.pdf

#### Section 1: Agency Logo
- Upload zone for logo: "JPO, JPEG, PNG or SVG — max 1 MB"
- `[Choose file]` link
- Preview square (right side)

#### Section 2: Agency Information
- "Update your GST, PAN, and address details" subtitle
- Purple/indigo decorative gradient band (right edge)

**Basic Details:**
- Country: India (dropdown)
- Account Type: b2b (read-only)
- Contact Number: +918553094348

**Tax Details:**
- GST Number (text input)
- PAN Card (text input)

**Documents:**
- Warning: "GST Input Credit will not be available if the GST certificate is not uploaded." (amber banner)
- GST Certificate (PDF only) — upload zone
- Cancelled Cheque (JPG, PNG or PDF) — upload zone

**Address:**
- Address Line 1 (pre-filled)
- Address Line 2
- City, State (dropdown), Zip Code

`[💾 Save Changes]` button (dark, right-aligned)

#### Section 3: Aadhar Details
- "Identity verification information"
- Name as per Aadhar (read-only, shows —)
- Aadhar Number (read-only, shows —)
- Address (read-only, shows —)

---

## 🔄 KEY WORKFLOWS & BUSINESS LOGIC

### Application State Machine
```typescript
type ApplicationStatus =
  | 'DRAFT'           // Not yet submitted
  | 'RECEIVED'        // Submitted, not yet validated
  | 'VALIDATED'       // Passed automated checks
  | 'QUEUED'          // In processing queue
  | 'PAYMENT_PENDING' // Awaiting payment
  | 'PAID'            // Payment received
  | 'SUBMITTED'       // Submitted to immigration
  | 'OTP_PENDING'     // Waiting for embassy OTP
  | 'APPROVED'        // Visa approved
  | 'REJECTED'        // Visa rejected
  | 'FAILED'          // System error
  | 'CANCELLED'       // Cancelled by agent
```

### Passport OCR Flow
1. Agent uploads passport image to Firebase Storage
2. Call internal API `/api/ocr` with storage URL
3. Parse extracted fields (name, DOB, expiry, nationality, passport number)
4. Auto-populate form fields
5. Show "OCR confidence" indicator — fields auto-filled shown with light indigo background
6. Agent reviews + edits + confirms

### Wallet Flow
1. Agent initiates deposit (bank transfer / UPI / credit card)
2. Razorpay processes payment
3. Webhook updates Firestore wallet balance
4. Real-time balance update in UI (Firestore listener)
5. All visa payments deducted from wallet

### Group Application Flow
1. Agent searches destination + dates
2. Selects visa category
3. Chooses "Individual" or "Group"
4. For Group: adds multiple travelers (each with passport + docs)
5. Review page shows all travelers + total price
6. Pays from wallet or triggers Razorpay
7. System processes all travelers simultaneously
8. Status updates in real-time via Firestore listeners

---

## 🔒 AUTH & MIDDLEWARE

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/signup', '/pricing']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('vvisa-auth-token')
  const isPublicPath = PUBLIC_PATHS.some(path =>
    request.nextUrl.pathname === path
  )

  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}
```

---

## 🧩 KEY COMPONENTS — DETAILED SPECS

### `<StatusBadge status={status} />`
```typescript
const statusConfig = {
  APPROVED:  { label: 'Approved',  bg: 'bg-emerald-950', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  REJECTED:  { label: 'Rejected',  bg: 'bg-red-950',     text: 'text-red-400',     dot: 'bg-red-400' },
  PENDING:   { label: 'Pending',   bg: 'bg-amber-950',   text: 'text-amber-400',   dot: 'bg-amber-400' },
  SUBMITTED: { label: 'Submitted', bg: 'bg-blue-950',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  DRAFT:     { label: 'Draft',     bg: 'bg-gray-900',    text: 'text-gray-400',    dot: 'bg-gray-400' },
}
// Render: pill with animated dot + label + uppercase 11px caps font
```

### `<PassportUploader onExtracted={fields => void} />`
- Drag-and-drop zone with dashed border (dashes animate on drag-over)
- File type validation (JPEG, JPG, PDF, PNG, max 5MB)
- Upload progress bar (thin indigo line, bottom of zone)
- On complete: calls OCR API, returns extracted fields
- Shows thumbnail preview of uploaded document (blurred slightly for security)

### `<DocumentUploader label="" helperText="" required={bool} downloadFormat={url} />`
- Same drag-drop pattern as passport uploader
- Shows `[Download format]` link if `downloadFormat` prop provided
- Helper text in amber below label
- Required asterisk (`✱`) in red next to label

### `<ApplicationTimeline steps={[]} />`
Vertical timeline component:
```
● Errors Fixed         ✅
● Application Complete ✅
● Application Paid     ✅
● Submitted to Immigration ✅
● Visa Approved        ✅
```
Each step: dot (colored by status) + label + timestamp on hover

### `<DataTable columns={[]} data={[]} />`
- Sortable columns with ↕ icon
- Search/filter integration
- Pagination (page X of Y)
- Row hover highlight
- Empty state slot

---

## 📱 RESPONSIVE BEHAVIOR

### Breakpoints
- **Mobile** (< 768px): Single column, bottom tab nav replaces sidebar, search stacks vertically
- **Tablet** (768–1024px): Sidebar collapses to icon-only (48px), main content adapts
- **Desktop** (> 1024px): Full sidebar (240px) + content area + optional right panel

### Sidebar Mobile
- Drawer pattern: swipe-right or hamburger button opens full sidebar
- Overlay backdrop, Framer Motion slide-in from left

### Forms on Mobile
- Full-width inputs
- Date pickers: native mobile picker
- Upload zones: tap to open file picker (no drag-drop)

---

## ⚡ PERFORMANCE REQUIREMENTS

- **LCP** < 2.5s on 4G
- **INP** < 200ms
- **CLS** < 0.1
- All images: `next/image` with `priority` for above-fold
- Route prefetching: `next/link` default behavior
- Code splitting: dynamic imports for heavy components (passport uploader, document viewer)
- Suspense boundaries with skeleton loaders on all data-fetching pages

---

## 🌐 SEO & METADATA

```typescript
// app/layout.tsx
export const metadata = {
  title: {
    template: '%s | VVisa Business',
    default: 'VVisa Business — Best Prices, Effortless Bookings',
  },
  description: 'India\'s most trusted B2B visa platform for travel agencies. 500,000+ visas delivered. 65 visa types. 5,000+ agents.',
  keywords: ['visa for travel agents', 'b2b visa platform', 'bulk visa applications', 'india visa services'],
  openGraph: {
    siteName: 'VVisa Business',
    locale: 'en_IN',
  },
}
```

---

## 🧪 MOCK DATA FOR DEMO

Seed the app with realistic dummy data:

**Agencies**: "Vindox Travels", "Sapna Tours", "Delhi Dreams Travel"
**Applications**: Mix of Vietnam, Australia, UAE, Singapore visas in various states
**Wallet**: Starting balance ₹28,040 with 10 historical transactions
**Travelers**: 5-8 travelers across 3-4 group applications

All dummy data in `/lib/mock-data.ts` — toggle via `NEXT_PUBLIC_USE_MOCK_DATA=true` env var.

---

## 🚀 ENVIRONMENT VARIABLES

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_GTM_ID=

# App
NEXT_PUBLIC_APP_URL=https://business.vvisa.in
NEXT_PUBLIC_USE_MOCK_DATA=true
```

---

## ✅ ACCEPTANCE CRITERIA

Before considering the build complete, verify:

1. [ ] All 11 pages render without errors in production build
2. [ ] Auth flow: signup → login → dashboard → logout works end-to-end
3. [ ] Application form: can add 2 travelers, upload documents, reach review page
4. [ ] Wallet page: deposit flow initiates Razorpay checkout
5. [ ] Applications list: search, filter, pagination all functional
6. [ ] Group detail: all 8 travelers shown with correct data
7. [ ] Mobile responsive: all pages usable on 375px viewport
8. [ ] Dark mode: all text readable, no pure white backgrounds
9. [ ] Framer Motion: page transitions, card hovers, accordion animations all smooth
10. [ ] TypeScript: `tsc --noEmit` passes with zero errors

---

## 🎁 BONUS FEATURES (implement if time permits)

1. **Passport Scanner Widget**: Live camera mode — agent holds phone to passport, real-time OCR extracts fields
2. **Bulk Application Upload**: CSV upload for 500 travelers at once — parse, validate, create group application
3. **Visa Status Tracker**: Public shareable link for end-customer to track their visa
4. **AI Checklist Generator**: Based on destination country, auto-generates required document checklist with explanations
5. **Invoice PDF Generator**: One-click GST invoice download for any application (use `@react-pdf/renderer`)

---

*Built for India 🇮🇳 | business.vvisa.in | VVisa AI Platform — Powered by the VVisa AI Orchestration Engine*
