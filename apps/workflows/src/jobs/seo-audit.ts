// ─────────────────────────────────────────────────────────────────────────────
// North Bridge Digital — SEO Audit Workflow
// Crawls a website, analyzes SEO factors, and stores findings in Supabase.
// ─────────────────────────────────────────────────────────────────────────────

import { task, logger } from '@trigger.dev/sdk/v3';
import { z } from 'zod';
import { createClient } from '@venture-os/db';
import { createFirecrawlClient } from '@venture-os/integrations';
import type { SeoSeverity } from '@venture-os/shared';
import type { CrawledPage } from '@venture-os/integrations';

// ─── Input Schema ───────────────────────────────────────────────────────────

const SeoAuditPayload = z.object({
  website_url: z.string().url(),
  client_id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  company_id: z.string().uuid().optional(),
  website_id: z.string().uuid().optional(),
  max_pages: z.number().int().min(1).max(500).default(50),
});

type SeoAuditPayload = z.infer<typeof SeoAuditPayload>;

// ─── Finding Interfaces ─────────────────────────────────────────────────────

interface SeoFindingInput {
  url: string;
  category: string;
  severity: SeoSeverity;
  title: string;
  description: string;
  recommendation: string | null;
}

// ─── Analysis Functions ─────────────────────────────────────────────────────

function analyzeMetaTags(page: CrawledPage): SeoFindingInput[] {
  const findings: SeoFindingInput[] = [];

  // Title check
  if (!page.title || page.title.trim().length === 0) {
    findings.push({
      url: page.url,
      category: 'meta_tags',
      severity: 'critical',
      title: 'Missing page title',
      description: 'This page has no title tag. Search engines rely heavily on title tags for ranking.',
      recommendation: 'Add a descriptive title tag between 30-60 characters.',
    });
  } else if (page.title.length > 60) {
    findings.push({
      url: page.url,
      category: 'meta_tags',
      severity: 'warning',
      title: 'Title tag too long',
      description: `Title is ${page.title.length} characters. Search engines typically display 50-60 characters.`,
      recommendation: 'Shorten the title tag to under 60 characters.',
    });
  } else if (page.title.length < 30) {
    findings.push({
      url: page.url,
      category: 'meta_tags',
      severity: 'info',
      title: 'Title tag may be too short',
      description: `Title is only ${page.title.length} characters. Consider using more descriptive text.`,
      recommendation: 'Expand the title tag to 30-60 characters for better visibility.',
    });
  } else {
    findings.push({
      url: page.url,
      category: 'meta_tags',
      severity: 'info',
      title: 'Title tag present and well-sized',
      description: `Title is ${page.title.length} characters, within the optimal 30-60 range.`,
      recommendation: null,
    });
  }

  // Description check
  if (!page.description || page.description.trim().length === 0) {
    findings.push({
      url: page.url,
      category: 'meta_tags',
      severity: 'critical',
      title: 'Missing meta description',
      description: 'No meta description found. This impacts click-through rates from search results.',
      recommendation: 'Add a compelling meta description between 120-160 characters.',
    });
  } else if (page.description.length > 160) {
    findings.push({
      url: page.url,
      category: 'meta_tags',
      severity: 'warning',
      title: 'Meta description too long',
      description: `Description is ${page.description.length} characters and may be truncated in search results.`,
      recommendation: 'Shorten the meta description to 120-160 characters.',
    });
  }

  // Open Graph checks
  if (!page.metadata.og_title) {
    findings.push({
      url: page.url,
      category: 'social',
      severity: 'warning',
      title: 'Missing Open Graph title',
      description: 'No og:title tag found. Social media shares may not display correctly.',
      recommendation: 'Add og:title, og:description, and og:image meta tags.',
    });
  }

  // Canonical URL
  if (!page.metadata.canonical_url) {
    findings.push({
      url: page.url,
      category: 'technical',
      severity: 'warning',
      title: 'Missing canonical URL',
      description: 'No canonical tag found. This can lead to duplicate content issues.',
      recommendation: 'Add a rel="canonical" link to prevent duplicate content.',
    });
  }

  return findings;
}

function analyzeHeadings(page: CrawledPage): SeoFindingInput[] {
  const findings: SeoFindingInput[] = [];
  const content = page.content;

  // Check for H1 in markdown content (# heading)
  const h1Matches = content.match(/^# [^\n]+/gm);

  if (!h1Matches || h1Matches.length === 0) {
    findings.push({
      url: page.url,
      category: 'headings',
      severity: 'critical',
      title: 'Missing H1 heading',
      description: 'No H1 heading found on the page. Each page should have exactly one H1.',
      recommendation: 'Add a single, descriptive H1 heading that includes target keywords.',
    });
  } else if (h1Matches.length > 1) {
    findings.push({
      url: page.url,
      category: 'headings',
      severity: 'warning',
      title: 'Multiple H1 headings',
      description: `Found ${h1Matches.length} H1 headings. Each page should have exactly one H1.`,
      recommendation: 'Reduce to a single H1 heading and use H2/H3 for subsections.',
    });
  }

  // Check heading hierarchy
  const h2Matches = content.match(/^## [^\n]+/gm);
  if (!h2Matches || h2Matches.length === 0) {
    findings.push({
      url: page.url,
      category: 'headings',
      severity: 'info',
      title: 'No H2 headings found',
      description: 'Consider adding H2 subheadings to structure your content better.',
      recommendation: 'Use H2 headings to break content into logical sections.',
    });
  }

  return findings;
}

function analyzeContent(page: CrawledPage): SeoFindingInput[] {
  const findings: SeoFindingInput[] = [];
  const wordCount = page.content.split(/\s+/).filter(Boolean).length;

  if (wordCount < 300) {
    findings.push({
      url: page.url,
      category: 'content',
      severity: 'warning',
      title: 'Thin content detected',
      description: `Page has only ${wordCount} words. Pages with less than 300 words may struggle to rank.`,
      recommendation: 'Expand content to at least 300 words with valuable information.',
    });
  }

  // Check for image alt text issues (markdown images without alt text)
  const imagesWithoutAlt = page.content.match(/!\[\]\(/g);
  if (imagesWithoutAlt && imagesWithoutAlt.length > 0) {
    findings.push({
      url: page.url,
      category: 'accessibility',
      severity: 'warning',
      title: 'Images missing alt text',
      description: `Found ${imagesWithoutAlt.length} image(s) without alt text. This hurts SEO and accessibility.`,
      recommendation: 'Add descriptive alt text to all images.',
    });
  }

  return findings;
}

function analyzeLinks(page: CrawledPage, baseUrl: string): SeoFindingInput[] {
  const findings: SeoFindingInput[] = [];
  const internalLinks = page.links.filter((link) => {
    try {
      const url = new URL(link, baseUrl);
      const base = new URL(baseUrl);
      return url.hostname === base.hostname;
    } catch {
      return false;
    }
  });

  if (internalLinks.length === 0) {
    findings.push({
      url: page.url,
      category: 'links',
      severity: 'warning',
      title: 'No internal links found',
      description: 'This page has no internal links to other pages on the site.',
      recommendation: 'Add relevant internal links to improve site navigation and SEO.',
    });
  }

  return findings;
}

function analyzePageSpeed(page: CrawledPage): SeoFindingInput[] {
  const findings: SeoFindingInput[] = [];

  // Check for large page content (proxy for page speed)
  if (page.html && page.html.length > 500000) {
    findings.push({
      url: page.url,
      category: 'performance',
      severity: 'warning',
      title: 'Large page size detected',
      description: `Page HTML is ${Math.round(page.html.length / 1024)}KB. Large pages load slower and rank lower.`,
      recommendation: 'Optimize page size by minifying HTML, compressing images, and removing unused code.',
    });
  }

  return findings;
}

// ─── Summary Generator ──────────────────────────────────────────────────────

function generateSummary(
  totalPages: number,
  findings: SeoFindingInput[],
): string {
  const critical = findings.filter((f) => f.severity === 'critical').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;
  const info = findings.filter((f) => f.severity === 'info').length;

  const categories = [...new Set(findings.map((f) => f.category))];

  let summary = `SEO Audit Report\n`;
  summary += `================\n\n`;
  summary += `Pages Analyzed: ${totalPages}\n`;
  summary += `Total Findings: ${findings.length}\n`;
  summary += `- Critical: ${critical}\n`;
  summary += `- Warnings: ${warnings}\n`;
  summary += `- Info: ${info}\n\n`;
  summary += `Categories Analyzed: ${categories.join(', ')}\n\n`;

  if (critical > 0) {
    summary += `CRITICAL ISSUES\n`;
    summary += `---------------\n`;
    findings
      .filter((f) => f.severity === 'critical')
      .forEach((f) => {
        summary += `- [${f.url}] ${f.title}: ${f.description}\n`;
        if (f.recommendation) summary += `  Fix: ${f.recommendation}\n`;
      });
    summary += `\n`;
  }

  if (warnings > 0) {
    summary += `WARNINGS\n`;
    summary += `--------\n`;
    findings
      .filter((f) => f.severity === 'warning')
      .slice(0, 20) // limit for readability
      .forEach((f) => {
        summary += `- [${f.url}] ${f.title}: ${f.description}\n`;
        if (f.recommendation) summary += `  Fix: ${f.recommendation}\n`;
      });
  }

  return summary;
}

// ─── Score Calculation ──────────────────────────────────────────────────────

function calculateScore(findings: SeoFindingInput[], pageCount: number): number {
  if (pageCount === 0) return 0;

  const criticalPenalty = findings.filter((f) => f.severity === 'critical').length * 10;
  const warningPenalty = findings.filter((f) => f.severity === 'warning').length * 3;

  const raw = 100 - criticalPenalty - warningPenalty;
  return Math.max(0, Math.min(100, raw));
}

// ─── Main Task ──────────────────────────────────────────────────────────────

export const seoAuditTask = task({
  id: 'seo-audit',
  maxDuration: 300,
  retry: { maxAttempts: 2 },
  run: async (payload: SeoAuditPayload) => {
    const validated = SeoAuditPayload.parse(payload);
    const db = createClient();
    const firecrawl = createFirecrawlClient();

    logger.info('Starting SEO audit', { url: validated.website_url, max_pages: validated.max_pages });

    // 1. Crawl the site
    const crawlResult = await firecrawl.crawl(validated.website_url, {
      maxPages: validated.max_pages,
      sameDomainOnly: true,
    });

    if (crawlResult.status === 'failed') {
      throw new Error(`Crawl failed for ${validated.website_url}`);
    }

    logger.info('Crawl complete', {
      pages_crawled: crawlResult.pages_crawled,
      errors: crawlResult.errors.length,
    });

    // 2. Analyze each page
    const allFindings: SeoFindingInput[] = [];

    for (const page of crawlResult.pages) {
      allFindings.push(...analyzeMetaTags(page));
      allFindings.push(...analyzeHeadings(page));
      allFindings.push(...analyzeContent(page));
      allFindings.push(...analyzeLinks(page, validated.website_url));
      allFindings.push(...analyzePageSpeed(page));
    }

    logger.info('Analysis complete', { total_findings: allFindings.length });

    // 3. Calculate overall score
    const score = calculateScore(allFindings, crawlResult.pages_crawled);

    // 4. Determine or create website_id
    let websiteId = validated.website_id;
    if (!websiteId) {
      const { data: existingWebsite } = await db
        .from('websites')
        .select('id')
        .eq('organization_id', validated.organization_id)
        .eq('url', validated.website_url)
        .single();

      if (existingWebsite) {
        websiteId = existingWebsite.id;
      } else if (validated.company_id) {
        const { data: newWebsite, error: wsError } = await db
          .from('websites')
          .insert({
            organization_id: validated.organization_id,
            company_id: validated.company_id,
            url: validated.website_url,
            name: new URL(validated.website_url).hostname,
            last_crawled_at: new Date().toISOString(),
            health_score: score,
            metadata: {},
          })
          .select('id')
          .single();

        if (wsError) {
          logger.error('Failed to create website record', { error: wsError.message });
        } else {
          websiteId = newWebsite?.id;
        }
      }
    }

    // Update last_crawled_at on existing website
    if (websiteId) {
      await db
        .from('websites')
        .update({
          last_crawled_at: new Date().toISOString(),
          health_score: score,
        })
        .eq('id', websiteId)
        .eq('organization_id', validated.organization_id);
    }

    // 5. Create website_audit record
    const { data: audit, error: auditError } = await db
      .from('website_audits')
      .insert({
        organization_id: validated.organization_id,
        website_id: websiteId ?? null,
        audit_type: 'seo',
        score,
        findings_count: allFindings.length,
        raw_data: {
          pages_crawled: crawlResult.pages_crawled,
          crawl_errors: crawlResult.errors,
          severity_breakdown: {
            critical: allFindings.filter((f) => f.severity === 'critical').length,
            warning: allFindings.filter((f) => f.severity === 'warning').length,
            info: allFindings.filter((f) => f.severity === 'info').length,
          },
        },
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (auditError) {
      throw new Error(`Failed to create audit record: ${auditError.message}`);
    }

    const auditId = audit!.id;
    logger.info('Audit record created', { audit_id: auditId, score });

    // 6. Insert seo_findings in batches
    const findingRecords = allFindings.map((f) => ({
      organization_id: validated.organization_id,
      audit_id: auditId,
      url: f.url,
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      resolved: false,
    }));

    // Insert in batches of 50
    for (let i = 0; i < findingRecords.length; i += 50) {
      const batch = findingRecords.slice(i, i + 50);
      const { error: findingsError } = await db.from('seo_findings').insert(batch);
      if (findingsError) {
        logger.error('Failed to insert findings batch', { error: findingsError.message, batch_start: i });
      }
    }

    // 7. Generate and store summary report
    const summaryText = generateSummary(crawlResult.pages_crawled, allFindings);

    await db.from('documents').insert({
      organization_id: validated.organization_id,
      title: `SEO Audit Report — ${new URL(validated.website_url).hostname} — ${new Date().toISOString().split('T')[0]}`,
      content: summaryText,
      document_type: 'seo_report',
      metadata: {
        audit_id: auditId,
        website_url: validated.website_url,
        score,
        pages_crawled: crawlResult.pages_crawled,
        findings_count: allFindings.length,
      },
    });

    // 8. Audit log
    await db.from('audit_logs').insert({
      organization_id: validated.organization_id,
      actor_type: 'system',
      actor_id: 'seo-audit-workflow',
      action: 'create',
      resource_type: 'website_audit',
      resource_id: auditId,
      changes: {
        website_url: validated.website_url,
        pages_crawled: crawlResult.pages_crawled,
        score,
        findings_count: allFindings.length,
      },
    });

    logger.info('SEO audit workflow complete', {
      audit_id: auditId,
      score,
      pages_crawled: crawlResult.pages_crawled,
      findings: allFindings.length,
    });

    return {
      audit_id: auditId,
      website_url: validated.website_url,
      score,
      pages_crawled: crawlResult.pages_crawled,
      findings_count: allFindings.length,
      severity_breakdown: {
        critical: allFindings.filter((f) => f.severity === 'critical').length,
        warning: allFindings.filter((f) => f.severity === 'warning').length,
        info: allFindings.filter((f) => f.severity === 'info').length,
      },
    };
  },
});
