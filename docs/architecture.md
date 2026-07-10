# Architecture

Matchday Ops AI uses a small full-stack TypeScript architecture:

- `src/client`: React command dashboard and accessible operator workflows.
- `src/server`: Express API, security middleware, AI adapter, analytics, and route planning.
- `src/shared`: Zod schemas, shared types, and constants used by both sides.
- `tests`: unit, API, and accessibility tests.

## Challenge 4 alignment

The product is scoped directly to **[Challenge 4] Smart Stadiums & Tournament Operations** for **FIFA World Cup 2026**. The shared constants, README, UI header, and AI prompt all carry the same challenge context so the implementation stays anchored to stadium operations, navigation, crowd management, accessibility, transportation, sustainability, multilingual assistance, operational intelligence, and real-time decision support for fans, organizers, volunteers, and venue staff.

## Data flow

1. Demo stadium data is stored in `src/server/data/stadium.ts`.
2. `buildSnapshot` computes risk, staffing, queue, accessibility, and sustainability metrics.
3. The React app requests `/api/stadium/snapshot` and renders the command view.
4. Operators submit route requests to `/api/routes/plan`.
5. Operators submit decision requests to `/api/operations/decision`.
6. The AI service either calls Gemini with grounded JSON context or returns deterministic demo-safe guidance.
7. All AI output is validated before the API responds.

## Operational signals

The command view deliberately shows incident, transport, and sustainability signals alongside the map. This keeps the experience aligned to real venue work: crowd decisions should consider arrival pressure, accessible services, water and waste operations, and current incident ownership, not only density on a map.

## Safety boundary

The system does not automate enforcement, surveillance, or crowd-control actions. It gives recommended next steps to staff, records assumptions in the briefing UI, and labels the interface as human approved. This keeps the solution aligned with responsible AI expectations for high-density public venues.
