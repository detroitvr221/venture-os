// ─────────────────────────────────────────────────────────────────────────────
// North Bridge Digital — @venture-os/integrations barrel export
// ─────────────────────────────────────────────────────────────────────────────

export { Mem0Client, Mem0Error, createMem0Client } from './mem0';
export type {
  Mem0Config,
  Mem0Memory,
  SearchMemoriesInput,
  AddMemoryInput,
  UpdateMemoryInput,
  MemoryScope_Filter,
} from './mem0';

export { FirecrawlClient, FirecrawlError, createFirecrawlClient } from './firecrawl';
export type {
  FirecrawlConfig,
  CrawlOptions,
  CrawlResult,
  CrawledPage,
  PageMetadata,
  CrawlError,
  ExtractOptions,
  ExtractResult,
  WebSearchOptions,
  WebSearchResult,
} from './firecrawl';

export { OpenClawClient, OpenClawError, createOpenClawClient } from './openclaw';
export type {
  OpenClawConfig,
  OpenClawMessage,
  OpenClawAgentRunInput,
  OpenClawAgentRunResult,
  OpenClawHealthStatus,
} from './openclaw';

export {
  createApolloClient,
  enrichOrganization,
  bulkEnrichOrganizations,
  searchPeople,
  enrichPerson,
} from './apollo';
export type {
  ApolloClient,
  ApolloOrg,
  ApolloPerson,
} from './apollo';
