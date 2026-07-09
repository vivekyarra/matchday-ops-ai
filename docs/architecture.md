# Architecture

Matchday Ops AI uses a small full-stack TypeScript architecture:

- `src/client`: React command dashboard and accessible operator workflows.
- `src/server`: Express API, security middleware, AI adapter, analytics, and route planning.
- `src/shared`: Zod schemas, shared types, and constants used by both sides.
- `tests`: unit, API, and accessibility tests.

## Data flow

1. Demo stadium data is stored in `src/server/data/stadium.ts`.
2. `buildSnapshot` computes risk, staffing, queue, accessibility, and sustainability metrics.
3. The React app requests `/api/stadium/snapshot` and renders the command view.
4. Operators submit route requests to `/api/routes/plan`.
5. Operators submit decision requests to `/api/operations/decision`.
6. The AI service either calls Gemini with grounded JSON context or returns deterministic demo-safe guidance.
7. All AI output is validated before the API responds.

## Safety boundary

The system does not automate enforcement, surveillance, or crowd-control actions. It gives recommended next steps to staff and labels the interface as human approved. This keeps the solution aligned with responsible AI expectations for high-density public venues.
