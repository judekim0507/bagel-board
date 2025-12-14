# 🥯 Bagel Board

A modern, real-time breakfast ordering system for school staff with three integrated modes: **Waiter**, **Kitchen Display**, and **Pre-order**.

Built with **SvelteKit** and **Supabase** for seamless real-time updates and beautiful UX.

---

## ✨ Features

### 🎯 Three Modes

1. **Waiter Mode** (PIN-protected)
   - Manage 22 tables with 8 seats each (176 total)
   - Visual table occupancy at a glance
   - Check in teachers and assign seats
   - Take customized orders with toppings and special requests
   - "Ready to Serve" indicators when kitchen completes orders
   - Auto-load pre-orders when teachers check in
   - Real-time updates across all devices

2. **Kitchen Display System (KDS)** (PIN-protected)
   - Real-time order feed with instant updates
   - 2-minute countdown timers for each order
   - Auto-priority sorting (most urgent orders first)
   - Visual urgency indicators (green → orange → red)
   - Shows teacher names, dietary restrictions, table/seat numbers
   - "Mark Ready" workflow to notify waiters
   - Audio alerts for new orders
   - Toppings and special requests clearly displayed

3. **Pre-order Mode** (Public access)
   - Teachers order before arrival
   - Full menu browsing with customization
   - Orders auto-load when checking in
   - Mobile-friendly interface
   - No login required

### 🔥 Key Capabilities

- ⚡ **Real-time synchronization** across all devices
- 🎨 **Beautiful, intuitive UI** with smooth animations
- 📱 **Responsive design** for tablets and mobile
- 🔔 **Toast notifications** for all actions
- 🎵 **Audio alerts** for new orders in kitchen
- 🏷️ **Dietary notes** prominently displayed
- 🎯 **Topping customization** with visual selection
- 📊 **Admin dashboard** with session management
- 🔐 **PIN protection** for staff areas
- 📦 **Device tracking** for audit trails

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works great)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up Supabase:**

Create a Supabase project at [supabase.com](https://supabase.com)

3. **Configure environment variables:**

Create `.env` file:
```env
PUBLIC_SUPABASE_URL=your-project-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. **Run the database seed:**

Copy the contents of `supabase/seed.sql` and run it in your Supabase SQL Editor. This will:
- Create 30 sample teachers
- Set up 22 tables with 8 seats each (176 total)
- Add 21 menu items (meals, items, drinks) with pricing
- Configure system PINs (default: 1234)

5. **Start the development server:**
```bash
npm run dev
```

Visit `http://localhost:5173` and log in with PIN `1234`

---

## 📖 User Guide

### For Waiters

**Checking in a Teacher:**
1. Select the table on the grid
2. Click an empty seat
3. Search for and select the teacher
4. If they have a pre-order, it auto-loads to kitchen
5. Otherwise, take their order using the menu interface

**Taking an Order:**
1. Click an occupied seat (shows teacher name)
2. Browse menu by category (Meals, Items, Drinks)
3. Click items to customize with toppings
4. Add special requests or allergy notes
5. Review cart and submit order

**Ready to Serve:**
- Seats turn green and pulse when kitchen marks order ready
- Click to view order details or take additional orders

### For Kitchen Staff

**Processing Orders:**
1. Orders appear automatically in real-time
2. Most urgent orders (least time remaining) show first
3. Visual urgency: Green (new) → Orange (>1min) → Red (>2min)
4. View teacher dietary notes prominently
5. Click "Mark Ready to Serve" when food is done
6. Order moves to waiter screen for pickup

**Priority System:**
- Orders auto-sort by time remaining
- Overdue orders pulse and show "URGENT"
- Ready orders move to the end

### For Teachers

**Pre-ordering:**
1. Visit `/preorder` (shareable link in admin)
2. Select your name from the list
3. Browse menu and customize items
4. Add toppings and special requests
5. Submit pre-order
6. Your order auto-loads when you check in

### For Administrators

**Session Management:**
1. Navigate to Settings → Session Management
2. View current session stats
3. Reset session at end of meal service (checks out all, marks orders served)

**Pre-order Setup:**
1. Settings → Pre-order Mode
2. Copy public link to share with teachers
3. View how pre-orders work

**System Overview:**
- View today's order count
- Monitor active seat assignments
- Check system health
- Quick actions (refresh, lock app)

---

## 🏗️ Architecture

### Tech Stack

- **Frontend/Backend:** SvelteKit (full-stack)
- **Database:** Supabase (PostgreSQL + Real-time)
- **Styling:** Tailwind CSS
- **Notifications:** svelte-sonner

### Data Flow

```
Client Action (Create/Update)
    ↓
API Endpoint (validation)
    ↓
Supabase Database
    ↓
Real-time Broadcast
    ↓
All Connected Clients (instant update)
```

### Database Schema

**Core Tables:**
- `teachers` - Staff members with dietary notes
- `tables` - 22 physical tables
- `seats` - 8 seats per table (176 total)
- `menu_items` - Breakfast items with pricing and topping configs
- `orders` - Order records with status tracking
- `order_items` - Line items with toppings (JSONB)
- `seat_assignments` - Teacher-to-seat mappings
- `pre_orders` - Orders submitted before arrival
- `pre_order_items` - Pre-order line items
- `devices` - Device tracking for audit trail
- `system_config` - System settings (PINs, etc.)

**Real-time Subscriptions:**
- `orders` - Kitchen receives new orders instantly
- `seat_assignments` - Waiters see check-ins across devices

---

## 🎨 Design Philosophy

### UX Principles

1. **Speed First** - Every action completes in <500ms
2. **Visual Clarity** - Color-coded urgency, large touch targets
3. **Forgiving** - Easy undo, clear confirmation dialogs
4. **Delightful** - Smooth animations, satisfying interactions
5. **Accessible** - High contrast, large fonts, clear hierarchy

### Color System

- **Orange** (`#f97316`) - Primary actions, occupied seats, prices
- **Green** (`#10b981`) - Ready to serve, success states
- **Red** (`#ef4444`) - Urgent orders, warnings
- **Zinc** (`#27272a` - `#fafafa`) - UI framework

---

## 🔧 Configuration

### Changing PINs

PINs are stored in the `system_config` table:
```sql
UPDATE system_config SET value = '9876' WHERE key = 'waiter_pin';
UPDATE system_config SET value = '5432' WHERE key = 'kds_pin';
UPDATE system_config SET value = '0000' WHERE key = 'admin_pin';
```

### Adding Teachers

Via Supabase UI or SQL:
```sql
INSERT INTO teachers (name, dietary_notes) VALUES
  ('Jane Doe', 'Vegan'),
  ('John Smith', NULL);
```

### Customizing Menu

Edit `supabase/seed.sql` or manage via Supabase UI:
```sql
INSERT INTO menu_items (name, category, price, available, toppings_config) VALUES
  ('Avocado Toast', 'item', 5.50, true, '{
    "customizable": true,
    "options": ["Poached Egg", "Cherry Tomatoes", "Everything Seasoning"]
  }'::jsonb);
```

---

## 📁 Project Structure

```
bagel-board/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Modal.svelte          # Reusable modal
│   │   │   ├── OrderInterface.svelte # Order form with customization
│   │   │   ├── PinProtection.svelte  # PIN entry screen
│   │   │   └── BottomNav.svelte      # Navigation bar
│   │   ├── stores/
│   │   │   ├── auth.ts              # PIN authentication
│   │   │   ├── realtime.ts          # Supabase real-time subscriptions
│   │   │   ├── teachers.ts          # Teacher data
│   │   │   └── menu.ts              # Menu items
│   │   ├── utils/
│   │   │   └── device.ts            # Device ID generation
│   │   ├── supabase.ts              # Supabase client
│   │   └── database.types.ts        # Auto-generated types
│   ├── routes/
│   │   ├── +page.svelte             # Waiter Mode
│   │   ├── kds/+page.svelte         # Kitchen Display System
│   │   ├── preorder/+page.svelte    # Pre-order Mode
│   │   ├── settings/+page.svelte    # Admin Dashboard
│   │   └── api/
│   │       ├── orders/+server.ts
│   │       ├── orders/status/+server.ts
│   │       ├── seats/assign/+server.ts
│   │       └── preorders/+server.ts
│   └── app.css                      # Tailwind styles
├── supabase/
│   └── seed.sql                     # Database initialization
├── static/
│   └── sounds/
│       └── README.txt               # Audio notification placeholder
├── PLAN.md                          # Original implementation plan
└── README.md                        # This file
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect your repository to Vercel**
2. **Add environment variables:**
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
3. **Deploy!**

The app will build and deploy automatically. Vercel handles SvelteKit adapters perfectly.

### Alternative Platforms

Works on any platform that supports SvelteKit:
- Netlify
- Cloudflare Pages
- Node.js hosting

---

## 🎯 Workflow Examples

### Morning Breakfast Service

1. **6:00 AM** - Admin resets session from previous day
2. **6:30 AM** - Teachers start arriving and checking in
3. **Waiter assigns teachers to seats** - pre-orders auto-load
4. **Kitchen receives orders** in real-time
5. **Orders countdown from 2:00** - kitchen prioritizes urgent ones
6. **Kitchen marks orders ready** - waiter sees green indicators
7. **Food delivered** - process repeats
8. **9:00 AM** - Service ends, admin resets session

### Pre-order Flow

1. **Teacher visits `/preorder` on phone night before**
2. **Selects name** from teacher list
3. **Browses menu** and customizes items
4. **Submits pre-order**
5. **Next morning**, teacher checks in at table
6. **Waiter assigns seat** - pre-order auto-loads to kitchen
7. **Kitchen starts preparing** immediately
8. **Teacher gets food faster!**

---

## 🔐 Security Notes

- **PIN Protection:** Simple 4-digit PINs for trusted staff environment
- **Anon Key:** Client uses Supabase anon key (read-only for real-time)
- **API Validation:** All writes go through API endpoints with validation
- **Device Tracking:** Audit trail without requiring user login
- **No Sensitive Data:** No payment info, just breakfast orders

---

## 🐛 Troubleshooting

**Orders not appearing in KDS:**
- Check real-time is enabled in Supabase for `orders` table
- Verify `created_at` is being set on orders
- Check browser console for errors

**Pre-orders not loading:**
- Ensure teacher_id matches exactly
- Check `fulfilled` flag is false
- Verify API endpoint `/api/preorders` is accessible

**Seats not showing teacher names:**
- Verify `seat_assignments` has `active = true`
- Check teacher_id foreign key relationship
- Ensure real-time subscription is active

**Audio not playing:**
- User must interact with page first (browser security)
- Add actual `new-order.mp3` file to `/static/sounds/`
- Check browser audio permissions

---

## 📝 TODO / Future Enhancements

- [ ] Replace placeholder audio file with actual notification sound
- [ ] Add admin CRUD interfaces for teachers and menu
- [ ] Implement print receipt functionality
- [ ] Add daily/weekly reporting dashboard
- [ ] Support for multiple meal services (breakfast, lunch)
- [ ] QR code generation for table pre-order links
- [ ] Multi-language support
- [ ] Dark/light theme toggle

---

## 🤝 Contributing

This is a school project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - feel free to use this for your own school or organization!

---

## 🙏 Acknowledgments

Built with:
- [SvelteKit](https://kit.svelte.dev) - Amazing full-stack framework
- [Supabase](https://supabase.com) - Incredible real-time database
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS
- [svelte-sonner](https://svelte-sonner.vercel.app) - Beautiful toast notifications

---

## 📞 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review PLAN.md for architectural decisions
3. Open an issue on GitHub

---

**Happy breakfast serving! 🥯☕️**
