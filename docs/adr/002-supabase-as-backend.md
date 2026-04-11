# ADR-002: Supabase as Primary Backend

## Status
Accepted

## Context
North Bridge Digital needs a scalable backend with PostgreSQL, authentication, real-time subscriptions, file storage, and edge functions. Building and maintaining a custom backend would significantly delay time-to-market.

## Decision
We use **Supabase** as the primary backend platform, providing:

- **PostgreSQL** with Row Level Security (RLS) for multi-tenant data isolation
- **Auth** for user authentication and JWT-based authorization
- **Realtime** for live updates on data changes
- **Edge Functions** for serverless compute
- **Storage** for file uploads

The database schema is maintained in `packages/db/src/schema.sql` and deployed via Supabase migrations. The service-role key is used server-side to bypass RLS when needed; the anon key is used client-side with RLS enforcement.

## Consequences
- **Positive**: Rapid development with managed infrastructure; built-in auth and real-time; PostgreSQL gives us pgvector for embeddings.
- **Positive**: RLS provides row-level multi-tenancy without application-layer filtering.
- **Negative**: Vendor coupling to Supabase's hosted offering (mitigated by using standard PostgreSQL and open-source Supabase).
- **Negative**: Complex RLS policies can be difficult to debug and may impact query performance.
