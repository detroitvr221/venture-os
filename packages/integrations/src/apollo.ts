// ═══════════════════════════════════════════════════════════════════════════
// North Bridge Digital — Apollo.io Integration
// Company enrichment, lead research, and prospect intelligence
// ═══════════════════════════════════════════════════════════════════════════

const APOLLO_BASE = "https://api.apollo.io/api/v1";

export interface ApolloOrg {
  id: string;
  name: string;
  website_url: string | null;
  industry: string | null;
  estimated_num_employees: number | null;
  annual_revenue: number | null;
  founded_year: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  short_description: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  phone: string | null;
  keywords: string[];
  technologies: string[];
}

export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  organization: ApolloOrg | null;
}

export interface ApolloClient {
  apiKey: string;
}

/**
 * Create an Apollo.io client
 */
export function createApolloClient(apiKey?: string): ApolloClient {
  const key = apiKey || process.env.APOLLO_API_KEY;
  if (!key) throw new Error("Apollo API key is required");
  return { apiKey: key };
}

/**
 * Enrich a company by domain
 * Available on free plan
 */
export async function enrichOrganization(
  client: ApolloClient,
  domain: string
): Promise<ApolloOrg | null> {
  const response = await fetch(
    `${APOLLO_BASE}/organizations/enrich?domain=${encodeURIComponent(domain)}`,
    {
      headers: { "X-Api-Key": client.apiKey },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Apollo org enrichment failed: ${response.status} ${(error as Record<string, string>).error || ""}`
    );
  }

  const data = await response.json();
  return (data as { organization: ApolloOrg | null }).organization;
}

/**
 * Bulk enrich organizations by domain
 * Available on free plan
 */
export async function bulkEnrichOrganizations(
  client: ApolloClient,
  domains: string[]
): Promise<ApolloOrg[]> {
  const response = await fetch(`${APOLLO_BASE}/organizations/bulk_enrich`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": client.apiKey,
    },
    body: JSON.stringify({ domains }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Apollo bulk enrichment failed: ${response.status} ${(error as Record<string, string>).error || ""}`
    );
  }

  const data = await response.json();
  return (data as { organizations: ApolloOrg[] }).organizations || [];
}

/**
 * Search for people (requires paid plan)
 */
export async function searchPeople(
  client: ApolloClient,
  params: {
    person_titles?: string[];
    person_locations?: string[];
    organization_domains?: string[];
    per_page?: number;
    page?: number;
  }
): Promise<{ people: ApolloPerson[]; total: number }> {
  const response = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": client.apiKey,
    },
    body: JSON.stringify({
      per_page: params.per_page || 10,
      page: params.page || 1,
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Apollo people search failed: ${response.status} ${(error as Record<string, string>).error || ""}`
    );
  }

  const data = (await response.json()) as {
    people: ApolloPerson[];
    pagination: { total_entries: number };
  };
  return {
    people: data.people || [],
    total: data.pagination?.total_entries || 0,
  };
}

/**
 * Enrich a person by email (requires paid plan)
 */
export async function enrichPerson(
  client: ApolloClient,
  email: string
): Promise<ApolloPerson | null> {
  const response = await fetch(`${APOLLO_BASE}/people/match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": client.apiKey,
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Apollo person enrichment failed: ${response.status} ${(error as Record<string, string>).error || ""}`
    );
  }

  const data = await response.json();
  return (data as { person: ApolloPerson | null }).person;
}
