# 🥯 Bagel Board

Real-time breakfast ordering system for BNSS Student Gov. Three modes: **Waiter**, **Kitchen Display**, and **Pre-order**.

## Stack

- SvelteKit
- Supabase (PostgreSQL + Real-time)
- Tailwind CSS

## Setup

```bash
npm install
```

Create `.env`:
```
PUBLIC_SUPABASE_URL=your-project-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev
```

## Modes

| Mode | Access | Purpose |
|------|--------|---------|
| `/` | PIN | Waiter — manage tables, check in teachers, take orders |
| `/kds` | PIN | Kitchen — real-time order queue with countdown timers |
| `/preorder` | Public | Teachers pre-order before arriving |
| `/settings` | PIN | Admin — session management, system config |

## License

MIT
