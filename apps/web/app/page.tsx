import type { Metadata } from "next";
import { LandingClient } from "./LandingClient";

// ─── SEO Metadata ──────────────────────────────────────────────────────────

const SITE_URL = "https://www.thenorthbridgemi.com";
const SITE_NAME = "Northbridge Digital";
const TITLE = "Northbridge Digital — Build. Launch. Grow. | Michigan Digital Agency";
const DESCRIPTION =
  "Northbridge Digital helps businesses build, launch, and grow online through websites, SEO, social media, and modern digital systems. Real people. Real execution. Real results. Packages from $199/mo.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "digital agency Michigan",
    "website design Michigan",
    "SEO services",
    "social media management",
    "web development",
    "digital marketing",
    "small business website",
    "lead generation",
    "content marketing",
    "brand strategy",
    "Northbridge Digital",
    "Michigan web agency",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Northbridge Digital — Build. Launch. Grow.",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
    creator: "@NorthbridgeDigi",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

// ─── JSON-LD Structured Data ───────────────────────────────────────────────

function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: DESCRIPTION,
    foundingDate: "2025",
    areaServed: {
      "@type": "State",
      name: "Michigan",
    },
    address: {
      "@type": "PostalAddress",
      addressRegion: "MI",
      addressCountry: "US",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "hello@thenorthbridgemi.org",
      url: `${SITE_URL}/book`,
    },
    sameAs: [],
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Human-led digital growth company offering website design, SEO, social media management, content marketing, and digital systems for businesses.",
    image: `${SITE_URL}/og-image.png`,
    priceRange: "$199 - $699/mo",
    areaServed: {
      "@type": "State",
      name: "Michigan",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Digital Services",
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Build Track",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Launch",
                description: "Custom landing page, mobile-first build, contact form, Google Analytics, SSL + hosting",
              },
              price: "199",
              priceCurrency: "USD",
              priceSpecification: { "@type": "UnitPriceSpecification", unitText: "MONTH" },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Build",
                description: "Up to 10-page custom website, lead funnels, CRM integration, blog, speed optimization",
              },
              price: "399",
              priceCurrency: "USD",
              priceSpecification: { "@type": "UnitPriceSpecification", unitText: "MONTH" },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Platform",
                description: "Unlimited pages, custom dashboard, e-commerce, A/B testing, API integrations",
              },
              price: "699",
              priceCurrency: "USD",
              priceSpecification: { "@type": "UnitPriceSpecification", unitText: "MONTH" },
            },
          ],
        },
        {
          "@type": "OfferCatalog",
          name: "Growth Track",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Visibility",
                description: "Technical SEO audit, Google Business Profile, on-page SEO, keyword tracking",
              },
              price: "199",
              priceCurrency: "USD",
              priceSpecification: { "@type": "UnitPriceSpecification", unitText: "MONTH" },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Growth",
                description: "SEO + content + social media management on 3 platforms, competitor analysis",
              },
              price: "399",
              priceCurrency: "USD",
              priceSpecification: { "@type": "UnitPriceSpecification", unitText: "MONTH" },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Momentum",
                description: "Full-stack growth with paid ads, landing pages, email automation, dedicated strategist",
              },
              price: "699",
              priceCurrency: "USD",
              priceSpecification: { "@type": "UnitPriceSpecification", unitText: "MONTH" },
            },
          ],
        },
      ],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What do you actually do?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We help businesses build websites, improve their online visibility, and grow through SEO, social media, and digital systems. Think of us as your digital growth team, without the overhead of hiring in-house.",
        },
      },
      {
        "@type": "Question",
        name: "How is this different from other agencies?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most agencies sell projects. We sell partnerships. You get ongoing monthly support, real execution, and a team invested in your growth, not just a one-time deliverable.",
        },
      },
      {
        "@type": "Question",
        name: "What's included in the monthly price?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Everything in your selected package. No surprise fees, no hourly billing. You pick a track (Build or Growth), choose a tier, and we get to work.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need both Build and Growth?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Not necessarily. Many clients start with one track and add the other as they grow. We'll recommend what makes sense for your stage.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a contract?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, all packages include a 12-month commitment. This allows us to plan long-term strategy and deliver compounding results.",
        },
      },
    ],
  };

  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    about: {
      "@type": "Thing",
      name: "Digital Marketing Services",
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageSchema) }}
      />
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function Page() {
  return (
    <>
      <JsonLd />
      <LandingClient />
    </>
  );
}
