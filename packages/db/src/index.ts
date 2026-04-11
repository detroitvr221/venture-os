// ─────────────────────────────────────────────────────────────────────────────
// North Bridge Digital — @venture-os/db  Supabase client factory
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as supabaseCreateClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

export type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Options for creating a Supabase client.
 * If omitted the values are read from environment variables.
 */
export interface CreateClientOptions {
  /** Supabase project URL – defaults to `SUPABASE_URL` env var. */
  url?: string;
  /** Supabase anon or service-role key – defaults to `SUPABASE_SERVICE_ROLE_KEY` env var. */
  key?: string;
  /** Optional custom schema (defaults to "public"). */
  schema?: string;
}

/**
 * Create a typed Supabase client.
 *
 * For server-side usage (edge functions, services) pass the service-role key.
 * For client-side usage pass the anon key and let RLS do the heavy lifting.
 */
export function createClient(options: CreateClientOptions = {}): SupabaseClient {
  const url = options.url ?? process.env.SUPABASE_URL;
  const key = options.key ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      'Missing Supabase URL. Set SUPABASE_URL env var or pass `url` to createClient().',
    );
  }
  if (!key) {
    throw new Error(
      'Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY env var or pass `key` to createClient().',
    );
  }

  return supabaseCreateClient(url, key, {
    db: { schema: options.schema ?? 'public' },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Singleton client for convenience.
 * Lazy-initialised on first access so the env vars don't need to be
 * available at module load time.
 */
let _singleton: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!_singleton) {
    _singleton = createClient();
  }
  return _singleton;
}

/**
 * Create a client scoped to a particular user's JWT (for RLS).
 * Useful in API routes where you have the user's access token.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.');
  }

  return supabaseCreateClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
