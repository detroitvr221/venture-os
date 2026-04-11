# ADR-001: Monorepo Structure with Turborepo + pnpm

## Status
Accepted

## Context
North Bridge Digital is a complex platform with multiple packages (shared types, database layer, agent orchestration, services, integrations) that need to share code and stay in sync. We need a build system that supports incremental builds, dependency management, and a unified development experience.

## Decision
We adopt a monorepo architecture using **Turborepo** as the build orchestrator and **pnpm** workspaces for dependency management. The repository is organized into the following top-level packages under `packages/`:

- `shared` — TypeScript types, constants, validators, and permissions (zero runtime dependencies beyond Zod)
- `db` — Supabase client factory and SQL schema
- `agents` — Agent prompt definitions and orchestrator
- `services` — Business logic services (leads, billing, comms, approvals)
- `integrations` — Third-party API wrappers (Mem0, Firecrawl)

## Consequences
- **Positive**: Single source of truth for types; atomic cross-package changes; shared CI pipeline; incremental builds via Turborepo caching.
- **Positive**: pnpm's strict dependency isolation prevents phantom dependency issues.
- **Negative**: Slightly higher initial setup complexity compared to a single-package repo.
- **Negative**: Contributors must understand workspace protocols (`workspace:*` dependencies, hoisted node_modules).
