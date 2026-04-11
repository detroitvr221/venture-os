// ─────────────────────────────────────────────────────────────────────────────
// North Bridge Digital — Firecrawl Integration
// Web crawling, content extraction, and search
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FirecrawlConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface CrawlOptions {
  /** Maximum number of pages to crawl (default: 50, max: 500). */
  maxPages?: number;
  /** Follow links within the same domain only (default: true). */
  sameDomainOnly?: boolean;
  /** CSS selectors to exclude from extraction. */
  excludeSelectors?: string[];
  /** Only include pages matching these URL patterns. */
  includePatterns?: string[];
  /** Skip pages matching these URL patterns. */
  excludePatterns?: string[];
  /** Wait time between requests in ms (default: 1000). */
  delay?: number;
  /** Timeout per page in ms (default: 30000). */
  timeout?: number;
}

export interface CrawlResult {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  pages_crawled: number;
  pages: CrawledPage[];
  errors: CrawlError[];
}

export interface CrawledPage {
  url: string;
  title: string;
  description: string | null;
  content: string; // Markdown content
  html: string | null;
  status_code: number;
  headers: Record<string, string>;
  links: string[];
  metadata: PageMetadata;
  crawled_at: string;
}

export interface PageMetadata {
  og_title?: string;
  og_description?: string;
  og_image?: string;
  canonical_url?: string;
  robots?: string;
  language?: string;
  author?: string;
  published_date?: string;
  structured_data?: Record<string, unknown>[];
}

export interface CrawlError {
  url: string;
  error: string;
  status_code: number | null;
}

export interface ExtractOptions {
  /** CSS selectors to target specific content. */
  selectors?: string[];
  /** Extract only the main content (removes nav, footer, etc). */
  mainContentOnly?: boolean;
  /** Output format. */
  format?: 'markdown' | 'text' | 'html';
  /** Include metadata in the response. */
  includeMetadata?: boolean;
}

export interface ExtractResult {
  url: string;
  title: string;
  content: string;
  metadata: PageMetadata;
  extracted_at: string;
}

export interface WebSearchOptions {
  /** Number of results (default: 10, max: 50). */
  limit?: number;
  /** Country code for localized results. */
  country?: string;
  /** Language code. */
  language?: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  description: string;
  content: string | null;
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class FirecrawlClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: FirecrawlConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.firecrawl.dev';
  }

  /**
   * Crawl a website starting from the given URL.
   * Respects robots.txt and rate limits.
   */
  async crawl(url: string, options?: CrawlOptions): Promise<CrawlResult> {
    const maxPages = Math.min(options?.maxPages ?? 50, 500);

    const body = {
      url,
      limit: maxPages,
      scrapeOptions: {
        formats: ['markdown'],
        excludeTags: options?.excludeSelectors,
        onlyMainContent: true,
        waitFor: options?.delay ?? 1000,
        timeout: options?.timeout ?? 30000,
      },
      includePaths: options?.includePatterns,
      excludePaths: options?.excludePatterns,
    };

    // Start the crawl job
    const startResponse = await this.request('POST', '/v1/crawl', body);
    const jobId = startResponse.id as string;

    // Poll for completion
    return this.pollCrawlJob(jobId);
  }

  /**
   * Extract content from a single URL.
   */
  async extract(url: string, options?: ExtractOptions): Promise<ExtractResult> {
    const body = {
      url,
      formats: [options?.format ?? 'markdown'],
      onlyMainContent: options?.mainContentOnly ?? true,
      includeTags: options?.selectors,
    };

    const response = await this.request('POST', '/v1/scrape', body);

    const data = response.data as Record<string, unknown>;
    return {
      url,
      title: (data['metadata'] as Record<string, string>)?.['title'] ?? '',
      content: (data['markdown'] as string) ?? (data['text'] as string) ?? '',
      metadata: this.extractMetadata(data['metadata'] as Record<string, unknown>),
      extracted_at: new Date().toISOString(),
    };
  }

  /**
   * Search the web and optionally extract content from results.
   */
  async search(query: string, options?: WebSearchOptions): Promise<WebSearchResult[]> {
    const body = {
      query,
      limit: Math.min(options?.limit ?? 10, 50),
      lang: options?.language ?? 'en',
      country: options?.country ?? 'us',
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    };

    const response = await this.request('POST', '/v1/search', body);
    const results = response.data as Array<Record<string, unknown>>;

    return results.map((result) => ({
      title: (result['metadata'] as Record<string, string>)?.['title'] ?? '',
      url: result['url'] as string,
      description: (result['metadata'] as Record<string, string>)?.['description'] ?? '',
      content: (result['markdown'] as string) ?? null,
    }));
  }

  /**
   * Get the status of a running crawl job.
   */
  async getCrawlStatus(jobId: string): Promise<CrawlResult> {
    const response = await this.request('GET', `/v1/crawl/${jobId}`);
    return this.parseCrawlResponse(jobId, response);
  }

  /**
   * Cancel a running crawl job.
   */
  async cancelCrawl(jobId: string): Promise<void> {
    await this.request('DELETE', `/v1/crawl/${jobId}`);
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  /**
   * Poll a crawl job until it completes (or fails).
   */
  private async pollCrawlJob(
    jobId: string,
    maxWaitMs: number = 300_000,
    intervalMs: number = 5_000,
  ): Promise<CrawlResult> {
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      const result = await this.getCrawlStatus(jobId);

      if (result.status === 'completed' || result.status === 'failed') {
        return result;
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new FirecrawlError(
      `Crawl job ${jobId} timed out after ${maxWaitMs / 1000}s`,
      408,
    );
  }

  /**
   * Parse the raw API response into a typed CrawlResult.
   */
  private parseCrawlResponse(
    jobId: string,
    response: Record<string, unknown>,
  ): CrawlResult {
    const status = response['status'] as string;
    const data = (response['data'] ?? []) as Array<Record<string, unknown>>;

    const pages: CrawledPage[] = data.map((page) => {
      const metadata = (page['metadata'] ?? {}) as Record<string, unknown>;
      return {
        url: page['url'] as string ?? '',
        title: (metadata['title'] as string) ?? '',
        description: (metadata['description'] as string) ?? null,
        content: (page['markdown'] as string) ?? '',
        html: (page['html'] as string) ?? null,
        status_code: (metadata['statusCode'] as number) ?? 200,
        headers: {},
        links: (page['links'] as string[]) ?? [],
        metadata: this.extractMetadata(metadata),
        crawled_at: new Date().toISOString(),
      };
    });

    return {
      job_id: jobId,
      status: this.normalizeStatus(status),
      pages_crawled: pages.length,
      pages,
      errors: [],
    };
  }

  private normalizeStatus(status: string): CrawlResult['status'] {
    switch (status) {
      case 'completed':
        return 'completed';
      case 'scraping':
      case 'running':
        return 'running';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private extractMetadata(raw: Record<string, unknown> | undefined): PageMetadata {
    if (!raw) return {};
    return {
      og_title: raw['ogTitle'] as string | undefined,
      og_description: raw['ogDescription'] as string | undefined,
      og_image: raw['ogImage'] as string | undefined,
      canonical_url: raw['canonicalUrl'] as string | undefined,
      robots: raw['robots'] as string | undefined,
      language: raw['language'] as string | undefined,
      author: raw['author'] as string | undefined,
      published_date: raw['publishedDate'] as string | undefined,
      structured_data: raw['structuredData'] as Record<string, unknown>[] | undefined,
    };
  }

  /**
   * Make an authenticated request to the Firecrawl API.
   */
  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${path}`;

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
      throw new FirecrawlError(
        `Firecrawl API error: ${response.status} ${response.statusText} — ${errorBody}`,
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

export class FirecrawlError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'FirecrawlError';
    this.status = status;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createFirecrawlClient(config?: Partial<FirecrawlConfig>): FirecrawlClient {
  const apiKey = config?.apiKey ?? process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing Firecrawl API key. Set FIRECRAWL_API_KEY env var or pass apiKey to createFirecrawlClient().',
    );
  }

  return new FirecrawlClient({
    apiKey,
    baseUrl: config?.baseUrl,
  });
}
