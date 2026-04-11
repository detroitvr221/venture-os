// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Mem0 Integration
// Memory management client scoped by organization, company, and client
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoryScope } from '@venture-os/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Mem0Config {
  apiKey: string;
  baseUrl?: string;
  /** Default: 'v1' */
  apiVersion?: string;
}

export interface Mem0Memory {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  score?: number;
}

export interface SearchMemoriesInput {
  query: string;
  /** Number of results to return (default: 10). */
  limit?: number;
  /** Minimum similarity score (0-1, default: 0.7). */
  threshold?: number;
  /** Filter by metadata fields. */
  filters?: Record<string, unknown>;
}

export interface AddMemoryInput {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMemoryInput {
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryScope_Filter {
  organization_id: string;
  scope: MemoryScope;
  scope_id: string;
  company_id?: string;
  client_id?: string;
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class Mem0Client {
  private apiKey: string;
  private baseUrl: string;
  private apiVersion: string;

  constructor(config: Mem0Config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.mem0.ai';
    this.apiVersion = config.apiVersion ?? 'v1';
  }

  /**
   * Search memories by semantic similarity within a given scope.
   */
  async search(
    scope: MemoryScope_Filter,
    input: SearchMemoriesInput,
  ): Promise<Mem0Memory[]> {
    const body = {
      query: input.query,
      limit: input.limit ?? 10,
      threshold: input.threshold ?? 0.7,
      filters: {
        ...input.filters,
        ...this.scopeToFilters(scope),
      },
    };

    const response = await this.request('POST', '/memories/search', body);
    return response.results as Mem0Memory[];
  }

  /**
   * Add a new memory to the specified scope.
   */
  async add(
    scope: MemoryScope_Filter,
    input: AddMemoryInput,
  ): Promise<Mem0Memory> {
    const body = {
      content: input.content,
      metadata: {
        ...input.metadata,
        ...this.scopeToFilters(scope),
      },
    };

    const response = await this.request('POST', '/memories', body);
    return response as Mem0Memory;
  }

  /**
   * List all memories in a given scope.
   */
  async list(
    scope: MemoryScope_Filter,
    options?: { page?: number; page_size?: number },
  ): Promise<{ memories: Mem0Memory[]; total: number }> {
    const params = new URLSearchParams();
    params.set('page', String(options?.page ?? 1));
    params.set('page_size', String(options?.page_size ?? 25));

    // Add scope filters as query params
    const filters = this.scopeToFilters(scope);
    for (const [key, value] of Object.entries(filters)) {
      params.set(`filter_${key}`, String(value));
    }

    const response = await this.request('GET', `/memories?${params.toString()}`);
    return {
      memories: response.results as Mem0Memory[],
      total: response.total as number,
    };
  }

  /**
   * Update an existing memory.
   */
  async update(memoryId: string, input: UpdateMemoryInput): Promise<Mem0Memory> {
    const body: Record<string, unknown> = {};
    if (input.content !== undefined) body['content'] = input.content;
    if (input.metadata !== undefined) body['metadata'] = input.metadata;

    const response = await this.request('PUT', `/memories/${memoryId}`, body);
    return response as Mem0Memory;
  }

  /**
   * Delete a memory by ID.
   */
  async delete(memoryId: string): Promise<void> {
    await this.request('DELETE', `/memories/${memoryId}`);
  }

  /**
   * Get a single memory by ID.
   */
  async get(memoryId: string): Promise<Mem0Memory | null> {
    try {
      const response = await this.request('GET', `/memories/${memoryId}`);
      return response as Mem0Memory;
    } catch (err) {
      if (err instanceof Mem0Error && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Delete all memories within a scope.
   * Use with caution — this is irreversible.
   */
  async deleteAllInScope(scope: MemoryScope_Filter): Promise<number> {
    const filters = this.scopeToFilters(scope);
    const response = await this.request('DELETE', '/memories', { filters });
    return response.deleted_count as number;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  /**
   * Convert a VentureOS memory scope into Mem0 filter parameters.
   */
  private scopeToFilters(scope: MemoryScope_Filter): Record<string, string> {
    const filters: Record<string, string> = {
      organization_id: scope.organization_id,
      scope: scope.scope,
      scope_id: scope.scope_id,
    };

    if (scope.company_id) {
      filters['company_id'] = scope.company_id;
    }
    if (scope.client_id) {
      filters['client_id'] = scope.client_id;
    }

    return filters;
  }

  /**
   * Make an authenticated request to the Mem0 API.
   */
  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}/${this.apiVersion}${path}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const init: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Mem0Error(
        `Mem0 API error: ${response.status} ${response.statusText} — ${errorBody}`,
        response.status,
      );
    }

    if (response.status === 204) {
      return {};
    }

    return response.json() as Promise<Record<string, unknown>>;
  }
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export class Mem0Error extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'Mem0Error';
    this.status = status;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createMem0Client(config?: Partial<Mem0Config>): Mem0Client {
  const apiKey = config?.apiKey ?? process.env.MEM0_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Mem0 API key. Set MEM0_API_KEY env var or pass apiKey to createMem0Client().');
  }

  return new Mem0Client({
    apiKey,
    baseUrl: config?.baseUrl,
    apiVersion: config?.apiVersion,
  });
}
