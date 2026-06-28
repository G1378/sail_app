# Sailing Session Planner

A modern dinghy sailing session planning interface for Senior Instructors.
Built with Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui patterns, Framer Motion, and @dnd-kit.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Base styles, Inter font, scrollbar
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main planning page (root state)
├── components/
│   ├── ui/
│   │   ├── Avatar.tsx       # Initials avatar with deterministic colour
│   │   ├── Badge.tsx        # Small pill badge
│   │   └── Toast.tsx        # Animated toast notification
│   ├── SessionHeader.tsx    # Top bar: title, weather, objective, actions
│   ├── LeftSidebar.tsx      # Sailor stats, fleet, instructors, notes
│   ├── PlanningBoard.tsx    # DnD grid of boat cards
│   ├── BoatCard.tsx         # Individual sortable boat card
│   ├── RightSidebar.tsx     # Summary, weather safety, recommendations
│   └── SailorPool.tsx       # Collapsible bottom panel of sailor chips
├── data/
│   └── session.ts           # All mock data (boats, sailors, weather, recs)
├── lib/
│   └── utils.ts             # cn(), colour helpers, status config
└── types/
    └── index.ts             # TypeScript interfaces
```

## Features

- **Drag-and-drop board** — reorder boat cards using @dnd-kit/sortable
- **Collapsible sailor pool** — animated panel at the bottom
- **Live stats** — right sidebar updates as boats change
- **Framer Motion** — hover lifts, card entry animations, capacity bar fills
- **Weather summary** — placeholder pills ready for real API data
- **Session notes** — free-text field in the left sidebar
- **Toast notifications** — for Generate Allocation and Save actions

## Extending

- Wire `onBoatsChange` in `PlanningBoard` to persist state (Zustand, server actions, etc.)
- Replace `SESSION_DATA` in `src/data/session.ts` with a real API fetch
- Add drag-from-pool logic: sailors in `SailorPool` can be dropped onto a `BoatCard`
- The `Boat` interface in `src/types/index.ts` is the contract — extend freely
