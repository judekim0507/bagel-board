# Bagel Board - Implementation Plan

## System Overview

**Bagel Board** is a breakfast ordering system for school staff with three modes:

1. **Waiter Mode** (PIN-protected)
   - Staff manages 22 tables, 8 seats each
   - Check in teachers, assign seats
   - Take orders with toppings/allergy customization
   - View table occupancy at a glance
   - "Ready to Serve" indicator when kitchen marks order ready

2. **KDS Mode** (Kitchen Display System, PIN-protected)
   - Real-time order display with 2-minute countdown timers
   - Auto-prioritized by time remaining (least time first)
   - Visual/audio alerts for new orders
   - "Mark Ready" button when food is complete

3. **Pre-order Mode** (Public access)
   - Teachers submit orders before arrival
   - Orders linked to teacher, seat assigned at check-in
   - Auto-loaded when teacher checks in

---

## Technology Stack

**Frontend & Backend:**
- SvelteKit (full-stack framework)
- Tailwind CSS (styling)

**Database & Real-time:**
- Supabase (hosted PostgreSQL + real-time subscriptions)
- No Prisma, no custom WebSockets - native Supabase

**Deployment:**
- Vercel (recommended)

---

## Architecture

### Data Flow
```
Client Actions (Create/Update/Delete)
    ↓
API Endpoints (validation, business logic)
    ↓
Supabase Database
    ↓
Supabase Realtime (auto-broadcast changes)
    ↓
All Connected Clients (instant updates)
```

### Security Model
- **API Endpoints:** Validate all writes, enforce business rules
- **Server-side Supabase client:** Uses service role key (elevated privileges)
- **Client-side Supabase client:** Uses anon key (read-only for real-time)
- **PIN Protection:** Waiter and KDS modes require 4-digit PIN

---

## Database Schema

### Core Tables

**teachers**
- Teacher info (name, dietary notes)

**menu_items**
- Breakfast items (meals + individual items)
- Categories, availability

**tables** (22 physical tables)
- Table number, links to teacher

**seats** (8 per table = 176 total)
- Links to table, position 1-8

**seat_assignments**
- Who's sitting where, session date, check-in time

**orders**
- Teacher, seat, status (pending/preparing/ready/served)
- Special requests, timer start time

**order_items**
- Items in each order
- Quantity, toppings (JSONB), notes

**pre_orders**
- Orders submitted before arrival
- Links to teacher, fulfilled flag

**pre_order_items**
- Items in pre-orders

**system_config**
- PINs, settings (key-value pairs)

**devices** (audit trail)
- Unique device ID (generated on first use)
- Device nickname (e.g., "iPad 1 - Server Station")
- Last used timestamp
- Links to orders/seat assignments created from this device

### Real-time Enabled Tables
- **orders** - Broadcasts to KDS when new order created
- **seat_assignments** - Updates waiter mode when teachers checked in

### Device Tracking
Every order and seat assignment includes:
- `device_id` - Unique identifier for the iPad/device used
- Generated on first app visit, stored in localStorage
- Allows auditing: "Which device created this order?"
- No login required, just tracks device fingerprint

---

## File Structure

```
order-system/
├── supabase/
│   └── types.ts                   # Auto-generated from database
├── src/
│   ├── lib/
│   │   ├── supabase.ts            # Client-side Supabase
│   │   ├── server/
│   │   │   ├── supabase.ts        # Server-side Supabase (elevated)
│   │   │   └── auth.ts            # PIN verification
│   │   ├── stores/
│   │   │   ├── orders.ts          # Real-time order updates
│   │   │   └── seats.ts           # Real-time seat updates
│   │   └── components/
│   │       ├── PinPad.svelte
│   │       ├── ModeSelector.svelte
│   │       ├── waiter/            # Table/seat management
│   │       ├── kds/               # Kitchen display
│   │       ├── preorder/          # Pre-order form
│   │       └── shared/            # Reusable UI
│   ├── routes/
│   │   ├── +page.svelte           # Mode selector home
│   │   ├── waiter/                # Waiter mode pages
│   │   ├── kds/                   # KDS mode pages
│   │   ├── preorder/              # Pre-order pages
│   │   ├── admin/                 # Admin dashboard
│   │   └── api/                   # API endpoints (validation layer)
│   │       ├── auth/verify-pin/
│   │       ├── orders/
│   │       ├── seats/assign/
│   │       ├── preorders/
│   │       └── admin/reset-session/
│   └── app.html
├── static/
│   └── sounds/
│       └── new-order.mp3          # Alert sound
└── .env                           # Supabase credentials
```

---

## Implementation Phases

### Phase 1: Foundation
**Goal:** Get Supabase + SvelteKit running with database

**Tasks:**
- Create Supabase project
- Run SQL schema in Supabase SQL Editor
- Seed data (22 tables, 176 seats, menu items, PINs, teachers)
- Initialize SvelteKit project
- Install dependencies (@supabase/supabase-js, Tailwind)
- Create Supabase clients (client + server)
- Generate TypeScript types from database
- Setup device ID generator (creates unique ID on first visit, stores in localStorage)

**Validation:** Database tables visible in Supabase, SvelteKit dev server running, device ID persists across page reloads

---

### Phase 2: Real-time Infrastructure
**Goal:** Setup Supabase Realtime subscriptions

**Tasks:**
- Create real-time store for orders (subscribes to INSERT/UPDATE/DELETE)
- Create real-time store for seat assignments
- Enable realtime on orders and seat_assignments tables
- Test subscriptions (insert test order in Supabase → appears in app)

**Validation:** Changes in Supabase Table Editor appear instantly in app

---

### Phase 3: Authentication & Mode Selection
**Goal:** Home screen with PIN protection

**Tasks:**
- Build mode selector (3 big buttons: Waiter / KDS / Pre-order)
- Create PIN pad component (numeric keypad, 4 digits)
- Build PIN verification API endpoint
- Setup session cookies for auth
- Route protection (redirect if no PIN)

**Validation:** Waiter/KDS require PIN, pre-order accessible without PIN

---

### Phase 4: Waiter Mode - Table & Seat Management
**Goal:** View tables, assign teachers to seats

**Tasks:**
- Build table grid (22 tables, show occupancy count)
- Table zoom animation (scale transition when clicked)
- Seat grid (8 seats in circular/grid layout)
- Seat status: empty (gray, shows number) vs assigned (shows teacher name)
- Teacher picker modal
- Seat assignment API endpoint (includes device_id in payload)
- Real-time: see seat assignments update across devices
- Device tracking: log which iPad assigned each teacher

**Validation:** Can assign teachers, see names on seats, real-time updates work, device ID saved with assignment

---

### Phase 5: Waiter Mode - Order Creation
**Goal:** Take orders from seated teachers

**Tasks:**
- Order form with menu item selection
- Grouped by category (Meals vs Items)
- Add to cart functionality
- Topping selector (checkboxes)
- Allergy/special requests textarea
- Order creation API endpoint (includes device_id in payload)
- Device tracking: log which iPad created each order
- "Ready to Serve" indicator on waiter screen (shows when kitchen marks ready)
- Real-time: KDS receives order instantly, waiter sees when ready

**Validation:** Orders created, appear on KDS immediately, "Ready to Serve" shows when marked ready, device ID saved

---

### Phase 6: KDS Mode - Display & Timers
**Goal:** Kitchen sees orders with countdown timers

**Tasks:**
- Load active orders (pending/preparing)
- Display order tickets: table #, seat #, teacher, items, toppings, allergies
- 2-minute countdown timer (starts at order submission)
- Color coding: green (>60s), yellow (30-60s), red (<30s)
- Sort by time remaining (least time = highest priority)
- Pulse animation for urgent orders
- New order alert (sound + banner)
- "Mark Ready" button (kitchen clicks when food is done)
- Real-time: updates when waiter creates orders

**Validation:** Orders display, timers count down, "Mark Ready" works, priority sorting works, alerts fire

**Note:** Waiter screen (Phase 5) will show "Ready to Serve" indicator when kitchen marks order ready

---

### Phase 7: Pre-order Mode
**Goal:** Teachers order before arrival

**Tasks:**
- Teacher selection dropdown (no password)
- Same menu/cart interface as waiter mode (they don't choose the seat beforehand)
- Pre-order submission API endpoint (includes device_id)
- Pre-order storage (not linked to seat yet)
- Device tracking: log which device teacher used for pre-order
- Integration: when teacher assigned to seat in waiter mode, check for pre-order
- Prompt: "Teacher has pre-order, load it?" → auto-create order from pre-order

**Validation:** Pre-orders saved, loaded at check-in, converted to orders, device ID tracked

---

### Phase 8: Admin Interface
**Goal:** Manage teachers, menu, PINs, reset session

**Tasks:**
- Admin dashboard (PIN-protected)
- Teacher CRUD (add/edit/delete teachers)
- Menu CRUD (manage menu items, availability)
- Device management (view all devices, set nicknames like "iPad 1 - Server")
- Audit log (view orders/assignments by device)
- Settings page (change PINs)
- Session reset button (check out all seats, mark orders served)
- Stats display (today's orders, active tables, orders by device)

**Validation:** Can manage data, session reset clears assignments, can view audit trail by device

---

### Phase 9: UI Polish
**Goal:** Smooth animations, responsive design

**Tasks:**
- Table zoom animation (Svelte scale transition)
- Seat status fade transitions
- KDS order slide-in animation
- Toast notifications for success/errors
- Loading states on all API calls
- Responsive layouts (works on tablets for KDS)
- Tailwind theme (colors, spacing)

**Validation:** Animations smooth, works on different screen sizes

---

### Phase 10: Testing & Deployment
**Goal:** Production-ready system

**Tasks:**
- End-to-end testing (pre-order → check-in → order → KDS → complete)
- Concurrent user testing (multiple tables ordering simultaneously)
- Real-time resilience testing (network drop/reconnect)
- Load testing (all 176 seats ordering)
- Build for production
- Deploy to Vercel
- Configure environment variables

**Validation:** All flows work, production deployment successful

---

## Key Features by Mode

### Waiter Mode
- 22 table grid with occupancy indicators
- Zoom into table → see 8 seats
- Click empty seat → assign teacher
- Click assigned seat → take order
- "Ready to Serve" indicator (when kitchen marks ready)
- Real-time seat updates
- Table animations

### KDS Mode
- Real-time order feed
- 2-minute countdown timers per order (informational)
- "Mark Ready" button (kitchen clicks when done)
- Priority sorting (least time first)
- Visual alerts (color-coded urgency)
- Audio alerts (new order sound)
- Order details (items, toppings, allergies)

### Pre-order Mode
- Teacher self-selection
- Full menu browsing
- Customization (toppings, allergies)
- Order confirmation
- Auto-load at check-in

### Admin Mode
- Teacher management
- Menu management
- Device management (nickname devices, view audit trail)
- PIN configuration
- Session reset
- Stats dashboard (orders by device, most active iPads)

---

## Critical Design Decisions

### 1. Supabase vs Custom Backend
**Decision:** Use Supabase
**Rationale:**
- Hosted database (no DevOps)
- Real-time built-in (no WebSocket code)
- Auto-generated types (type safety)
- Free tier sufficient for school use

### 2. API Endpoints vs Direct Supabase
**Decision:** Hybrid approach
**Rationale:**
- Writes through API (validation, security)
- Reads can be direct or through API
- Real-time subscriptions direct (read-only, safe)

### 3. PIN Auth vs Full Auth System
**Decision:** Simple PIN
**Rationale:**
- School staff environment (trusted)
- Quick access (no login flow)
- Sufficient security for non-sensitive data
- Pre-order mode needs zero friction

### 4. Real-time Priority
**Decision:** Essential for KDS and Waiter Mode
**Rationale:**
- Kitchen needs instant order visibility
- Waiter staff need to see seat assignments and "Ready to Serve" status
- Prevents order delays
- Better UX (no manual refresh)

### 5. Timer Priority Sorting
**Decision:** Sort by time remaining (least first)
**Rationale:**
- Urgent orders at top
- Prevents any order from being forgotten
- Kitchen focuses on what's about to burn

### 6. Device Tracking (No Login)
**Decision:** Generate unique device ID, no user login
**Rationale:**
- Audit trail without friction (no login required)
- Track which iPad created each order/assignment
- Useful for accountability ("Which device had the issue?")
- Device nicknames help identify physical iPads
- No privacy concerns (just tracking devices, not users)

---

## Success Metrics

**Functional:**
- ✅ All 22 tables, 176 seats operational
- ✅ Orders appear on KDS within 1 second
- ✅ Timers accurate to ±2 seconds
- ✅ Pre-orders successfully loaded 100% of time
- ✅ PIN auth works, session persists 8 hours

**Performance:**
- ✅ Page load <2 seconds
- ✅ Real-time latency <1 second
- ✅ Handles 50+ concurrent orders
- ✅ No crashes during peak usage

**UX:**
- ✅ Staff can check in teacher in <30 seconds
- ✅ Taking order takes <2 minutes
- ✅ KDS readable from 10 feet away
- ✅ Animations smooth (60fps)

---

## Estimated Effort

**Complexity:** Medium full-stack app
**Lines of Code:** ~3,500-4,500 LOC
**Development Time:** 3-5 days (experienced dev)

**Breakdown:**
- Phase 1-3: 1 day (setup + auth)
- Phase 4-5: 1 day (waiter mode)
- Phase 6: 1 day (KDS with timers + mark ready)
- Phase 7-8: 1 day (pre-order + admin)
- Phase 9-10: 1 day (polish + deploy)

---

## Next Steps

1. Review & approve this plan
2. Confirm UI design direction (colors, layout preferences)
3. Begin Phase 1 (Supabase + SvelteKit setup)
4. Iterate phase by phase with user feedback

Ready to build Bagel Board! 🥯
